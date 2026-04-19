import { describe, expect, it } from 'vitest'
import { buildPrompt, createCodexCliAdapter } from '../src/index'
import type { TaskContext } from '@designteam/adapter-utils'

function makeCtx(overrides: Partial<TaskContext> = {}): TaskContext {
  const controller = new AbortController()
  return {
    plan: { id: 'plan-test', description: 't', createdAt: '', status: 'planning', tasks: [] },
    task: {
      id: 't1',
      agentRole: 'engineer',
      instruction: 'refactor the auth middleware',
      blockedByTaskIds: [],
      successCriteria: 'tests stay green',
      why: 'old middleware is flagged',
      status: 'in_progress',
    },
    team: { id: 'team-test', agents: [] } as unknown as TaskContext['team'],
    agent: {
      id: 'agent-test',
      name: 'Forge',
      role: 'engineer',
      personality: { sliders: { 'bold-subtle': 0, 'playful-serious': 0, 'experimental-conventional': 0, 'verbose-concise': 0, 'warm-corporate': 0 } },
    } as unknown as TaskContext['agent'],
    teamMemory: { teamId: 'team-test', entries: [], maxEntries: 200 } as unknown as TaskContext['teamMemory'],
    userProfile: { updatedAt: '' } as unknown as TaskContext['userProfile'],
    runId: 'run-codex-1',
    signal: controller.signal,
    ...overrides,
  }
}

describe('codex-local adapter', () => {
  it('builds the standard agent prompt', () => {
    const prompt = buildPrompt(makeCtx())
    expect(prompt).toContain('Forge')
    expect(prompt).toContain('engineer')
    expect(prompt).toContain('refactor the auth middleware')
    expect(prompt).toContain('tests stay green')
  })

  it('returns done when the subprocess exits 0', async () => {
    // `echo` ignores `exec <prompt>` positional args and echoes them; proves
    // the adapter maps exit 0 → done and captures stdout. No real codex
    // binary needed in CI.
    const adapter = createCodexCliAdapter({ codexPath: 'echo' })
    const result = await adapter.executeTask(makeCtx())
    expect(result.outcome).toBe('done')
    if (result.outcome === 'done') {
      expect(result.summary.length).toBeGreaterThan(0)
    }
  })

  it('returns error when the subprocess exits non-zero', async () => {
    const adapter = createCodexCliAdapter({ codexPath: 'false' })
    const result = await adapter.executeTask(makeCtx())
    expect(result.outcome).toBe('error')
  })

  it('passes extraArgs after the prompt', async () => {
    // Use a shell wrapper so we can see what the adapter invoked. `env`
    // echoes all its args then exec's the rest — so running `env echo`
    // reveals the full argv.
    const adapter = createCodexCliAdapter({
      codexPath: 'echo',
      extraArgs: ['--full-auto'],
    })
    const result = await adapter.executeTask(makeCtx())
    expect(result.outcome).toBe('done')
    if (result.outcome === 'done') {
      expect(result.summary).toContain('--full-auto')
      expect(result.summary).toContain('exec')
    }
  })

  it('honors the id override', () => {
    const adapter = createCodexCliAdapter({ id: 'team-custom:codex' })
    expect(adapter.id).toBe('team-custom:codex')
  })
})
