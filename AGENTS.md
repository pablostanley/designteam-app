# AGENTS.md

Guidance for human and AI contributors working in this repository.

## 1. Purpose

Design Team is an AI design crew that ships. Not a prompt pack — a control plane for agents with persistent memory, moods, XP, and bonds, reachable from the CLI, the web app, and (via `@designteam/core`) any tool that can `npm install` a package.

## 2. Read This First

Before making changes, read in this order:

1. `ROADMAP.md` — the source of truth for what's shipped and what's next
2. `doc/PRODUCT.md` — one-page brand + product north star
3. `doc/GOAL.md` — long-horizon thesis
4. `packages/core/README.md` (if working in the engine) — what lives where
5. `doc/TASKS.md` — open work items not yet promoted to a PR

When in doubt, **trust `ROADMAP.md`**. It is updated in the same PR as every feature ship.

## 3. Repo Map

- `packages/core/` — `@designteam/core`. The engine: personality, emotions, memory, relationships, swarm. Zero runtime deps, MIT. Must stay adapter-agnostic.
- `packages/adapter-utils/` — `@designteam/adapter-utils`. The public `TaskAdapter` contract + mutable registry + shared helpers (`buildAgentPrompt`, `truncate`, `runSubprocess`). Peer-depends on core.
- `packages/adapter-local-script/`, `packages/adapter-claude-cli/`, `packages/adapter-anthropic-api/`, `packages/adapter-efecto/` — four reference adapters that ship in the monorepo. New runtime adapters peer-dep on adapter-utils and can live in-repo or in a user's own package.
- `cli/` — the `designteam` npm CLI. Imports from `@designteam/core`, `@designteam/adapter-utils`, the four reference adapters, and the local `cli/*.mjs` modules (state, plans, budget, activity, etc.). Node builtins, no heavy deps.
- `src/app/` — Next.js 16 web app at designteam.app. Team pages, build/recruit flows, API routes.
- `src/lib/agent-builder/` — re-export shims from `@designteam/core`. These exist so app code can keep using `@/lib/agent-builder/*` paths.
- `supabase/migrations/` — append-only SQL migrations. Apply via the Supabase dashboard before merging any PR that depends on a new table.
- `.github/workflows/` — CI runs on every PR + main push: pnpm install, build every workspace package, `pnpm test` (463 vitest cases across 6 packages), `pnpm eval` (8 sandbox scenarios), `pnpm -r --filter './packages/*' run lint` (tsc --noEmit).
- `evals/` — end-to-end sandbox scenarios. Each gets its own temp `.designteam/` dir and exercises the real CLI via `execFileSync`.
- `skills/` — role SKILL.md files for `npx skills add` discovery. Must stay in sync with `@designteam/core`'s `AGENT_SKILL_CONTENT`.

## 4. Dev Setup

```sh
pnpm install
pnpm -r --filter './packages/*' build   # build all workspace packages — required before tests + CLI
pnpm test                               # 463 vitest cases, ~700ms
pnpm eval                               # 8 sandbox scenarios, ~1.5s
pnpm build                              # Next.js web app
node cli/index.mjs --help              # CLI
```

Cloud sync requires Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). The CLI and tests work without them; the web app falls back to an error page on pages that depend on auth.

## 5. Core Engineering Rules

1. **Keep `@designteam/core` pure.** No React, no Next, no Supabase client, no filesystem access. It must stay runnable in any JS environment (CLI, browser, serverless function). If you find yourself reaching for `fs` in core, push that concern to an adapter.

2. **Keep contracts synchronized.** If you change the core schema (e.g. add a field to `Agent`, change a migration), update all impacted layers in the same PR:
   - `packages/core/src/*.ts` + tests
   - `packages/core/dist/` (via `pnpm --filter @designteam/core build`)
   - CLI that consumes the type
   - Web app if surfaced
   - Supabase migration if persisted
   - `ROADMAP.md` entry

3. **Every feature ship updates `ROADMAP.md` in the same PR.** Status of the roadmap is part of the review — not an afterthought commit on main.

4. **Prefer `"files"` whitelist over `.npmignore`.** See `package.json`'s `"files": ["cli", "README.md"]`. The published tarball is 17 kB, 4 files. Anything you'd only need for web-app dev goes in `devDependencies`.

5. **Tests before code when changing the core engine.** Core powers three surfaces (CLI, web, Efecto integration). A regression in personality/emotion/memory/relationships logic is expensive to chase through every adapter.

6. **Fire-and-forget cloud writes.** Push-to-Supabase calls from the CLI or browser wrap in `.catch(() => {})`. A failed sync must never block the local write or the user-visible response.

## 6. Invariants

- Agent IDs are stable across a team's lifetime. Never regenerate on import/fork — you'd orphan all existing `agent_states` / `team_relationships` rows.
- Team memory is team-scoped. User profile is global. Never conflate them.
- Personality sliders are -5 to +5 bipolar (core's source of truth). Efecto's 0-10 scale is a historical compat thing — see `packages/core/src/scale-utils.ts`.
- RLS policies must stay aligned across migrations 003/004/005/021 and any future tables: public read for public teams, owner write when authenticated, anonymous write only for `user_id IS NULL` teams.
- The CLI's `remoteId` detection (used for cloud push) prefers `team.remoteId` → `team.short_id` in that order. Keep this fallback intact or offline/local-only teams will break.

## 7. When You Ship a PR

- CI must pass — `pnpm test`, `pnpm eval`, `pnpm -r --filter './packages/*' run lint`, plus the Vercel preview build for web-app changes.
- Update `ROADMAP.md` as part of the PR — the relevant bullet moves from `[ ]` to `[x]` with the PR number and a one-line summary.
- If the PR adds a migration, flag it in the PR body under a **Deployment** section so the migration runs before user-facing code ships.
- Publishing: auto-publish-on-tag shipped in PR #39. Tag `v*.*.*` and `.github/workflows/publish.yml` invokes `scripts/publish-if-changed.sh` for each package in dependency order (core → adapter-utils → three adapters → adapter-efecto → CLI). Uses `pnpm publish` so `workspace:*` rewrites to real versions in the tarball. Requires an `NPM_TOKEN` secret with "Automation" scope for the `@designteam` npm org.
- See `doc/PUBLISHING.md` for the manual-break-glass commands + the current-versions table.

## 8. What's Deferred or Out of Scope

- Multi-tenant / team sharing beyond `is_public` — single-user teams only for now
- Agent-to-agent messaging at runtime (mailbox exists in core but no delivery path)
- Full plugin system (paperclip-style) — shipped in v0.13 via the `TaskAdapter` contract + mutable registry. SKILL.md files remain the extension surface for prompt packaging; adapters are the runtime-execution surface.
- Cron-driven fully-autonomous mode — v0.11 all three phases shipped: Phase 1 (Haiku planning, PR #18), Phase 2 (Claude Code execution via `designteam run`, PR #20), Phase 3 (Anthropic API direct via `adapter-anthropic-api`, PR #40). The cron itself is whichever scheduler the operator prefers (launchd, GH Actions, etc.) — Design Team runs the task; the operator runs the clock.
- Efecto schema reconciliation (v0.14) — `agent_living_state` (Efecto's jsonb blob) vs `agent_states` (designteam's normalized columns). Both sides use the same in-memory `AgentLivingState` type today, but the DB shapes diverge. Migration path TBD.

When an agent (human or AI) proposes work that touches one of these, confirm scope with Pablo before implementing.
