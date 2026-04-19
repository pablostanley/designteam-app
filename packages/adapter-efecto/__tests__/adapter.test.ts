import { describe, expect, it } from 'vitest'
import { createEfectoAdapter } from '../src/index'
import type { TaskContext } from '@designteam/adapter-utils'

function makeCtx(overrides: Partial<TaskContext> = {}): TaskContext {
  const controller = new AbortController()
  return {
    plan: { id: 'plan-eval', description: 't', createdAt: '', status: 'planning', tasks: [] },
    task: {
      id: 't1',
      agentRole: 'art-director',
      instruction: 'design the hero section for the landing page',
      blockedByTaskIds: [],
      successCriteria: 'one hero with headline + subhead + CTA',
      why: 'visual anchor for launch',
      status: 'in_progress',
    },
    team: { id: 'team-eval', agents: [] } as unknown as TaskContext['team'],
    agent: {
      id: 'agent-eval',
      name: 'Ink',
      role: 'art-director',
      personality: { sliders: { 'bold-subtle': 0, 'playful-serious': 0, 'experimental-conventional': 0, 'verbose-concise': 0, 'warm-corporate': 0 } },
    } as unknown as TaskContext['agent'],
    teamMemory: { teamId: 'team-eval', entries: [], maxEntries: 200 } as unknown as TaskContext['teamMemory'],
    userProfile: { updatedAt: '' } as unknown as TaskContext['userProfile'],
    runId: 'run-efecto-1',
    signal: controller.signal,
    ...overrides,
  }
}

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response
}

describe('efecto adapter', () => {
  it('creates a session and returns done with the design URL as artifact', async () => {
    const captured: { url?: string; body?: string; headers?: Record<string, string> } = {}
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured.url = url
      captured.body = typeof init.body === 'string' ? init.body : ''
      captured.headers = init.headers as Record<string, string>
      return mockResponse(201, {
        sessionId: 'sess_abc',
        designUrl: 'https://efecto.app/design?session=sess_abc',
        expiresAt: '2026-04-20T00:00:00Z',
      })
    }) as unknown as typeof fetch

    const adapter = createEfectoAdapter({ fetchImpl, baseUrl: 'https://efecto.test' })
    const result = await adapter.executeTask(makeCtx())

    expect(captured.url).toBe('https://efecto.test/api/v1/design/sessions')
    expect(captured.body).toContain('Ink: t1')
    expect(captured.headers?.['Content-Type']).toBe('application/json')

    expect(result.outcome).toBe('done')
    if (result.outcome === 'done') {
      expect(result.summary).toContain('Session ready')
      expect(result.summary).toContain('https://efecto.app/design?session=sess_abc')
      expect(result.artifacts?.[0]?.uri).toBe('https://efecto.app/design?session=sess_abc')
      expect(result.artifacts?.[1]?.kind).toBe('agent.prompt')
      expect(result.artifacts?.[1]?.content).toContain('Ink')
    }
  })

  it('passes Authorization bearer header when apiKey is configured', async () => {
    const captured: { headers?: Record<string, string> } = {}
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      captured.headers = init.headers as Record<string, string>
      return mockResponse(201, { sessionId: 's', designUrl: 'u', expiresAt: '' })
    }) as unknown as typeof fetch

    const adapter = createEfectoAdapter({ fetchImpl, apiKey: 'secret-token' })
    await adapter.executeTask(makeCtx())
    expect(captured.headers?.['Authorization']).toBe('Bearer secret-token')
  })

  it('strips trailing slashes on baseUrl', async () => {
    const captured: { url?: string } = {}
    const fetchImpl = (async (url: string) => {
      captured.url = url
      return mockResponse(201, { sessionId: 's', designUrl: 'u', expiresAt: '' })
    }) as unknown as typeof fetch

    const adapter = createEfectoAdapter({ fetchImpl, baseUrl: 'https://efecto.test/' })
    await adapter.executeTask(makeCtx())
    expect(captured.url).toBe('https://efecto.test/api/v1/design/sessions')
  })

  it('maps 429 (too many sessions) to blocked outcome, not error', async () => {
    const fetchImpl = (async () => mockResponse(429, 'Too many active sessions')) as unknown as typeof fetch
    const adapter = createEfectoAdapter({ fetchImpl })
    const result = await adapter.executeTask(makeCtx())
    expect(result.outcome).toBe('blocked')
    if (result.outcome === 'blocked') {
      expect(result.blockerReason).toBe('efecto.too_many_sessions')
    }
  })

  it('maps non-2xx other than 429 to error', async () => {
    const fetchImpl = (async () => mockResponse(500, 'boom')) as unknown as typeof fetch
    const adapter = createEfectoAdapter({ fetchImpl })
    const result = await adapter.executeTask(makeCtx())
    expect(result.outcome).toBe('error')
    if (result.outcome === 'error') {
      expect(result.message).toContain('500')
    }
  })

  it('returns error when response lacks sessionId/designUrl', async () => {
    const fetchImpl = (async () => mockResponse(201, { expiresAt: '' })) as unknown as typeof fetch
    const adapter = createEfectoAdapter({ fetchImpl })
    const result = await adapter.executeTask(makeCtx())
    expect(result.outcome).toBe('error')
  })

  it('honors ctx.signal.aborted mid-flight', async () => {
    const controller = new AbortController()
    const fetchImpl = (async (_url: string, init: { signal?: AbortSignal }) => {
      await new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => {
          const err = new Error('aborted')
          ;(err as Error & { name: string }).name = 'AbortError'
          reject(err)
        })
      })
      throw new Error('unreachable')
    }) as unknown as typeof fetch
    const adapter = createEfectoAdapter({ fetchImpl })
    const promise = adapter.executeTask(makeCtx({ signal: controller.signal }))
    setTimeout(() => controller.abort(), 20)
    const result = await promise
    expect(result.outcome).toBe('cancelled')
    if (result.outcome === 'cancelled') {
      expect(result.reason).toBe('signal.aborted')
    }
  })

  it('uses a custom session label when provided', async () => {
    const captured: { body?: string } = {}
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      captured.body = typeof init.body === 'string' ? init.body : ''
      return mockResponse(201, { sessionId: 's', designUrl: 'u', expiresAt: '' })
    }) as unknown as typeof fetch
    const adapter = createEfectoAdapter({
      fetchImpl,
      sessionLabel: (ctx) => `Custom-${ctx.plan.id}`,
    })
    await adapter.executeTask(makeCtx())
    expect(captured.body).toContain('Custom-plan-eval')
  })

  it('honors id override', () => {
    const adapter = createEfectoAdapter({ id: 'custom:efecto', fetchImpl: (async () => mockResponse(201, {})) as typeof fetch })
    expect(adapter.id).toBe('custom:efecto')
  })
})
