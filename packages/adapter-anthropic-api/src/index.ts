/**
 * @designteam/adapter-anthropic-api
 *
 * Dispatches tasks directly to the Anthropic Messages API. No Claude
 * Code, no human in the loop — this is the adapter that unlocks
 * "agents work while you sleep" (v0.11 Phase 3 / Paperclip model).
 *
 * Why this over adapter-claude-cli:
 *   - adapter-claude-cli wraps a local process. Great for interactive
 *     work from Claude Code. Bad for cron jobs / CI workflows.
 *   - This adapter hits the API directly. Runs in any Node process
 *     with ANTHROPIC_API_KEY. Returns token counts via reportCost
 *     so budget.mjs can enforce the monthly cap.
 *
 * Contract conforms to `TaskAdapter` from `@designteam/adapter-utils`.
 * See `adapter-plugin.md` at the monorepo root for the full spec.
 */

import {
  buildAgentPrompt,
  truncate,
  type CostReport,
  type TaskAdapter,
  type TaskContext,
  type TaskResult,
} from '@designteam/adapter-utils'

export { buildAgentPrompt as buildPrompt } from '@designteam/adapter-utils'

export interface AnthropicApiAdapterOptions {
  /**
   * API key. Falls back to `process.env.ANTHROPIC_API_KEY` when not
   * passed. Required — the adapter throws at construction if neither
   * is available, so misconfiguration fails fast rather than at the
   * first task dispatch.
   */
  apiKey?: string

  /**
   * Model identifier. Defaults to Sonnet 4.6 — fast enough for most
   * design tasks, high-enough quality for the important ones.
   */
  model?: string

  /**
   * Max output tokens per task. Default 4096. Cap higher for long
   * deliverables (copy decks, research reports) or lower for short
   * ones (headlines, taglines).
   */
  maxTokens?: number

  /**
   * Temperature. Default 1.0 (Anthropic recommended for creative
   * work). Drop to 0.2 for deterministic outputs.
   */
  temperature?: number

  /** Optional override for the adapter id. */
  id?: string

  /**
   * Pricing table for cost reporting. Defaults cover Sonnet 4.6 +
   * Opus 4.7 + Haiku 4.5 at published rates (April 2026). Override to
   * add newer models or to track a custom contract rate.
   */
  pricing?: Record<string, { inputCentsPerMTok: number; outputCentsPerMTok: number }>

  /**
   * API base URL. Defaults to https://api.anthropic.com — override to
   * point at a proxy, a test mock, or the Vercel AI Gateway.
   */
  baseUrl?: string

  /**
   * Custom fetch implementation. Injected mainly for tests — defaults
   * to globalThis.fetch.
   */
  fetchImpl?: typeof fetch

  /** Time limit per task in ms. Default 15 minutes. */
  timeoutMs?: number
}

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_TEMPERATURE = 1.0
const DEFAULT_BASE_URL = 'https://api.anthropic.com'
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000

/** Published rates as of April 2026. In US cents per 1M tokens. */
const DEFAULT_PRICING: NonNullable<AnthropicApiAdapterOptions['pricing']> = {
  'claude-sonnet-4-6': { inputCentsPerMTok: 300, outputCentsPerMTok: 1500 },
  'claude-opus-4-7': { inputCentsPerMTok: 1500, outputCentsPerMTok: 7500 },
  'claude-haiku-4-5': { inputCentsPerMTok: 80, outputCentsPerMTok: 400 },
}

export function createAnthropicApiAdapter(opts: AnthropicApiAdapterOptions = {}): TaskAdapter {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'createAnthropicApiAdapter requires an API key: pass opts.apiKey or set ANTHROPIC_API_KEY',
    )
  }

  const model = opts.model ?? DEFAULT_MODEL
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS
  const temperature = opts.temperature ?? DEFAULT_TEMPERATURE
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const pricing = { ...DEFAULT_PRICING, ...(opts.pricing ?? {}) }
  const id = opts.id ?? '@designteam/adapter-anthropic-api'

  // Keyed on TaskContext so reportCost can attribute tokens without
  // hanging the full response off the adapter surface. Entries fall
  // off when the host drops the context ref — no cleanup needed.
  const lastUsage = new WeakMap<TaskContext, { inputTokens: number; outputTokens: number; model: string }>()

  return {
    id,
    name: 'Anthropic API',
    version: '0.1.0',
    async executeTask(ctx: TaskContext): Promise<TaskResult> {
      const prompt = buildAgentPrompt(ctx)
      const signal = AbortSignal.any([ctx.signal, AbortSignal.timeout(timeoutMs)])

      try {
        const res = await fetchImpl(`${baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature,
            messages: [{ role: 'user', content: prompt }],
          }),
          signal,
        })

        if (!res.ok) {
          const body = await res.text().catch(() => '')
          return {
            outcome: 'error',
            message: `Anthropic API ${res.status}: ${body.slice(0, 500)}`,
          }
        }

        const data = (await res.json()) as AnthropicMessageResponse
        const text = data.content?.find((b) => b.type === 'text')?.text
        if (typeof text !== 'string' || !text) {
          return {
            outcome: 'error',
            message: 'Anthropic API returned no text content',
          }
        }

        if (data.usage) {
          lastUsage.set(ctx, {
            inputTokens: data.usage.input_tokens ?? 0,
            outputTokens: data.usage.output_tokens ?? 0,
            model,
          })
        }

        return {
          outcome: 'done',
          summary: truncate(text, 800),
        }
      } catch (err) {
        if (ctx.signal.aborted) {
          return {
            outcome: 'cancelled',
            summary: 'Run cancelled by host',
            reason: 'signal.aborted',
          }
        }
        // Not host-cancelled — the combined signal must have tripped
        // on the timeout branch.
        if (err instanceof DOMException && err.name === 'TimeoutError') {
          return {
            outcome: 'cancelled',
            summary: `Anthropic API call exceeded ${timeoutMs}ms timeout`,
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

    async reportCost(ctx, _result): Promise<CostReport> {
      const usage = lastUsage.get(ctx)
      if (!usage) {
        return {
          model,
          inputTokens: 0,
          outputTokens: 0,
        }
      }
      const rate = pricing[usage.model] ?? pricing[DEFAULT_MODEL]
      const usdCents = rate
        ? Math.ceil(
            (usage.inputTokens * rate.inputCentsPerMTok) / 1_000_000 +
              (usage.outputTokens * rate.outputCentsPerMTok) / 1_000_000,
          )
        : undefined
      return {
        model: `anthropic:${usage.model}`,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        ...(usdCents !== undefined ? { usdCents } : {}),
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Narrow response shape
// ---------------------------------------------------------------------------

interface AnthropicMessageResponse {
  content?: Array<{ type: string; text?: string }>
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}
