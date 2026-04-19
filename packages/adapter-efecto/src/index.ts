/**
 * @designteam/adapter-efecto
 *
 * The agency-shaped adapter. Binds Design Team's personality/memory
 * engine to Efecto's design session API so a task assigned to a
 * Design Team agent lands as a real, openable design session.
 *
 * V1 scope (this file): creates a session per task and returns the
 * designUrl as the artifact. The session is where the agent's work
 * lives — opening the URL drops a human (or a future MCP tool-use
 * loop) into the in-progress design.
 *
 * V2 will layer on the LLM tool-use loop that drives Efecto's 64-tool
 * surface autonomously. V1 stops at "session exists, here's where to
 * go see it" so the contract surface gets real exercise first.
 *
 * Contract conforms to `TaskAdapter` from `@designteam/adapter-utils`.
 * See `adapter-plugin.md` at the monorepo root for the full spec.
 */

import {
  buildAgentPrompt,
  truncate,
  type TaskAdapter,
  type TaskContext,
  type TaskResult,
} from '@designteam/adapter-utils'

export interface EfectoAdapterOptions {
  /**
   * Base URL of the Efecto deployment. Defaults to https://efecto.app.
   * Override for self-hosted Efecto, preview URLs, or local dev.
   */
  baseUrl?: string

  /**
   * Optional API key. Efecto's session creation is currently IP-scoped
   * (no auth), but an API key slot is reserved here so v2 can enforce
   * per-team quotas without a breaking change.
   */
  apiKey?: string

  /**
   * Label attached to the created session so `designUrl` consumers can
   * tell at a glance which task the session belongs to. Defaults to
   * `<agent.name>: <task.id>`.
   */
  sessionLabel?: (ctx: TaskContext) => string

  /** Optional override for the adapter id. */
  id?: string

  /** Custom fetch — injected for tests. Defaults to globalThis.fetch. */
  fetchImpl?: typeof fetch

  /** Time limit per task in ms. Default 30 seconds — session creation is fast. */
  timeoutMs?: number
}

const DEFAULT_BASE_URL = 'https://efecto.app'
const DEFAULT_TIMEOUT_MS = 30 * 1000

interface CreateSessionResponse {
  sessionId: string
  designUrl: string
  expiresAt: string
}

export function createEfectoAdapter(opts: EfectoAdapterOptions = {}): TaskAdapter {
  const baseUrl = (opts.baseUrl ?? process.env.EFECTO_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
  const apiKey = opts.apiKey ?? process.env.EFECTO_API_KEY
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const id = opts.id ?? '@designteam/adapter-efecto'
  const labelFor = opts.sessionLabel ?? ((ctx: TaskContext) => `${ctx.agent.name}: ${ctx.task.id}`)

  return {
    id,
    name: 'Efecto',
    version: '0.1.0',
    async executeTask(ctx: TaskContext): Promise<TaskResult> {
      const signal = AbortSignal.any([ctx.signal, AbortSignal.timeout(timeoutMs)])

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

      try {
        const res = await fetchImpl(`${baseUrl}/api/v1/design/sessions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ label: labelFor(ctx) }),
          signal,
        })

        if (!res.ok) {
          const body = await res.text().catch(() => '')
          // 429 means Efecto is over its active-session cap for this
          // IP. Surface as 'blocked' so the host can retry later rather
          // than marking the task failed.
          if (res.status === 429) {
            return {
              outcome: 'blocked',
              summary: `Efecto refused session: ${truncate(body, 200)}`,
              blockerReason: 'efecto.too_many_sessions',
            }
          }
          return {
            outcome: 'error',
            message: `Efecto API ${res.status}: ${body.slice(0, 500)}`,
          }
        }

        const data = (await res.json()) as CreateSessionResponse
        if (!data.sessionId || !data.designUrl) {
          return {
            outcome: 'error',
            message: 'Efecto API returned a response without sessionId or designUrl',
          }
        }

        // The prompt is attached to the artifact so the next hop (human
        // or tool-use loop) has the agent's full context, not just a
        // bare session URL.
        const prompt = buildAgentPrompt(ctx)

        return {
          outcome: 'done',
          summary: truncate(
            `Session ready: ${data.designUrl} (expires ${data.expiresAt}). Task: ${ctx.task.instruction}`,
            800,
          ),
          artifacts: [
            {
              label: 'Efecto design session',
              kind: 'efecto.session',
              uri: data.designUrl,
            },
            {
              label: 'Agent brief',
              kind: 'agent.prompt',
              content: prompt,
            },
          ],
        }
      } catch (err) {
        if (ctx.signal.aborted) {
          return {
            outcome: 'cancelled',
            summary: 'Run cancelled by host',
            reason: 'signal.aborted',
          }
        }
        if (err instanceof DOMException && err.name === 'TimeoutError') {
          return {
            outcome: 'cancelled',
            summary: `Efecto session creation exceeded ${timeoutMs}ms timeout`,
            reason: 'timeout',
          }
        }
        return {
          outcome: 'error',
          message: err instanceof Error ? err.message : String(err),
          cause: err,
        }
      }
    },
  }
}
