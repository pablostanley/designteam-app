import { describe, expect, it } from 'vitest'
import { createLocalScriptAdapter } from '../src/index'
import type { TaskContext } from '@designteam/adapter-utils'

/**
 * Minimal TaskContext stub. Most fields are irrelevant to the local-script
 * adapter (personality engine, memory, etc.) — we just need task/plan/agent
 * shape and a live AbortSignal.
 */
function makeCtx(overrides: Partial<TaskContext> = {}): TaskContext {
  const controller = new AbortController()
  return {
    plan: { id: 'plan-test', description: 't', createdAt: '', status: 'planning', tasks: [] },
    task: {
      id: 't1',
      agentRole: 'researcher',
      instruction: 'do a thing',
      blockedByTaskIds: [],
      successCriteria: '',
      why: '',
      status: 'in_progress',
    },
    team: { id: 'team-test' } as unknown as TaskContext['team'],
    agent: { id: 'agent-test', name: 'Scout', role: 'researcher' } as unknown as TaskContext['agent'],
    teamMemory: { teamId: 'team-test', entries: [], maxEntries: 200 } as unknown as TaskContext['teamMemory'],
    userProfile: { updatedAt: '' } as unknown as TaskContext['userProfile'],
    runId: 'run-xyz',
    signal: controller.signal,
    ...overrides,
  }
}

describe('local-script adapter', () => {
  it('returns done on exit 0', async () => {
    const adapter = createLocalScriptAdapter({ command: 'echo hello' })
    const result = await adapter.executeTask(makeCtx())
    expect(result.outcome).toBe('done')
    if (result.outcome === 'done') {
      expect(result.summary).toContain('hello')
    }
  })

  it('returns error on non-zero exit', async () => {
    const adapter = createLocalScriptAdapter({ command: 'exit 7' })
    const result = await adapter.executeTask(makeCtx())
    expect(result.outcome).toBe('error')
  })

  it('exposes task context as DT_* env vars', async () => {
    // Use printenv so we can read a specific env var. Quoted in the
    // template so shell interpolation doesn't trip on the prefix.
    const adapter = createLocalScriptAdapter({ command: 'printf %s "$DT_TASK_ID"' })
    const result = await adapter.executeTask(makeCtx())
    expect(result.outcome).toBe('done')
    if (result.outcome === 'done') {
      expect(result.summary.trim()).toBe('t1')
    }
  })

  it('honors timeoutMs and reports cancelled', async () => {
    const adapter = createLocalScriptAdapter({
      command: 'sleep 5',
      timeoutMs: 100,
    })
    const result = await adapter.executeTask(makeCtx())
    expect(result.outcome).toBe('cancelled')
    if (result.outcome === 'cancelled') {
      expect(result.reason).toBe('timeout')
    }
  })

  it('honors ctx.signal.aborted', async () => {
    const controller = new AbortController()
    const ctx = makeCtx({ signal: controller.signal })
    const adapter = createLocalScriptAdapter({ command: 'sleep 5' })
    const promise = adapter.executeTask(ctx)
    // Fire the abort shortly after start so the adapter catches it.
    setTimeout(() => controller.abort(), 50)
    const result = await promise
    expect(result.outcome).toBe('cancelled')
    if (result.outcome === 'cancelled') {
      expect(result.reason).toBe('signal.aborted')
    }
  })

  it('rejects construction without a command', () => {
    // @ts-expect-error — verifying runtime guard
    expect(() => createLocalScriptAdapter({})).toThrow(/command/)
    expect(() => createLocalScriptAdapter({ command: '' })).toThrow(/command/)
  })

  it('uses configured id when provided', () => {
    const adapter = createLocalScriptAdapter({ command: 'true', id: 'custom:id' })
    expect(adapter.id).toBe('custom:id')
  })
})
