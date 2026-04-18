# Design Team — Roadmap

**Last updated**: 2026-04-16

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

**Phase 1B.1: Cloud Sync in Efecto [next priority]**

Today: Efecto stores living state in browser IDB. Close browser = fresh agents.
Goal: Efecto syncs to Supabase. Agents survive browsers, devices, reinstalls.

- [ ] Add `syncLivingStateToCloud(team)` — calls `PUT /api/teams/:id/state` on designteam.app
  - Reads IDB, converts to the API shape (same as CLI sends)
  - Called after each `extractAndStoreMemories` fires (or debounced)
- [ ] Add `pullLivingStateFromCloud(team)` — on team load, fetches `/state`, merges into IDB
  - Conflict resolution: cloud wins if `last_active_at` is newer, otherwise local wins
- [ ] Store Efecto team's `short_id` so sync knows the remote target
- [ ] Manual trigger UI: a "Sync" button in the agent team panel
- [ ] Auto-sync on idle or team-panel close
- [ ] Handle 401/network errors gracefully

**Files to touch:**
- `lib/studio/agent-team-living-state.ts` (add sync wrappers)
- `lib/studio/agent-team-sync.ts` (already exists — check what it does)
- `components/studio/agent-team-panel.tsx` (UI trigger)
- `lib/studio/agent-team-chat-hooks.ts` (fire-and-forget sync after memory extraction)

---

**Phase 1B.2: Team Memory in Efecto**

Today: Efecto has per-agent memory. No shared team knowledge.
Goal: Agents read shared brand/user/project context before every response.

- [ ] Add team memory storage (separate IDB store or extend existing)
- [ ] Wire `teamMemoryToPromptFragment()` into system prompt builder
- [ ] Use auto-extract to route memories: agent bucket vs team bucket
  - Requires `ANTHROPIC_API_KEY` for AI path, heuristic fallback otherwise
- [ ] UI: a "Team Memory" tab/section in the agent team panel
  - Shows grouped memories (brand/project/user/decision/fact)
  - Manual add button: "Remember this..."

**Files to touch:**
- `lib/studio/agent-team-living-state.ts` (team memory persistence)
- `lib/studio/agent-team-prompt-builder.ts` (inject team memory)
- `lib/studio/agent-team-chat-hooks.ts` (auto-extract routing)
- `components/studio/agent-team-panel.tsx` (UI)

---

**Phase 1B.3: User Profile in Efecto**

Today: Agents don't know who the user is or what the business does.
Goal: Every agent prompt includes the user profile.

- [ ] Small form/panel: business, industry, audience, voice, style, brand colors
- [ ] Stored locally (settings/prefs) + synced to Supabase if logged in
- [ ] Injected into agent system prompt via `userProfileToPromptFragment()`
- [ ] One-time onboarding prompt: "Tell your team about you" for new users

**Files to touch:**
- New: `components/studio/user-profile-panel.tsx`
- `lib/studio/agent-team-prompt-builder.ts` (inject profile)
- `lib/settings/` (or equivalent) for storage

---

**Phase 1B.4: Pixabots avatars in Efecto**

Today: Efecto shows static robot PNGs.
Goal: Pixel-art Pixabots matching designteam.app.

- [ ] Wire agent rendering to `pixabotUrlForRole()` from core
- [ ] Show per-agent pixabot using `agent.pixabotId` if present
- [ ] Ensure `unoptimized` + `image-rendering: pixelated` on all pixabot `<Image>`s

**Files to touch:**
- `components/studio/agent-team-panel.tsx`
- Wherever else agent avatars render (inspector, chat messages)

---

**Phase 1B.5: Scale migration (cleanup)**

Last because it's pure plumbing — no user-facing value.

- [ ] Replace `types.ts`, `personality-engine.ts`, `role-definitions.ts`, `team-presets.ts` with shims
- [ ] Add `configToCore()` / `configFromCore()` at IDB boundary
- [ ] Update the one UI label (`X/25 pts` in agent-team-panel.tsx:530)
- [ ] Test with existing saved teams for no data loss

---

**Phase 1B.6: Decide on agent-skills-generated.ts**

- [ ] Option A: remove Efecto's generator, use core's 16-role version
- [ ] Option B: keep generator, accept duplication
- [ ] Document decision in MIGRATION.md

### v0.9 — Autonomous Mode (`designteam run`)

Make the team work through a project autonomously — one command kicks off research, copy, design, review, ship.

**Phase 1: Planning**
- [ ] `designteam plan "design a landing page"` — Haiku generates a task graph
  - Nova (Creative Director) is the planner — uses team memory + user profile
  - Each task has: agent role, instruction, dependencies, success criteria, "why chain"
  - Saved to `.designteam/projects/<project-id>.json`
- [ ] `designteam plans` — list all project plans (active + completed)
- [ ] `designteam show <project-id>` — view the task graph, status per task

**Phase 2: Execution via Claude Code**
- [ ] Skill template includes a "Running a project" section
  - Read the plan at `.designteam/projects/<id>.json`
  - For each ready task (deps done), invoke the matching agent via Task tool
  - After each task, run `designteam progress <project-id> <task-id> --done`
  - Auto-extract memories from the task output
- [ ] `designteam progress` command — update task status in the plan file

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

- [ ] Team page shows mood, XP, memories, level per agent
- [ ] Agent detail view (full emotion bars, all memories, relationships)
- [ ] Team memory viewer (brand, project context, user preferences)
- [ ] Project timeline (task history, who did what, outcomes)
- [ ] Relationship map visualization

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

- [ ] Add `.npmignore` (ship only `cli/`, `skills/`, `package.json`, `README.md`)
- [ ] GitHub Actions CI (test on PR, build check)
- [ ] Auto-publish on version tag

---

## Efecto UI Polish (track alongside v0.8 integration)

Small cosmetic fixes in Efecto that don't block integration but should ship as part of the overall polish pass.

- [ ] **Edge padding** — chrome containers (tools panel, layers list, inspector, topbar, toolkit) currently use `pl-4 pr-4`. Tighten to `p-2` so panels sit closer to the browser edge.
  - Files: `components/studio/tool-sidebar.tsx`, layers panel, inspector panel, topbar
- [ ] **Chat message typography inconsistency** — some agent chat messages render `<p>` with larger font than surrounding messages. Normalize to a single text-size class across all message body `<p>` elements.
  - Example: the handoff message `"Nova → Design"` has the right `text-[10px]` header but the body `<p>` inherits a larger default. Force the body to `text-xs` or whatever the standard chat message size is.
  - File: `components/studio/ai-chat-panel.tsx` (chat message renderer)

---

## Future

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

**Paperclip is for AI companies. Design Team is for AI creative studios.**

---

## Notes

- Core package: `packages/core/` — 17 source files, 307 tests
- Personality scale: -5 to +5 (0 = neutral). Efecto uses 0-10 (scale-utils bridges)
- Pixabots: `@pixabots/core` npm. API at `pixabots.com/api/pixabot/{id}`
- Local state: `.designteam/` in project root
- Cloud state: Supabase (vunmdnoervxpcvgiaamz) via `designteam sync`
- Vercel: designteam (auto-deploys from main)
- Latest npm: `@designteam/core@0.1.1`, `designteam@0.3.3`
