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
  buildAgentPrompt,
  truncate,
  type TaskAdapter,
  type TaskContext,
  type TaskResult,
} from '@designteam/adapter-utils'

export { buildAgentPrompt as buildPrompt } from '@designteam/adapter-utils'

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
      const prompt = buildAgentPrompt(ctx)

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
