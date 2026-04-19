import { describe, expect, it } from 'vitest'
import { buildPrompt, createAnthropicApiAdapter } from '../src/index'
import type { TaskContext } from '@designteam/adapter-utils'

function makeCtx(overrides: Partial<TaskContext> = {}): TaskContext {
  const controller = new AbortController()
  return {
    plan: { id: 'plan-test', description: 't', createdAt: '', status: 'planning', tasks: [] },
    task: {
      id: 't1',
      agentRole: 'researcher',
      instruction: 'analyze three competing landing pages',
      blockedByTaskIds: [],
      successCriteria: 'three named competitors',
      why: 'grounds the positioning work',
      status: 'in_progress',
    },
    team: { id: 'team-test', agents: [] } as unknown as TaskContext['team'],
    agent: {
      id: 'agent-test',
      name: 'Scout',
      role: 'researcher',
      personality: { sliders: { 'bold-subtle': 0, 'playful-serious': 0, 'experimental-conventional': 0, 'verbose-concise': 0, 'warm-corporate': 0 } },
    } as unknown as TaskContext['agent'],
    teamMemory: { teamId: 'team-test', entries: [], maxEntries: 200 } as unknown as TaskContext['teamMemory'],
    userProfile: { updatedAt: '' } as unknown as TaskContext['userProfile'],
    runId: 'run-xyz',
    signal: controller.signal,
    ...overrides,
  }
}

/**
 * Minimal Response stand-in for the injected fetchImpl. Keeps the adapter
 * honest about what it reads from an HTTP response without pulling in a
 * real server dep.
 */
function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response
}

describe('anthropic-api adapter', () => {
  it('refuses construction without an API key', () => {
    const previousEnv = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    try {
      expect(() => createAnthropicApiAdapter()).toThrow(/API key/)
    } finally {
      if (previousEnv) process.env.ANTHROPIC_API_KEY = previousEnv
    }
  })

  it('returns done with the text content on a 200 response', async () => {
    const fetchImpl = async () =>
      mockResponse(200, {
        content: [{ type: 'text', text: 'here are three competitors: foo, bar, baz' }],
        usage: { input_tokens: 50, output_tokens: 200 },
      })
    const adapter = createAnthropicApiAdapter({ apiKey: 'test-key', fetchImpl: fetchImpl as typeof fetch })
    const result = await adapter.executeTask(makeCtx())
    expect(result.outcome).toBe('done')
    if (result.outcome === 'done') {
      expect(result.summary).toContain('three competitors')
    }
  })

  it('returns error on a non-2xx response with the body in the message', async () => {
    const fetchImpl = async () => mockResponse(401, 'invalid api key')
    const adapter = createAnthropicApiAdapter({ apiKey: 'wrong', fetchImpl: fetchImpl as typeof fetch })
    const result = await adapter.executeTask(makeCtx())
    expect(result.outcome).toBe('error')
    if (result.outcome === 'error') {
      expect(result.message).toContain('401')
      expect(result.message).toContain('invalid api key')
    }
  })

  it('returns error when response has no text content', async () => {
    const fetchImpl = async () => mockResponse(200, { content: [] })
    const adapter = createAnthropicApiAdapter({ apiKey: 'test-key', fetchImpl: fetchImpl as typeof fetch })
    const result = await adapter.executeTask(makeCtx())
    expect(result.outcome).toBe('error')
    if (result.outcome === 'error') {
      expect(result.message).toMatch(/no text content/)
    }
  })

  it('reports cost from the usage block of the last response', async () => {
    const fetchImpl = async () =>
      mockResponse(200, {
        content: [{ type: 'text', text: 'done' }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      })
    const adapter = createAnthropicApiAdapter({
      apiKey: 'test-key',
      model: 'claude-sonnet-4-6',
      fetchImpl: fetchImpl as typeof fetch,
    })
    const ctx = makeCtx()
    const result = await adapter.executeTask(ctx)
    expect(result.outcome).toBe('done')

    const cost = await adapter.reportCost!(ctx, result)
    expect(cost.model).toBe('anthropic:claude-sonnet-4-6')
    expect(cost.inputTokens).toBe(1000)
    expect(cost.outputTokens).toBe(500)
    // Sonnet 4.6 published at $3 input / $15 output per 1M tokens.
    // 1000 * 300c / 1M = 0.3c, 500 * 1500c / 1M = 0.75c, ceil → 2c
    expect(cost.usdCents).toBe(2)
  })

  it('reports zero cost when executeTask has not run against the context', async () => {
    const adapter = createAnthropicApiAdapter({
      apiKey: 'test-key',
      fetchImpl: (async () => mockResponse(200, {})) as unknown as typeof fetch,
    })
    const cost = await adapter.reportCost!(makeCtx(), { outcome: 'done', summary: '' })
    expect(cost.inputTokens).toBe(0)
    expect(cost.outputTokens).toBe(0)
  })

  it('honors ctx.signal.aborted mid-flight', async () => {
    const controller = new AbortController()
    // Fetch hangs until the caller aborts.
    const fetchImpl = (async (_url: string, init: { signal?: AbortSignal }) => {
      await new Promise((resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const err = new Error('aborted')
          ;(err as Error & { name: string }).name = 'AbortError'
          reject(err)
        })
      })
      throw new Error('unreachable')
    }) as unknown as typeof fetch
    const adapter = createAnthropicApiAdapter({ apiKey: 'test-key', fetchImpl })
    const promise = adapter.executeTask(makeCtx({ signal: controller.signal }))
    setTimeout(() => controller.abort(), 20)
    const result = await promise
    expect(result.outcome).toBe('cancelled')
    if (result.outcome === 'cancelled') {
      expect(result.reason).toBe('signal.aborted')
    }
  })

  it('folds team memory + user profile into the prompt', () => {
    const prompt = buildPrompt(
      makeCtx({
        teamMemory: {
          teamId: 'team-test',
          maxEntries: 200,
          entries: [
            { id: 'm1', category: 'brand', content: 'calm and confident voice', salience: 0.9, source: 'user', createdAt: '', lastRelevantAt: '' },
          ],
        } as unknown as TaskContext['teamMemory'],
        userProfile: { business: 'Acme Design Co', updatedAt: '' } as unknown as TaskContext['userProfile'],
      }),
    )
    expect(prompt).toContain('calm and confident')
    expect(prompt).toContain('Acme Design Co')
    expect(prompt).toContain('Scout')
    expect(prompt).toContain('analyze three competing landing pages')
  })

  it('uses configured id override', () => {
    const adapter = createAnthropicApiAdapter({ apiKey: 'x', id: 'custom:anthropic' })
    expect(adapter.id).toBe('custom:anthropic')
  })
})
