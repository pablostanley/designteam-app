# Design Team — Roadmap

**Last updated**: 2026-04-18 (v0.13 execution-infra items shipped: lifecycle + checkout + activity log)

---

## Done

### v0.1 — Core Extraction (PR #2, merged Apr 14)
- [x] `@designteam/core` npm package (16 modules, 307 tests, MIT)
- [x] pnpm workspace monorepo (`packages/core/`)
- [x] Personality engine (5 axes, 32 traits, conviction, level modulation)
- [x] Emotional model (5 emotions, 11 events, 7 moods, time-based decay)
- [x] Memory system (salience decay, reinforcement, extraction)
- [x] Relationship graph (synergy scoring, bond decay, conflict)
- [x] Lifecycle module (`reportOutcome`, `applyDecay`, `inferMemoryType`)
- [x] Scale utils (bidirectional -5/+5 ↔ 0-10 conversion for Efecto compat)
- [x] App re-exports from core via thin shims
- [x] Published: `@designteam/core@0.1.1`, `designteam@0.3.3`

### v0.2 — Tamagotchi CLI (PR #2, merged Apr 14)
- [x] `roster`, `status`, `check`, `recruit`, `fire`, `report`, `refresh`
- [x] Local state persistence (`.designteam/` directory)
- [x] Dynamic skill generation with live state injection
- [x] Self-reporting protocol
- [x] Combined flags (`--completed --approved --memory`)
- [x] Decay on read

### v0.3 — Pixabots Avatars (PR #3, merged Apr 15)
- [x] Pixabots API integration everywhere
- [x] Per-role stable IDs + per-agent custom IDs
- [x] PixabotEditor (per-part controls + shuffle)
- [x] Recruitment preview with shuffle

### v0.4 — @pixabots/core from npm (PR #4, merged Apr 15)
- [x] Replaced hand-rolled `randomPixabotId()` with `@pixabots/core`
- [x] PixabotEditor uses `CATEGORY_ORDER`, `partCount()`, `encode()`, `decode()`
- [x] Single source of truth for avatar logic

### v0.5 — Supabase Cloud Sync (PR #5, merged Apr 16)
- [x] `agent_states` table (emotions, memories, XP, level per team/agent)
- [x] `team_relationships` table (relationship graph jsonb)
- [x] RLS policies (public read, owner write, anonymous team write)
- [x] API: `GET/PUT /api/teams/:id/state`
- [x] CLI: `designteam sync`, `designteam pull`
- [x] Agents persist across machines — tested end-to-end

---

### v0.6 — The Memory Loop (PR #6, merged Apr 17)
- [x] `@designteam/core`: new `team-memory` module (brand/project/user/decision/fact categories)
- [x] `@designteam/core`: new `user-profile` module (business/industry/audience/voice/style)
- [x] Migration 004 — `team_memory` table with RLS
- [x] CLI: `remember`, `recall`, `memory`, `profile get/set/unset`
- [x] Dynamic skill injects `ABOUT THE USER` + `TEAM KNOWLEDGE` at the top

### v0.7 — Auto Memory Extraction (PR #7, merged Apr 17)
- [x] `@designteam/core`: new `auto-extract` module (AI + heuristic)
- [x] `--memory` now auto-routes to agent or team memory based on content
- [x] Haiku extraction when `ANTHROPIC_API_KEY` is set (up to 3 memories per report)
- [x] Heuristic fallback — categorizes by keyword patterns (brand/user/decision/project)
- [x] Const tuples drive both unions (no stringly-typed drift)
- [x] Prompt injection hardened (content wrapped in `<agent_report>` tags)
- [x] 344 tests passing
- [x] Published `@designteam/core@0.3.1`, `designteam@0.5.1`

## Up Next

### v0.8 — Efecto Integration

**The goal:** Efecto agents become real tamagotchis — they persist across sessions/devices, remember the brand, know who the user is, grow with use.

**Phase 1A: Safe duplicate removal** (PR #530, merged Apr 18)
- [x] Replace `team-composition.ts` and `skill-generator.ts` with re-export shims
- [x] Pin `@designteam/core` to `~0.3.1`
- [x] MIGRATION.md documents what's left

---

**Phase 1B.1: Cloud Sync in Efecto [ALREADY SHIPPED — discovered Apr 18]**

Found during loop cycle: Efecto already has end-to-end cloud sync for living state.
- `supabase/migrations/020_agent_living_state.sql` — `agent_living_state` + `agent_relationship_graph` tables
- `lib/studio/agent-living-state-sync.ts` — `pushAgentState`, `pushRelationshipGraph`, `syncTeamLivingState`, `pushTeamLivingState`
- `app/design/[id]/[[...slug]]/page.tsx:200` calls `syncTeamLivingState(team)` on team load (pull)
- `lib/studio/agent-team-chat-hooks.ts:150` calls `pushTeamLivingState(team)` after each chat response (push)

**Schema divergence discovered:**
Efecto uses its own table shape (`agent_living_state` keyed by `user_id+agent_id`, state as a single `JSONB` blob) while designteam.app uses the normalized `agent_states` table (from migration 003). Both live in the same Supabase project but can't directly read each other's state.

**Unification follow-up ticket** (added to Future section below):
- Decide whether Efecto migrates to designteam's schema, or designteam adopts Efecto's, or a shared view reconciles them
- Goal: same team works identically in CLI and Efecto without re-syncing

---

**Phase 1B.2: Team Memory in Efecto (PR #531, merged Apr 18)**

Shared brand/user/project knowledge now flows into every agent prompt.
- [x] New `lib/studio/agent-team-memory.ts` — IDB-backed `TeamMemory` store via `createIdbStore`
- [x] `extractAndStoreMemories` now routes via `categorizeHeuristic` → team bucket for brand/user/project/decision content, agent bucket otherwise
- [x] `ai-chat-panel.tsx` loads team memory alongside relationship graph (parallel `Promise.all`) and prepends `teamMemoryToPromptFragment(mem, 20)` to the per-agent context string
- [x] Agent context cap raised 2000 → 4000 chars; label changed to "TEAM & AGENT LIVING STATE"
- [x] `buildTeamAgentPrompt` gained an optional `teamMemory` param (kept for future formal-path callers)
- [x] Build + MCP build both green; CI + Vercel preview pass

**Follow-ups opened from PR review:**
- [x] **Swarm runner — wire team memory into `injectLivingState`.** Shipped in PR #534 alongside user-profile wiring — same injection runs once per swarm task now.
- [x] **Team Memory panel UI** — shipped in PR #536. Right-side sheet grouped by category with salience dots + hover-to-forget + manual add.
- [x] **Cloud sync for team memory** — shipped in PR #537 alongside profile sync. Migration 021 + `team-memory-sync.ts` with push-on-write + pull-on-file-load.

---

**Phase 1B.3: User Profile in Efecto (PR #532, merged Apr 18)**

Plumbing shipped — every agent now reads an `ABOUT THE USER` block, sourced from a local profile store.
- [x] New `lib/studio/user-profile-store.ts` — IDB-backed singleton using `createIdbStore` + core's `UserProfile` primitives
- [x] `buildSystemPrompt` gained optional `userProfileContext` param, injected universally (Jules solo AND team mode)
- [x] Extracted `wrapUntrustedContext()` helper — team/user context blocks now share sanitization logic (net LOC reduction)
- [x] API route sanitizes + forwards `userProfileContext`, capped at 1500 chars
- [x] `ai-chat-panel` loads profile in parallel with team context, passes through to the API
- [x] Build + type check clean; CI green; merged squash

**Follow-ups opened from PR review:**
- [x] **Profile form UI** — shipped in PR #535. Right-side sheet with all UserProfile fields, reachable from a UserCircle button in the team panel header.
- [x] **Swarm runner** — shipped in PR #534. `injectLivingState` now loads the profile and appends `userProfileToPromptFragment(profile)` to every swarm task prompt.
- [x] **Cloud sync** — shipped in PR #537. Migration 021 adds a singleton `user_profile` row per user, push-on-save + pull-on-file-load wired alongside team memory + living state.

---

**Phase 1B.4: Pixabots avatars in Efecto (PR #533, merged Apr 18)**

Custom pixabot pixel art now renders everywhere agents surface.
- [x] Server `agent_selected` SSE event emits `activeAgent.pixabotId`
- [x] `AgentInfo` + `TeamAssemblyAgent` carry optional `pixabotId`; propagated through `agent-team-panel.tsx` + `ai-chat-panel.tsx` to `getAvatarSrc(role, pixabotId, size)`
- [x] All five avatar render sites now set `unoptimized` + `style={{ imageRendering: 'pixelated' }}` so Pixabots URLs don't get blurred by Next/Image optimization at small sizes

---

**Phase 1B.5: Scale migration (cleanup) [DEFERRED]**

Decision Apr 18: leave as acceptable tech debt. No user-facing value, real risk to saved team data in IDB, and Efecto's local personality engine works correctly with 0-10 today. Core's scale-utils (`configToCore`, `configFromCore`) are ready whenever we revisit.

- ~~Replace `types.ts`, `personality-engine.ts`, `role-definitions.ts`, `team-presets.ts` with shims~~
- ~~Add `configToCore()` / `configFromCore()` at IDB boundary~~
- ~~Update the one UI label (`X/25 pts` in agent-team-panel.tsx:530)~~
- ~~Test with existing saved teams for no data loss~~

If we ever want to pick this up: `@designteam/core` already exports `configToCore`/`configFromCore`/`scaleToCore`/`scaleFromCore`. The migration would convert at the IDB load/save boundary, replace `lib/agent-builder/{types,personality-engine,role-definitions,team-presets}.ts` with re-export shims, and flip the "X/25 pts" UI label.

---

**Phase 1B.6: Decide on agent-skills-generated.ts (PR #540, resolved Apr 18)**

- [x] **Option A chosen** — Efecto's 8-role generator was shipping empty skill content for the 8 roles core adds (brand-strategist, design-engineer, marketing-strategist, motion-designer, print-designer, accessibility-specialist, content-strategist, seo-specialist).
- [x] `agent-skills-generated.ts` is now a one-line re-export from `@designteam/core`.
- [x] Deleted 8 `.md` source files (~260 lines) and the agent-builder section of `scripts/build-skills.mjs`.
- [x] MIGRATION.md updated.
- [x] Net diff: -587 / +13 — all 16 roles now get skill content.

### v0.9 — Autonomous Mode (`designteam run`)

Make the team work through a project autonomously — one command kicks off research, copy, design, review, ship.

**Phase 1: Planning (PR #18)**
- [x] `designteam plan "<description>"` — Haiku generates a dependency-ordered task graph. Injects roster + user profile + team memory into the prompt so plans reflect who the team actually is.
- [x] Plans saved to `.designteam/projects/<plan-id>.json` with tiny schema (id, description, createdAt, status, tasks[]).
- [x] `designteam plans` — newest-first list with task counts + progress.
- [x] `designteam show <plan-id>` — task graph with status glyphs, success criteria, and the "why".

**Phase 2: Execution via Claude Code**
- [ ] Skill template includes a "Running a project" section
  - Read the plan at `.designteam/projects/<id>.json`
  - For each ready task (deps done), invoke the matching agent via Task tool
  - After each task, run `designteam progress <project-id> <task-id> --done`
  - Auto-extract memories from the task output
- [x] `designteam progress` command — shipped in PR #21. Full task lifecycle (`todo | in_progress | in_review | done | blocked | cancelled`), auto-unblock of dependents, plan-complete bubble-up.
- [x] `designteam next <plan-id>` — shipped in PR #29. Picks the next ready task (todo, no live checkout, blockers terminal). `--id-only` for shell-scriptable output; exits 1 with no stdout when nothing's ready so loops terminate cleanly.
- [x] `designteam run <plan-id> <task-id>` — shipped in PR #30. Full end-to-end: atomic checkout → adapter dispatch → status transition → activity log emission. `--command=<shell>` shortcut creates an ephemeral `@designteam/adapter-local-script` on the fly. Error outcome releases the lock and leaves the task in_progress for human decision; terminal outcomes auto-release via `setTaskStatus`.

**Phase 3: Execution via API (true autonomy)**
- [ ] `designteam run <project-id>` — CLI invokes each agent via Anthropic API
  - Walks dependency graph (topological order)
  - Each agent gets: personality + memory + task context + deps output
  - Returns text output, saved to `.designteam/projects/<id>/outputs/<task-id>.md`
  - Auto-report XP + memory after each task
  - Gate behind `ANTHROPIC_API_KEY`

**Phase 4: Adapter interface**
- [ ] `DesignTeamAdapter` in core — same code works in Efecto, Claude Code, Cursor, Codex
- [ ] Efecto adapter (MCP bridge to design canvas, 64 design tools)
- [ ] Claude Code adapter (Task tool + file writes)
- [ ] REST adapter (generic HTTP)

### v0.10 — Web App Living State

- [x] **Team page shows mood + XP + level per agent** — shipped in PR #9. Mood emoji on avatar, level badge, XP progress bar sized to the current level band, task count underneath. Fetches `/api/teams/:id/state` in parallel with team metadata.
- [x] **Agent detail view** — shipped in PR #11. Click any agent card to open a right-side sheet with all 5 emotion bars, XP-to-next-level, memories grouped by type with salience dots, personality sliders (−5..+5 centered visualization), traits.
- [x] **Team memory viewer** — shipped in PR #10. New `GET /api/teams/:id/memory` + grouped section on the team page. Categories (brand/project/user/decision/fact), ordered by salience, source attribution.
- [x] **Project timeline** — shipped in PR #15. Migration 005 adds `task_events`, CLI `report` fires one row per outcome, team page renders a verb-driven timeline with relative timestamps. Every v0.10 bullet is now shipped.
- [x] **Relationship map visualization** — shipped in PR #12. Circular SVG graph on the team page: agents around a ring, edges colored by bond (foreground positive / muted neutral / red negative) with thickness proportional to collaboration count.

### v0.11 — Truly Autonomous (Cron-driven)

The Paperclip model — agents work while you sleep.

- [ ] Task queue in Supabase (pending tasks per team)
- [ ] Vercel cron wakes agents every N minutes
- [ ] Agents call LLM directly via Vercel AI Gateway
- [ ] Atomic task checkout (one agent per task)
- [ ] Token budgets with hard stops
- [ ] Audit trail (every decision logged)
- [ ] Real-time UI on designteam.app

### v0.12 — npm Package Cleanup

- [x] **Whitelist published files** — shipped in PR #13. `"files": ["cli", "README.md"]` + web-app deps moved to devDependencies. Tarball dropped from 8 MB / 241 files to 17 kB / 4 files (500× smaller).
- [x] **Package metadata** — shipped in PR #13. Added description, license, author, homepage, repository, keywords.
- [x] **GitHub Actions CI** — shipped in PR #14. Runs on PR + main push: pnpm test (417 tests), core type-check, full build. pnpm 9 + Node 24.
- [ ] Auto-publish on version tag (needs `NPM_TOKEN` secret configured first)

---

## v0.13 — Control Plane (paperclip-inspired)

**Why this exists:** the end state isn't "more CLI commands" — it's **automated design teams that create finished work for people**. Efecto is the first AI design agency built on Design Team. Its 7-phase product roadmap (front door → team view → quality gate → portfolio → delivery packaging → pricing shift → API) all depend on a control plane underneath that is more than a plan file and a Haiku call. That's what v0.13 builds.

Adopted from `paperclipai/paperclip` (MIT, Apr 2026). Their model is "open-source orchestration for zero-human companies." We want the same plumbing for creative studios — with personalities, moods, and memory the companies layer doesn't have.

### Cheap + visible (ship alongside existing work)

- [x] **AGENTS.md at repo root** — contributor orientation (PR #19). Read-order, repo map, engineering rules, invariants, PR checklist.
- [ ] **`doc/` hierarchy** — split the five root-level strategy docs (`VISION.md`, `DESIGN-TEAM-VISION.md`, `ROADMAP.md`, `TASKS.md`, `CLAUDE.md`) into paperclip's cleaner layout: `doc/GOAL.md`, `doc/PRODUCT.md`, `doc/SPEC.md`, `doc/SPEC-implementation.md`, `doc/DATABASE.md`, `doc/DEVELOPING.md`, `doc/execution-semantics.md`.
- [x] **`evals/` directory** — shipped in PR #25. Sandbox harness + two end-to-end scenarios: `plan-lifecycle` (checkout contention + auto-unblock + plan completion + activity log ordering) and `memory-routing` (categories persist + activity log captures each add). `pnpm eval` runner. LLM-dependent scenarios deferred until CI has `ANTHROPIC_API_KEY`.

### Execution infrastructure (unblocks the 7-phase Efecto roadmap)

- [x] **Activity log** — shipped in PR #23 (plan mutations) + PR #24 (extended to `team.recruit`, `team.fire`, `agent.report`, `agent.memory`, `memory.add`, `profile.update`, `cloud.sync`). Append-only `.designteam/activity.jsonl` via `emitActivity()`. `designteam activity [--tail=N]` CLI viewer. Cloud mirror to Supabase is a follow-up.
- [x] **Atomic checkout on plan tasks** — shipped in PR #22. `checkoutTask(plan, taskId, runId, {force})` / `releaseTask(...)` in `cli/plans.mjs`; `designteam checkout/release` CLI commands. Terminal transitions auto-release. `show` renders `held by <runId>`.
- [x] **Blockers vs parent/child** — shipped in PR #26. New `blockedByTaskIds` field (dependency — drives auto-unblock) distinct from optional `parentTaskId` (structure — work breakdown only). Legacy `dependencies` field transparently normalized on load via `getBlockers()`. Haiku plan prompt updated to emit `blockedByTaskIds` directly but still accepts the older vocabulary. Existing `plan-lifecycle` eval unchanged (proves legacy plans keep working).
- [x] **Task lifecycle states** — shipped in PR #21. Plan tasks now use `todo | in_progress | in_review | done | blocked | cancelled` (was `pending | in_progress | done | blocked`). Legacy `pending` auto-normalizes to `todo` on load. `designteam progress` command drives transitions with auto-unblock of dependents + plan-complete bubble-up.
- [ ] **Heartbeats + stranded-work recovery** — agents pulse while running; if the last run dies mid-task, the control plane queues one recovery wake; if that also fails, task auto-moves to `blocked` with a visible comment. *Prerequisite for v0.11 Phase 3 true API execution.*

### Safety + governance (before `designteam run` goes autonomous)

- [ ] **Budget hard-stop** — monthly UTC windows, soft alerts, hard limit auto-pauses work. A single bug in autonomous mode could burn through an API card overnight — this is the safety net we need **before** v0.11 Phase 3 ships.
- [ ] **Approval gates** — human checkpoints for governed actions. Maps to Efecto Phase 3 ("The Quality Gate") — Creative Director reviews every deliverable before the user sees it. Also covers: new hire proposals, large token-budget commits, publishing finished work.

### Distribution (v0.11 Phase 4 — proper scope)

- [x] **`adapter-plugin.md` spec at repo root** — shipped in PR #27. Public interface contract: `TaskAdapter.executeTask(ctx) → TaskResult` with outcomes mapping to `progress` status transitions; mutable registry for third-party registration; invariants (adapters never mutate plan state directly, must honor checkout locks + `ctx.signal`).
- [x] **`packages/adapter-utils/` shared interface** — shipped in PR #27. Types (`TaskAdapter`, `TaskContext`, `TaskResult`, `PlanTask`, `CostReport`) + mutable registry (`registerAdapter` / `resolveAdapter` / `listAdapters` / `unregisterAdapter` / `clearAdapters`) + 7 vitest cases. Peer-depends on `@designteam/core`.
- [ ] **`packages/adapters/` implementations** — one package per runtime: `@designteam/adapter-claude-local`, `@designteam/adapter-codex-local`, `@designteam/adapter-cursor-local`, `@designteam/adapter-gemini-local`, `@designteam/adapter-efecto`. Each implements `TaskAdapter`.
  - [x] **Reference adapter: `@designteam/adapter-local-script`** — shipped in PR #28. Shells out per task with `DT_*` env vars, maps exit code → outcome, honors `ctx.signal.aborted` + `timeoutMs`. 7 vitest cases cover exit codes, env-var surface, cancellation, construction guards. Proves the contract without an LLM dependency.
  - [ ] `@designteam/adapter-claude-local` — Claude Code consumer. Next.
  - [ ] `@designteam/adapter-efecto` — executes against Efecto's design MCP.
  - [ ] Remaining runtimes (cursor, codex, gemini, anthropic-api) — community-ownable once claude-local lands.

### Mapping: control-plane items → Efecto 7-phase roadmap

| Control plane item | Unlocks in Efecto |
|---|---|
| Activity log | Phase 2: live "team working" feed instead of loading spinner |
| Atomic checkout + lifecycle states | Phase 2: multiple agents visible working in parallel without collisions |
| Approval gates | Phase 3: Creative Director review before the user sees work |
| Heartbeats + recovery | Phase 4: portfolio of projects that survive restarts/crashes |
| Budget hard-stop | Phase 6: project-based pricing economics (can't blow margin) |
| Adapters monorepo | Phase 7: "Design as a Service" API, white-label, Slack/Zapier |

---

## Efecto UI Polish (track alongside v0.8 integration)

Small cosmetic fixes in Efecto that don't block integration but should ship as part of the overall polish pass.

- [x] **Edge padding** — shipped in PR #539. Floating panels drop from `left-4`/`right-4`/`bottom-4` to `-2`; tool sidebar `SNAP_MARGIN` 16→8. Toolbar-clearance `top-16` unchanged.
- [x] **Chat message typography inconsistency** — shipped in PR #538. `MarkdownMessage` + the collapsed-preview wrappers are now `text-xs`, matching user bubbles and surrounding chrome.

---

## Future

### Unify Efecto + designteam.app living-state schemas
- [ ] Reconcile `agent_living_state` (Efecto) vs `agent_states` (designteam) tables
- [ ] Decide on canonical schema — prefer normalized (designteam) for queryability
- [ ] Backfill migration for existing Efecto users
- [ ] Same team works identically in CLI and Efecto without re-sync

### Agent Marketplace
- [ ] Public agent profiles on designteam.app
- [ ] Share/fork custom agents (not just teams)
- [ ] Custom agent creation (beyond the 16 roles)
- [ ] Agent marketplace — browse and hire community-built agents

### Voice & Vision
- [ ] Voice check-ins (spoken updates from the team)
- [ ] Screen sharing — agents watch you work, learn your taste
- [ ] Video outputs (animated team updates)

---

## The Vision

**Design Team is the operating system for AI creative studios.**

You hire a team. They have personalities you customize. They remember everything — about your brand, your business, each other. They work autonomously on projects, handing off to each other based on skill. They level up based on what they do. They're yours.

One AI gives you one opinion. A team gives you a studio. A studio that remembers.

### The end state: automated design teams that create stuff for people

A team isn't the product. A team is what **ships** the product. The product is **finished work delivered to a customer**: a brand, a landing page, a campaign, a deck. Someone pays for that outcome. The team, its memories, its relationships, its XP — they're the infrastructure.

**Efecto is the first agency built on Design Team.** Its 7-phase product arc is the proof:
1. **The Front Door** — project kickoff flow, not a blank canvas
2. **The Team View** — you watch the team work (not a loading spinner)
3. **The Quality Gate** — Creative Director reviews before you see drafts
4. **The Portfolio** — projects dashboard, brand kits accumulate, agents remember per-brand
5. **Delivery Packaging** — download entire campaigns as one handoff
6. **Pricing Shift** — projects, not seats. $99 brand, $49 landing page
7. **The API** — Design as a Service. Slack, CI/CD, Zapier, white-label

Everything in **v0.13 Control Plane** (above) exists to make those phases real. Activity log → live team view. Atomic checkout → parallel execution without collisions. Approval gates → quality gate. Heartbeats → portfolio that survives restarts. Budget hard-stop → margin-safe pricing. Adapters → the Design-as-a-Service API.

**Paperclip is for AI companies. Design Team is for AI creative studios. The difference is personality, taste, and the human moment at the end when someone sees their brand for the first time.**

---

## Notes

- Core package: `packages/core/` — 17 source files, **417 tests** (as of PR #18)
- Personality scale: -5 to +5 (0 = neutral). Efecto uses 0-10 (scale-utils bridges)
- Pixabots: `@pixabots/core` npm. API at `pixabots.com/api/pixabot/{id}`
- Local state: `.designteam/` in project root
- Cloud state: Supabase via `designteam sync`. Tables: `teams`, `agent_states`, `team_relationships`, `team_memory`, `user_profile`, `task_events`
- Vercel: designteam (auto-deploys from main)
- Latest npm: `@designteam/core@0.3.1`, `designteam@0.5.1`
- Contributor guide: `AGENTS.md` at repo root (PR #19)
