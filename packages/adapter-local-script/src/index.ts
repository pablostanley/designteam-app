/**
 * @designteam/adapter-local-script
 *
 * Reference adapter. Executes each task by shelling out to a configured
 * command, passing the task context as environment variables. Doesn't
 * require an LLM, which makes it:
 *   - The easiest adapter to build evals against.
 *   - The right answer for workflows where "do this task" just means
 *     "run this command" (e.g. a lint task that runs `pnpm lint`, a
 *     deploy task that runs `vercel deploy --prod`).
 *
 * Contract: conforms to `TaskAdapter` from `@designteam/adapter-utils`.
 * See `adapter-plugin.md` at the monorepo root for the full spec.
 */

import { spawn } from 'node:child_process'
import type { TaskAdapter, TaskContext, TaskResult } from '@designteam/adapter-utils'

export interface LocalScriptAdapterOptions {
  /**
   * Shell command to run per task. The command string is passed to
   * `spawn(..., { shell: true })` so `&&`, pipes, redirects, env-var
   * substitution, etc. all work.
   *
   * The task context is also exposed as env vars so the script can
   * read them without interpolation: `DT_TASK_ID`, `DT_TASK_ROLE`,
   * `DT_TASK_INSTRUCTION`, `DT_PLAN_ID`, `DT_AGENT_NAME`, `DT_RUN_ID`.
   */
  command: string

  /**
   * Optional override for the adapter id. Defaults to
   * `@designteam/adapter-local-script`. Useful if one deployment
   * registers multiple local-script adapters with different commands.
   */
  id?: string

  /**
   * Optional override for the working directory. Defaults to
   * process.cwd(), which is where the CLI already rooted `.designteam/`.
   */
  cwd?: string

  /**
   * Extra env vars merged on top of the DT_* task context. Useful for
   * passing API keys, project paths, etc. to the script.
   */
  env?: Record<string, string>

  /**
   * Time limit per task in ms. The adapter will abort the child process
   * (and return `outcome: 'cancelled'`) if the command runs past this.
   * Defaults to 10 minutes.
   */
  timeoutMs?: number
}

export function createLocalScriptAdapter(opts: LocalScriptAdapterOptions): TaskAdapter {
  if (!opts || typeof opts.command !== 'string' || opts.command.trim().length === 0) {
    throw new Error('createLocalScriptAdapter requires { command: string }')
  }

  const id = opts.id ?? '@designteam/adapter-local-script'
  const timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000

  return {
    id,
    name: 'Local Script',
    version: '0.1.0',
    async executeTask(ctx: TaskContext): Promise<TaskResult> {
      const env = {
        ...process.env,
        DT_TASK_ID: ctx.task.id,
        DT_TASK_ROLE: ctx.task.agentRole,
        DT_TASK_INSTRUCTION: ctx.task.instruction,
        DT_PLAN_ID: ctx.plan.id,
        DT_AGENT_NAME: ctx.agent.name,
        DT_AGENT_ROLE: ctx.agent.role,
        DT_RUN_ID: ctx.runId,
        ...(opts.env ?? {}),
      }

      try {
        const { exitCode, stdout, stderr, timedOut } = await runCommand({
          command: opts.command,
          cwd: opts.cwd ?? process.cwd(),
          env,
          signal: ctx.signal,
          timeoutMs,
        })

        if (ctx.signal.aborted) {
          return {
            outcome: 'cancelled',
            summary: `Run cancelled by host after signal (exit ${exitCode ?? 'n/a'})`,
            reason: 'signal.aborted',
          }
        }

        if (timedOut) {
          return {
            outcome: 'cancelled',
            summary: `Command exceeded ${timeoutMs}ms timeout`,
            reason: 'timeout',
          }
        }

        if (exitCode === 0) {
          return {
            outcome: 'done',
            summary: truncate(stdout || 'exit 0', 500),
          }
        }

        // Non-zero exit — report as error so the host can decide whether
        // to retry or move the task to blocked.
        return {
          outcome: 'error',
          message: truncate(stderr || `exit ${exitCode}`, 500),
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
// Command runner — wraps child_process.spawn with abort + timeout semantics
// so the adapter can honor ctx.signal and its own timeout in one place.
// ---------------------------------------------------------------------------

interface RunArgs {
  command: string
  cwd: string
  env: NodeJS.ProcessEnv
  signal: AbortSignal
  timeoutMs: number
}

interface RunResult {
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
}

function runCommand(args: RunArgs): Promise<RunResult> {
  return new Promise((resolve) => {
    // `detached: true` makes the child its own process group leader so we
    // can signal the whole tree (shell + subprocess) with a single
    // `process.kill(-pid, ...)`. Without this, SIGTERM to the shell
    // doesn't propagate to long-running subcommands like `sleep` and the
    // test harness hangs until vitest's default 5s timeout trips.
    const child = spawn(args.command, {
      cwd: args.cwd,
      env: args.env,
      shell: true,
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
        // Signal the whole process group on POSIX; fall back to direct
        // kill on Windows (no detached semantic available for shell:true
        // the same way).
        if (process.platform !== 'win32' && typeof child.pid === 'number') {
          process.kill(-child.pid, signal)
        } else {
          child.kill(signal)
        }
      } catch {
        // Child may have exited between the check and the signal — that's fine.
      }
    }

    const requestStop = () => {
      killTree('SIGTERM')
      // Escalate to SIGKILL if the child is still around after 500ms
      // (handles subprocesses that trap SIGTERM or otherwise stall).
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
