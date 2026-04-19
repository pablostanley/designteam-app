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

## Writing a new adapter

See `@designteam/adapter-local-script` for the reference implementation
(no LLM dependency, minimal surface) and `@designteam/adapter-claude-cli`
for a proper LLM-backed example.

## License

MIT
