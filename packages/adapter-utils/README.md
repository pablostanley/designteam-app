# @designteam/adapter-utils

Shared types and registry helpers every [Design Team](https://designteam.app)
adapter implements. If you're writing an adapter, this is your contract.

See the monorepo root's `adapter-plugin.md` for the full spec + invariants.

## Install

```sh
pnpm add @designteam/adapter-utils
```

## What's in here

### Types

```ts
interface TaskAdapter {
  id: string
  name: string
  version: string
  executeTask(ctx: TaskContext): Promise<TaskResult>
  reportCost?(ctx: TaskContext, result: TaskResult): Promise<CostReport>
  heartbeat?(ctx: TaskContext): void
}
```

- **`TaskContext`** — everything the host hands to the adapter at dispatch
  time: plan, task, team, agent, team memory, user profile, runId, and an
  `AbortSignal` the host uses to cancel the run.
- **`TaskResult`** — a tagged union for the five outcomes an adapter can
  return: `done`, `in_review`, `blocked`, `cancelled`, `error`. The host
  maps each to the corresponding `designteam progress` transition.
- **`PlanTask`** / **`Plan`** — the shape on disk at
  `.designteam/projects/<plan-id>.json`.
- **`CostReport`** — `{ model, inputTokens, outputTokens, usdCents? }`.
  Optional — adapters that don't know their cost can skip `reportCost`.

### Registry

Mutable, paperclip-style. Third-party adapters register themselves from
their own entrypoint; the host never needs to know about them at build
time.

```ts
import { registerAdapter, resolveAdapter, listAdapters } from '@designteam/adapter-utils'

registerAdapter(myAdapter)          // add / replace by id
resolveAdapter('team-custom:foo')   // null if unknown
listAdapters()                      // every registered adapter
```

Also exported: `unregisterAdapter(id)` and `clearAdapters()` (useful in
tests).

### Prompt + subprocess helpers

LLM-backed adapters tend to need the same three primitives:

- **`buildAgentPrompt(ctx)`** — stitches agent identity + personality +
  mood + memory + team memory + user profile + task brief into one
  prompt string. Every LLM adapter should start with this so the model
  sees Design Team's full context.
- **`truncate(str, max)`** — clips long LLM output for `summary` fields
  without losing the ellipsis convention (keeps the last char as `…`).
- **`runSubprocess({ command, args, signal, timeoutMs, shell? })`** —
  spawns a child process and wires `ctx.signal` + a wall-clock timeout
  into a SIGTERM→SIGKILL escalation that kills the whole process group
  (not just the shell wrapper). Returns `{ exitCode, stdout, stderr,
  timedOut }`. Use this for any CLI-wrapping adapter (claude, codex,
  cursor, gemini, …) — otherwise you'll hit the "detached + kill-group"
  dance on your own and it's easy to get wrong.

```ts
import { buildAgentPrompt, runSubprocess, truncate } from '@designteam/adapter-utils'

const prompt = buildAgentPrompt(ctx)
const { exitCode, stdout, stderr, timedOut } = await runSubprocess({
  command: 'codex',
  args: ['exec', prompt],
  signal: ctx.signal,
  timeoutMs: 15 * 60 * 1000,
})
```

## Writing a new adapter

See `@designteam/adapter-local-script` for the reference implementation
(no LLM dependency, minimal surface) and `@designteam/adapter-claude-cli`
for a proper LLM-backed example.

## License

MIT
