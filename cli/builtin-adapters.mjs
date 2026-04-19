/**
 * Built-in adapter registration.
 *
 * Design Team ships with two adapters out of the box:
 *   - @designteam/adapter-local-script (reference, no LLM)
 *   - @designteam/adapter-claude-cli (wraps `claude` on PATH)
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
import { createLocalScriptAdapter } from '@designteam/adapter-local-script'
import { createClaudeCliAdapter } from '@designteam/adapter-claude-cli'

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

  // Local-script is deliberately NOT registered by default — it needs a
  // `command` to be useful, and we don't have one until the caller
  // invokes `designteam run --command=...`. Instead, the runner builds
  // an ephemeral instance on demand (see cli/runner.mjs).
}
