# Changelog

All notable changes to Design Team land here. Format follows [Keep a Changelog](https://keepachangelog.com/). Version numbers track the repo's `designteam` CLI version; `@designteam/core` and the adapter packages are versioned independently at `packages/*/package.json`.

Source of truth for what shipped in each version is `ROADMAP.md` at the repo root — if this file and ROADMAP ever disagree, ROADMAP wins.

## [Unreleased]

Nothing staged beyond the current `main`.

## [0.6.0] — 2026-04-19 · CLI npm re-release

First user-facing `npx designteam@latest` that ships the v0.13 control plane. 0.5.1 pre-dated `plan` / `run` / `adapters` / `doctor` / `run --dry-run` / `--version`, so `@latest` was stale.

No functional change vs what was in `main` at tag `v0.13.0` — just the CLI version bump so the npm tarball matches the repo.

## [0.13] — 2026-04-19 · Control Plane (paperclip-inspired)

The execution backbone. Design Team can now plan tasks, atomic-checkout work, enforce budgets, approve deliverables, recover stranded runs, and dispatch to any registered adapter — including three reference LLM adapters that ship in the monorepo.

**Execution infrastructure**
- `designteam plan` — Haiku turns a free-text description into a task DAG on disk (PR #18)
- `progress` → `todo | in_progress | in_review | done | blocked | cancelled` lifecycle with auto-unblock + plan-complete bubble-up (PR #21)
- Atomic `checkout` / `release` with `checkoutId` ownership lock, auto-released on terminal transitions (PR #22)
- `blockedByTaskIds` (dependency) distinguished from optional `parentTaskId` (structure) (PR #26)
- Append-only `.designteam/activity.jsonl` + `designteam activity [--tail=N]` viewer (PR #23, #24)
- `designteam recover <plan>` resets wedged `in_progress` tasks older than `--stale-minutes` (default 30) with forensic events (PR #34)

**Distribution**
- `adapter-plugin.md` contract + `@designteam/adapter-utils` (types + registry + shared helpers) (PR #27)
- `@designteam/adapter-local-script` — reference adapter, no LLM (PR #28)
- `@designteam/adapter-claude-cli` — wraps the local `claude` CLI (PR #36)
- `@designteam/adapter-anthropic-api` — autonomous mode via `api.anthropic.com`, reports token cost (PR #40)
- `@designteam/adapter-efecto` V1 — creates Efecto design sessions per task (PR #43)
- `runSubprocess` + `buildAgentPrompt` + `truncate` hoisted into adapter-utils so community adapters (codex, cursor, gemini) are a ~30-LOC spawn-config job (PR #44)
- `designteam run --adapter=<id>` resolves registered adapters; `--command=<shell>` builds an ephemeral local-script adapter (PR #37)
- `designteam adapters` CLI command lists every registered adapter (PR #45)
- `designteam run --dry-run` previews a dispatch without side effects (PR #50)

**Safety + governance**
- Budget hard-stop — `.designteam/budget.{json,jsonl}` + `designteam budget [show|set|reset]`, runner refuses at the cap (PR #32)
- Budget soft warning at 80% — runner still dispatches but nags on stderr + emits `budget.warning` activity; `budget show` flips to WARN (PR #41)
- Approval gates — `designteam approvals`, `approve`, `reject` work off the `in_review` task status (PR #33)

**Ops + docs**
- `AGENTS.md` contributor orientation at repo root (PR #19); refreshed for v0.13 shipped state (PR #49)
- `doc/` hierarchy via `git mv` — `VISION.md` → `doc/PRODUCT.md`, `DESIGN-TEAM-VISION.md` → `doc/GOAL.md`, `TASKS.md` → `doc/TASKS.md` (PR #35); TASKS sync (PR #42)
- `evals/` sandbox harness + 9 end-to-end scenarios (PR #25 + extensions)
- `.github/workflows/publish.yml` — tag-triggered npm publish in dependency order, skip-if-already-published (PR #39)
- `adapter-plugin.md` + `README.md` refreshed to match shipped state (PR #47, PR #48)
- Direct test coverage for `runSubprocess` (PR #46)

**Counts at v0.13 cut**: 6 workspace packages, 463 vitest cases, 9 sandbox evals, tsc clean across packages, single-tag publish workflow ready.

## [0.12] — 2026-04-18 · npm Package Cleanup

- Publish-readiness audit + `doc/PUBLISHING.md` runbook (PR #38)
- Tag-triggered publish workflow with `publish-if-changed.sh` per package (PR #39)

## [0.11] — Truly Autonomous (Cron-driven)

- Phase 1: Haiku planning — `designteam plan` produces task DAGs (PR #18)
- Phase 2: Claude Code execution — `designteam run` with `adapter-claude-cli` (PR #20, PR #36)
- Phase 3: Anthropic API direct — `adapter-anthropic-api` unblocks "agents work while you sleep" (PR #40)

## [0.10] — Web App Living State

Team pages at designteam.app show live agent moods, XP, memories, relationships, and a project timeline fed from the activity log.

## [0.9] — `designteam run`

First `run` command — ephemeral local-script dispatch before the full adapter system landed.

## [0.8] — Efecto Integration

- Phase 1A: Safe duplicate removal — `team-composition.ts` + `skill-generator.ts` become re-export shims; `@designteam/core` pinned to `~0.3.1` (PR #530)
- Phase 1B: Cloud sync already shipped in Efecto prior to this integration — noted during audit
- `agent-team-living-state.ts` wires Efecto's UI to core's emotion/memory/XP primitives

## [0.7] — Auto Memory Extraction (PR #7)

- New `auto-extract` module in core (AI + heuristic categorization)
- `designteam report --memory` auto-routes to agent or team memory based on content
- Haiku extraction when `ANTHROPIC_API_KEY` is set; heuristic fallback otherwise
- Prompt injection hardened — agent-report content wrapped in `<agent_report>` tags

## [0.6] — The Memory Loop (PR #6)

- `team-memory` module (brand/project/user/decision/fact categories)
- `user-profile` module (business/industry/audience/voice/style)
- `remember`, `recall`, `memory`, `profile` CLI commands
- Dynamic skill injects `ABOUT THE USER` + `TEAM KNOWLEDGE` at the top of every skill file

## [0.5] — Supabase Cloud Sync (PR #5)

- `agent_states` + `team_relationships` tables with RLS
- `GET/PUT /api/teams/:id/state` endpoints
- `designteam sync` + `designteam pull`
- Agents persist across machines — tested end-to-end

## [0.4] — @pixabots/core from npm (PR #4)

- Replaced hand-rolled `randomPixabotId()` with `@pixabots/core` primitives
- PixabotEditor uses `CATEGORY_ORDER`, `partCount()`, `encode()`, `decode()`
- Single source of truth for avatar logic

## [0.3] — Pixabots Avatars (PR #3)

- Pixabots API integration everywhere
- Per-role stable IDs + per-agent custom IDs
- PixabotEditor with per-part controls + shuffle
- Recruitment preview with shuffle

## [0.2] — Tamagotchi CLI (PR #2)

- `roster`, `status`, `check`, `recruit`, `fire`, `report`, `refresh` commands
- Local state persistence in `.designteam/`
- Dynamic skill generation with live state injection
- Self-reporting protocol
- Combined flags (`--completed --approved --memory`)
- Decay on read

## [0.1] — Core Extraction (PR #2)

- `@designteam/core` npm package — 16 modules, MIT, zero runtime deps
- pnpm workspace monorepo at `packages/core/`
- Personality engine (5 axes, 32 traits, conviction, level modulation)
- Emotional model (5 emotions, 11 events, 7 moods, time-based decay)
- Memory system (salience decay, reinforcement, extraction)
- Relationship graph (synergy scoring, bond decay, conflict)
- Lifecycle module (`reportOutcome`, `applyDecay`, `inferMemoryType`)
- Scale utils (bidirectional -5/+5 ↔ 0-10 conversion for Efecto compat)
- App re-exports from core via thin shims

[Unreleased]: https://github.com/pablostanley/designteam-app/compare/v0.13.1...HEAD
[0.6.0]: https://github.com/pablostanley/designteam-app/releases/tag/v0.13.1
[0.13]: https://github.com/pablostanley/designteam-app/releases/tag/v0.13.0
[0.12]: https://github.com/pablostanley/designteam-app/releases/tag/v0.12
[0.11]: https://github.com/pablostanley/designteam-app/releases/tag/v0.11
[0.10]: https://github.com/pablostanley/designteam-app/releases/tag/v0.10
[0.9]: https://github.com/pablostanley/designteam-app/releases/tag/v0.9
[0.8]: https://github.com/pablostanley/designteam-app/releases/tag/v0.8
[0.7]: https://github.com/pablostanley/designteam-app/releases/tag/v0.7
[0.6]: https://github.com/pablostanley/designteam-app/releases/tag/v0.6
[0.5]: https://github.com/pablostanley/designteam-app/releases/tag/v0.5
[0.4]: https://github.com/pablostanley/designteam-app/releases/tag/v0.4
[0.3]: https://github.com/pablostanley/designteam-app/releases/tag/v0.3
[0.2]: https://github.com/pablostanley/designteam-app/releases/tag/v0.2
[0.1]: https://github.com/pablostanley/designteam-app/releases/tag/v0.1
