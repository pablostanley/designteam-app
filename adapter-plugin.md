# Adapter Plugin Spec

Status: v0.13 shipped — the contract third parties implement to teach Design Team how to execute a task against a specific runtime.

## Why adapters exist

Design Team has an engine (`@designteam/core`), a planner (`designteam plan`), a task lifecycle (`todo → in_progress → in_review → done`), and an activity log. What it **doesn't** own is how to actually make an agent produce work — that depends on the runtime.

An **adapter** is a thin package that teaches Design Team to invoke one runtime. Four reference implementations ship in the monorepo:

- `@designteam/adapter-local-script` — shells out per task with `DT_*` env vars. No LLM. The eval-harness default and the simplest possible `TaskAdapter`.
- `@designteam/adapter-claude-cli` — wraps the local `claude` CLI. Stitches agent identity + personality + mood + memory + team memory + user profile into one `claude -p` invocation.
- `@designteam/adapter-anthropic-api` — hits `api.anthropic.com/v1/messages` directly. The autonomous-mode adapter. Reports token cost via `reportCost()` so budget hard-stop can enforce.
- `@designteam/adapter-efecto` — creates an Efecto design session per task and returns the `designUrl` as the artifact. The agency-shaped adapter — what the 7-phase Efecto roadmap builds on. V2 will layer on the LLM+MCP tool-use loop that drives Efecto's 64-tool surface autonomously.

Community-ownable follow-ups:

- `@designteam/adapter-codex-local` — wraps the local `codex` CLI the same way adapter-claude-cli wraps `claude`.
- `@designteam/adapter-cursor-local` — spawns cursor-agent for a task.
- `@designteam/adapter-gemini-local` — Gemini CLI wrapper.

All three become ~30 LOC of spawn-config once `runSubprocess` from adapter-utils is imported.

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

Design Team discovers adapters through a mutable, paperclip-style registry. Adapters add themselves at module load; the host resolves by id at dispatch time.

- **Built-ins**: `cli/builtin-adapters.mjs` in this repo registers the four reference adapters on CLI startup. `adapter-claude-cli` registers unconditionally; `adapter-anthropic-api` registers when `ANTHROPIC_API_KEY` is set; `adapter-efecto` registers when `EFECTO_API_KEY` is set; `adapter-local-script` is built ephemerally per-run when the caller passes `--command=<shell>`.
- **Programmatic**: any adapter can call `registerAdapter(myAdapter)` from its own entrypoint. The host doesn't need to know about it at build time.
- **Introspection**: `designteam adapters` prints every adapter currently resolvable by id. `listAdapters()` is the programmatic equivalent.

Third parties don't need a PR on this repo to register — publish the package, call `registerAdapter()` from your entrypoint, done.

## Shared helpers (adapter-utils)

Every adapter of the CLI-wrapping / LLM-backed shape leans on three primitives exported from `@designteam/adapter-utils` — using them keeps Design Team context presentation consistent across adapters:

- **`buildAgentPrompt(ctx)`** — stitches agent identity + personality + mood + memory + team memory + user profile + task brief into one prompt string.
- **`truncate(str, max)`** — clips long LLM output for `summary` fields, keeping the `…` convention.
- **`runSubprocess({ command, args, signal, timeoutMs, shell?, cwd?, env? })`** — spawns a child process and wires `ctx.signal` + a wall-clock timeout into a SIGTERM→SIGKILL escalation that kills the whole process group (not just the shell wrapper). Returns `{ exitCode, stdout, stderr, timedOut }`.

Community adapters for codex / cursor / gemini are built by importing these three + pointing at a different CLI binary.

## Invariants

1. **Adapters never mutate plan state directly.** Status transitions go through the CLI (`designteam progress`/`checkout`/`release`) so the activity log stays the single source of truth.
2. **Adapters respect atomic checkout.** The control plane only calls `executeTask` after the task is in `in_progress` and the adapter's runId is the registered `checkoutId`. If an adapter discovers it doesn't hold the lock, it should return `{ outcome: 'error', message: 'lost checkout' }` without side effects.
3. **Adapters handle `ctx.signal.aborted`.** If the host cancels the run, the adapter must stop as quickly as it can and return `{ outcome: 'cancelled', ... }`.
4. **Adapters don't write to `@designteam/core`.** Core is pure and test-only. Adapters that need shared utilities (SSE parsing, prompt assembly, etc.) use `@designteam/adapter-utils`.

## Cost accounting

```ts
interface CostReport {
  model: string            // e.g. 'anthropic:claude-sonnet-4-6'
  inputTokens: number
  outputTokens: number
  usdCents?: number        // null if the adapter can't compute — host estimates
}
```

Adapters that know their cost return it from `reportCost()`. The host appends to `.designteam/budget.jsonl` after each successful run; `designteam budget show` reads the ledger against the configured cap, and `designteam run`'s pre-flight refuses (`over`) or nags on stderr + emits a `budget.warning` activity (`warn`, ≥80% of cap) based on the current total.

`adapter-anthropic-api` ships with default pricing for Sonnet 4.6 / Opus 4.7 / Haiku 4.5 at April 2026 rates; override via the `pricing` option for contract rates or newer models.

## What's not yet specified

- **Heartbeat cadence** — picked per-adapter based on typical run length. Reasonable default is every 15 s. The `recover` command today scans `updatedAt` rather than a dedicated heartbeat timestamp; a first-class heartbeat field will land when a long-running adapter needs it.
- **Artifacts storage** — adapters today pass artifact metadata back inline (URI or inline content). A shared object-store will follow once adapter-efecto V2 starts producing large artifacts.

## Status

- ✅ `packages/adapter-utils/` — types + registry + shared helpers (PR #27, PR #44).
- ✅ `@designteam/adapter-local-script` — reference adapter (PR #28).
- ✅ `@designteam/adapter-claude-cli` — first LLM-backed adapter (PR #36).
- ✅ `@designteam/adapter-anthropic-api` — autonomous-mode adapter (PR #40).
- ✅ `@designteam/adapter-efecto` V1 — session creator (PR #43). V2 with the LLM+MCP tool-use loop is next.
- ⏳ Community runtime adapters (cursor, codex, gemini) — ownable now that four reference adapters exist.

Contract changes are breaking for every adapter — propose them as a PR on this file + `packages/adapter-utils/` together.
