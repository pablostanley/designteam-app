/**
 * @designteam/adapter-claude-cli
 *
 * Dispatches each task to the local `claude` CLI. Builds a prompt
 * that embeds the agent's identity (name, role, personality) + the
 * team's shared memory + the user's profile + the task brief, runs
 * `claude -p "<prompt>"`, and captures stdout as the deliverable.
 *
 * Why this as the first "real" adapter:
 *   - Claude Code users already have `claude` on their PATH.
 *   - Zero prompt boilerplate for the caller — the adapter stitches
 *     personality + memory + profile automatically.
 *   - Runs locally, no network config, no API key shuffling.
 *   - Proves that an LLM-backed adapter can slot into the same
 *     contract as the reference local-script adapter.
 *
 * Contract conforms to `TaskAdapter` from `@designteam/adapter-utils`.
 * See `adapter-plugin.md` at the monorepo root for the full spec.
 */

import { spawn } from 'node:child_process'
import {
  emotionToPromptFragment,
  memoryToPromptFragment,
  personalityToPromptFragment,
  teamMemoryToPromptFragment,
  userProfileToPromptFragment,
} from '@designteam/core'
import type { TaskAdapter, TaskContext, TaskResult } from '@designteam/adapter-utils'

export interface ClaudeCliAdapterOptions {
  /**
   * Command to invoke. Defaults to `claude`. Set to something else for
   * tests (e.g. `echo`) or if you have a wrapper script.
   */
  claudePath?: string

  /**
   * Optional override for the adapter id. Defaults to
   * `@designteam/adapter-claude-cli`.
   */
  id?: string

  /**
   * Extra CLI args (after `-p <prompt>`). Useful for things like
   * `--model sonnet` or `--permission-mode bypass`.
   */
  extraArgs?: string[]

  /**
   * Time limit per task. Default 15 minutes — long enough for most
   * design tasks, short enough that a wedged process doesn't hold
   * the checkout forever.
   */
  timeoutMs?: number
}

export function createClaudeCliAdapter(opts: ClaudeCliAdapterOptions = {}): TaskAdapter {
  const claudePath = opts.claudePath ?? 'claude'
  const extraArgs = opts.extraArgs ?? []
  const timeoutMs = opts.timeoutMs ?? 15 * 60 * 1000
  const id = opts.id ?? '@designteam/adapter-claude-cli'

  return {
    id,
    name: 'Claude CLI',
    version: '0.1.0',
    async executeTask(ctx: TaskContext): Promise<TaskResult> {
      const prompt = buildPrompt(ctx)

      try {
        const { exitCode, stdout, stderr, timedOut } = await runClaude({
          claudePath,
          args: ['-p', prompt, ...extraArgs],
          signal: ctx.signal,
          timeoutMs,
        })

        if (ctx.signal.aborted) {
          return {
            outcome: 'cancelled',
            summary: `Cancelled by host after ${stdout.length} chars of output`,
            reason: 'signal.aborted',
          }
        }
        if (timedOut) {
          return {
            outcome: 'cancelled',
            summary: `Claude CLI exceeded ${timeoutMs}ms timeout`,
            reason: 'timeout',
          }
        }
        if (exitCode !== 0) {
          return {
            outcome: 'error',
            message: truncate(stderr || `claude exited ${exitCode}`, 500),
          }
        }

        return {
          outcome: 'done',
          summary: truncate(stdout || 'empty response', 800),
        }
      } catch (err) {
        return {
          outcome: 'error',
          message: err instanceof Error ? err.message : String(err),
          cause: err,
        }
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

/**
 * Build the prompt that goes into `claude -p`. Pulls every knob Design
 * Team tracks — agent identity + personality + mood + memory + team
 * memory + user profile — and weaves them into a single brief the LLM
 * can act on without follow-up context.
 *
 * Exported so tests + callers can verify what's being sent.
 */
export function buildPrompt(ctx: TaskContext): string {
  const sections: string[] = []

  const meta = ctx.agent as unknown as { personality?: { sliders?: Record<string, number> } }
  const personality = meta?.personality
    ? personalityToPromptFragment(meta.personality as never)
    : ''

  sections.push(
    `You are ${ctx.agent.name}, a ${ctx.agent.role} on a design team.`,
  )
  if (personality) sections.push(personality)

  const state = (ctx as unknown as { agentState?: unknown }).agentState as
    | { emotions?: never; memory?: never }
    | undefined
  if (state?.emotions) {
    const moodFragment = emotionToPromptFragment(state.emotions)
    if (moodFragment) sections.push(moodFragment)
  }
  if (state?.memory) {
    const memFragment = memoryToPromptFragment(state.memory, 5)
    if (memFragment) sections.push(memFragment)
  }

  if (ctx.userProfile) {
    const profileFragment = userProfileToPromptFragment(ctx.userProfile)
    if (profileFragment) sections.push(profileFragment)
  }
  if (ctx.teamMemory && ctx.teamMemory.entries?.length > 0) {
    const teamFragment = teamMemoryToPromptFragment(ctx.teamMemory, 10)
    if (teamFragment) sections.push(teamFragment)
  }

  sections.push('')
  sections.push('## Task')
  sections.push('')
  sections.push(ctx.task.instruction)
  if (ctx.task.successCriteria) {
    sections.push('')
    sections.push(`Success criteria: ${ctx.task.successCriteria}`)
  }
  if (ctx.task.why) {
    sections.push(`Why this matters: ${ctx.task.why}`)
  }

  return sections.filter(Boolean).join('\n\n')
}

// ---------------------------------------------------------------------------
// Claude subprocess runner
// ---------------------------------------------------------------------------

interface RunArgs {
  claudePath: string
  args: string[]
  signal: AbortSignal
  timeoutMs: number
}

interface RunResult {
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
}

function runClaude(args: RunArgs): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(args.claudePath, args.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    })

    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false
    let sigkillTimer: NodeJS.Timeout | null = null

    const killTree = (signal: NodeJS.Signals) => {
      if (child.killed || child.exitCode !== null) return
      try {
        if (process.platform !== 'win32' && typeof child.pid === 'number') {
          process.kill(-child.pid, signal)
        } else {
          child.kill(signal)
        }
      } catch {
        // already gone
      }
    }

    const requestStop = () => {
      killTree('SIGTERM')
      sigkillTimer = setTimeout(() => killTree('SIGKILL'), 500)
    }

    const timeout = setTimeout(() => {
      timedOut = true
      requestStop()
    }, args.timeoutMs)

    const onAbort = () => requestStop()
    args.signal.addEventListener('abort', onAbort, { once: true })

    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })

    const finish = (exitCode: number | null) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (sigkillTimer) clearTimeout(sigkillTimer)
      args.signal.removeEventListener('abort', onAbort)
      resolve({ exitCode, stdout, stderr, timedOut })
    }

    child.on('error', (err) => {
      stderr += `\n${err.message}`
      finish(null)
    })
    child.on('close', (code) => finish(code))
  })
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}
