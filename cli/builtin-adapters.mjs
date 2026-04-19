/**
 * Built-in adapter registration.
 *
 * Design Team ships with four adapters out of the box:
 *   - @designteam/adapter-local-script (reference, no LLM)
 *   - @designteam/adapter-claude-cli (wraps `claude` on PATH)
 *   - @designteam/adapter-anthropic-api (registered when ANTHROPIC_API_KEY is set)
 *   - @designteam/adapter-efecto (registered when EFECTO_API_KEY is set)
 *
 * `registerBuiltinAdapters()` makes them resolvable by id via
 * @designteam/adapter-utils' registry. Called once on CLI startup by
 * anything that routes through the runner. Idempotent — safe to call
 * multiple times per process.
 *
 * Third parties can call registerAdapter() themselves from their own
 * entrypoint to extend the set.
 */

import { registerAdapter, resolveAdapter } from '@designteam/adapter-utils'
import { createClaudeCliAdapter } from '@designteam/adapter-claude-cli'
import { createAnthropicApiAdapter } from '@designteam/adapter-anthropic-api'
import { createEfectoAdapter } from '@designteam/adapter-efecto'

let registered = false

export function registerBuiltinAdapters() {
  if (registered) return
  registered = true

  // Claude CLI adapter registers unconditionally — if `claude` isn't on
  // PATH, the subprocess spawn will fail at run time with a clear
  // error. No point gating registration on a `which claude` probe here.
  if (!resolveAdapter('@designteam/adapter-claude-cli')) {
    registerAdapter(createClaudeCliAdapter())
  }

  // Anthropic API adapter only registers when an API key is present.
  // createAnthropicApiAdapter() throws without one — we swallow that
  // case so the CLI still works for users who haven't set the key.
  if (process.env.ANTHROPIC_API_KEY && !resolveAdapter('@designteam/adapter-anthropic-api')) {
    try {
      registerAdapter(createAnthropicApiAdapter())
    } catch {
      // construction failed (missing key despite the check, usually
      // means the env var is empty string) — skip silently
    }
  }

  // Efecto adapter registers when EFECTO_API_KEY is set. Session creation
  // itself is IP-scoped and doesn't currently need the key, but we gate on
  // it anyway so users who don't intend to drive Efecto don't accidentally
  // spin up sessions when they pick the wrong adapter id.
  if (process.env.EFECTO_API_KEY && !resolveAdapter('@designteam/adapter-efecto')) {
    registerAdapter(createEfectoAdapter())
  }

  // Local-script is deliberately NOT registered by default — it needs a
  // `command` to be useful, and we don't have one until the caller
  // invokes `designteam run --command=...`. Instead, the runner builds
  // an ephemeral instance on demand (see cli/runner.mjs).
}
