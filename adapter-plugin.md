# Adapter Plugin Spec

Status: v0.13 draft — the contract third parties implement to teach Design Team how to execute a task against a specific runtime.

## Why adapters exist

Design Team has an engine (`@designteam/core`), a planner (`designteam plan`), a task lifecycle (`todo → in_progress → in_review → done`), and an activity log. What it **doesn't** own is how to actually make an agent produce work — that depends on the runtime.

An **adapter** is a thin package that teaches Design Team to invoke one runtime:

- `@designteam/adapter-claude-local` — Claude Code running locally reads a plan file, executes each task via its own Task tool, calls `designteam progress`.
- `@designteam/adapter-codex-local` — same shape for Codex.
- `@designteam/adapter-cursor-local` — same for Cursor.
- `@designteam/adapter-gemini-local` — same for Gemini CLI.
- `@designteam/adapter-efecto` — executes tasks against the Efecto design MCP, producing finished artboards. This is the agency-shaped adapter — what the 7-phase Efecto roadmap builds on.
- `@designteam/adapter-anthropic-api` — calls Anthropic's API directly. The autonomous-mode adapter.

Anyone can publish an adapter. Design Team doesn't need to know about it at build time.

## Contract

An adapter is an ES module that exports a single object conforming to the `TaskAdapter` interface from `@designteam/adapter-utils`:

```ts
interface TaskAdapter {
  /** Stable, unique identifier. npm package scope is a good default. */
  id: string

  /** Human-readable name for UI and logs. */
  name: string

  /** Semver string of the adapter itself, for compatibility messaging. */
  version: string

  /**
   * Attempt to execute one task. Called by the control plane after the
   * task is checked out (atomic ownership lock held) and before the
   * caller issues `designteam progress --done`.
   *
   * The adapter receives:
   *   ctx.plan        — full plan object
   *   ctx.task        — the task to execute (already at in_progress)
   *   ctx.team        — the team that owns the plan
   *   ctx.agent       — the specific agent assigned to the task
   *   ctx.teamMemory  — the team's shared brand/user/project knowledge
   *   ctx.userProfile — the human at the keyboard's profile
   *   ctx.signal      — AbortSignal so the host can cancel a stranded run
   *
   * Returns a result describing what happened. The caller is responsible
   * for the next status transition (`progress --done`, `--review`,
   * `--blocked`, `--cancel`) — the adapter only reports the outcome.
   */
  executeTask(ctx: TaskContext): Promise<TaskResult>

  /**
   * Optional. If the adapter tracks token/cost, report it here so
   * budget enforcement works. Called after executeTask returns.
   */
  reportCost?(ctx: TaskContext, result: TaskResult): Promise<CostReport>

  /**
   * Optional. If the adapter runs for more than a few seconds, it
   * should call this periodically so the heartbeat/stranded-work
   * recovery logic knows the run is alive.
   */
  heartbeat?(ctx: TaskContext): void
}
```

### `TaskResult` shape

```ts
type TaskResult =
  | { outcome: 'done';      summary: string; artifacts?: Artifact[] }
  | { outcome: 'in_review'; summary: string; artifacts?: Artifact[]; reviewerHint?: string }
  | { outcome: 'blocked';   summary: string; blockerReason: string }
  | { outcome: 'cancelled'; summary: string; reason: string }
  | { outcome: 'error';     message: string; cause?: unknown }
```

The control plane maps these to task-status transitions:

| `outcome` | transition |
|---|---|
| `done` | `progress <plan> <task> --done` |
| `in_review` | `progress <plan> <task> --review` |
| `blocked` | `progress <plan> <task> --blocked` |
| `cancelled` | `progress <plan> <task> --cancel` |
| `error` | release checkout, log, surface to operator |

## Registration

Design Team discovers adapters the way any Node CLI discovers plugins: `node_modules` + explicit listing.

- **CLI config**: a `.designteam/adapters.json` file lists the adapter package names and per-adapter options.
- **Programmatic**: `import { registerAdapter } from '@designteam/adapter-utils'` + call it from your adapter's entrypoint.
- **Well-known**: if the package name starts with `@designteam/adapter-` and is present in `node_modules`, we auto-resolve it.

Third parties don't need a PR on this repo to register — publish their package, list it in `.designteam/adapters.json`, done.

## Invariants

1. **Adapters never mutate plan state directly.** Status transitions go through the CLI (`designteam progress`/`checkout`/`release`) so the activity log stays the single source of truth.
2. **Adapters respect atomic checkout.** The control plane only calls `executeTask` after the task is in `in_progress` and the adapter's runId is the registered `checkoutId`. If an adapter discovers it doesn't hold the lock, it should return `{ outcome: 'error', message: 'lost checkout' }` without side effects.
3. **Adapters handle `ctx.signal.aborted`.** If the host cancels the run, the adapter must stop as quickly as it can and return `{ outcome: 'cancelled', ... }`.
4. **Adapters don't write to `@designteam/core`.** Core is pure and test-only. Adapters that need shared utilities (SSE parsing, prompt assembly, etc.) use `@designteam/adapter-utils`.

## What's not yet specified

- **Cost accounting format** — `CostReport` will grow a concrete shape when we ship budget hard-stop (v0.13 safety item).
- **Heartbeat cadence** — picked per-adapter based on typical run length. Reasonable default is every 15 s.
- **Artifacts storage** — adapters today pass artifact metadata back inline. A shared object-store will follow once we have >1 adapter that actually produces artifacts (Efecto adapter will be first).

## Status

- ✅ `packages/adapter-utils/` — types + registry helpers (this PR).
- ⏳ `@designteam/adapter-claude-local` — next.
- ⏳ `@designteam/adapter-efecto` — after that.
- ⏳ Remaining runtime adapters (cursor, codex, gemini) — community-ownable once one reference adapter exists.

Contract changes are breaking for every adapter — propose them as a PR on this file + `packages/adapter-utils/` together.
