# Evals

Behavioral scenarios for the Design Team CLI + core engine. These aren't unit
tests (those live in `packages/core/__tests__/`) — they exercise end-to-end
behavior across multiple commands and assert on durable state.

## Running

```sh
pnpm eval                   # all scenarios
node evals/index.mjs <slug> # single scenario
```

Each scenario:
1. Spins up a fresh sandbox in a temp directory so `.designteam/` state is
   isolated per run.
2. Executes the CLI commands it cares about, using the on-disk CLI binary.
3. Reads durable state back (team.json, state files, activity log, plan
   files, memory) and asserts on it.
4. Cleans up the sandbox even when it fails so a broken eval doesn't leak
   temp dirs across runs.

Exit code is 0 when every scenario passes, 1 otherwise.

## Scenarios

- **`plan-lifecycle`** — plan → checkout → progress → dependent auto-unblock →
  plan bubbles to `completed` → activity log reflects the whole sequence.
- **`memory-routing`** — `remember` adds brand facts to team memory; the
  category + salience land correctly and survive a reload.

## When to add a scenario

Any time you ship a new behavior that spans more than one CLI command or
relies on state that outlives a single invocation, add an eval. Unit tests
in `packages/core/` catch logic bugs in isolation; evals catch integration
drift between CLI ↔ core ↔ on-disk state.

## Not yet covered

Scenarios that need an LLM call (Haiku-powered plan generation, AI memory
extraction) are out of scope until CI has an API key secret. Those will
live behind an `ANTHROPIC_API_KEY` gate and skip cleanly when absent.
