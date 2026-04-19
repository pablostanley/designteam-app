/**
 * @designteam/adapter-codex-local
 *
 * Dispatches each task to the local `codex` CLI (OpenAI's coding
 * assistant). Mirror of adapter-claude-cli — the shared
 * `buildAgentPrompt` + `runSubprocess` helpers from adapter-utils
 * do the heavy lifting; this file just pins the command +
 * argument pattern.
 *
 * Intended as both a working adapter and a template for the
 * cursor/gemini CLI wrappers that remain community-ownable: the
 * whole file is ~60 LOC thanks to adapter-utils.
 *
 * Contract conforms to `TaskAdapter` from `@designteam/adapter-utils`.
 * See `adapter-plugin.md` at the monorepo root for the full spec.
 */

import {
  buildAgentPrompt,
  runSubprocess,
  truncate,
  type TaskAdapter,
  type TaskContext,
  type TaskResult,
} from '@designteam/adapter-utils'

export { buildAgentPrompt as buildPrompt } from '@designteam/adapter-utils'

export interface CodexCliAdapterOptions {
  /**
   * Command to invoke. Defaults to `codex`. Override to a wrapper
   * script or a test stand-in (e.g. `echo`).
   */
  codexPath?: string

  /**
   * Optional override for the adapter id. Defaults to
   * `@designteam/adapter-codex-local`.
   */
  id?: string

  /**
   * Extra CLI args appended after `exec <prompt>`. Useful for
   * per-model flags or `--full-auto`-style toggles the operator
   * wants pinned.
   */
  extraArgs?: string[]

  /**
   * Time limit per task. Default 15 minutes — matches adapter-claude-cli
   * so behavior is predictable across LLM CLI adapters.
   */
  timeoutMs?: number
}

export function createCodexCliAdapter(opts: CodexCliAdapterOptions = {}): TaskAdapter {
  const codexPath = opts.codexPath ?? 'codex'
  const extraArgs = opts.extraArgs ?? []
  const timeoutMs = opts.timeoutMs ?? 15 * 60 * 1000
  const id = opts.id ?? '@designteam/adapter-codex-local'

  return {
    id,
    name: 'Codex CLI',
    version: '0.1.0',
    async executeTask(ctx: TaskContext): Promise<TaskResult> {
      const prompt = buildAgentPrompt(ctx)

      try {
        const { exitCode, stdout, stderr, timedOut } = await runSubprocess({
          command: codexPath,
          // codex uses `exec <prompt>` for one-shot runs.
          args: ['exec', prompt, ...extraArgs],
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
            summary: `Codex CLI exceeded ${timeoutMs}ms timeout`,
            reason: 'timeout',
          }
        }
        if (exitCode !== 0) {
          return {
            outcome: 'error',
            message: truncate(stderr || `codex exited ${exitCode}`, 500),
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
