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

## Up Next

### v0.6 — The Memory Loop [current priority]

**The vision**: Agents, teams, and users all have growing memory that flows into every interaction. Nothing is lost. Everything the team learns about the user, the brand, the project — it all sticks.

**What's missing today**:
- Agents have individual memories, but the TEAM has no shared context
- No USER/PROJECT profile — the team doesn't "know" the user
- Memory capture is manual (`designteam report --memory "..."`)
- No memory queries — agents can't recall relevant memories before working

**What to build**:

- [ ] **Team memory** — shared knowledge every agent can read
  - Brand guidelines (colors, voice, typography preferences)
  - Project constraints (audience, deadlines, tech stack)
  - Past decisions ("we tried dark mode, user didn't like it")
  - New table: `team_memory` with `{team_id, category, content, salience, created_at}`
  - CLI: `designteam remember "our brand uses warm earth tones"`
  - CLI: `designteam recall "brand colors"`
- [ ] **User profile** — who the user is, what they care about
  - Business name, industry, goals, target audience
  - Style preferences, voice/tone, design taste
  - Track record (what they've approved/rejected)
  - New table: `user_profiles` (when logged in) or `.designteam/user.json` (local)
  - CLI: `designteam profile` — view/edit your profile
  - CLI: `designteam profile set business "Acme Co, B2B SaaS, devs"`
- [ ] **Auto-memory extraction** — stop making users type `--memory`
  - After each `designteam report`, AI extracts what was learned
  - Uses Haiku (cheap, fast) to summarize the task outcome
  - Categorizes: user preference, brand fact, project context, skill growth
  - Stores in agent memory + team memory based on category
- [ ] **Memory injection in skills** — richer context per agent
  - Dynamic skill already injects agent's own memories
  - Also inject: team memory, user profile, relevant project context
  - Query-based: "agent working on hero section" → pull memories about hero patterns
- [ ] **`designteam recall`** — query memories across the whole team
  - `designteam recall "dark theme"` → returns all memories across agents + team + user
  - Sorted by salience + recency
  - Optional: `--agent Scout` to scope to one agent

### v0.7 — Autonomous Mode (`designteam run`)

Make the team work through a project autonomously within Claude Code.

- [ ] **`designteam plan "design a landing page"`** — creates task graph
  - Nova (Creative Director) breaks the goal into tasks with dependencies
  - Each task has: role assignment, parent task, success criteria, "why chain"
  - Saved to `.designteam/projects/<id>.json`
- [ ] **`designteam run <project-id>`** — executes the plan
  - Walks the task graph in dependency order
  - Invokes each agent (via Claude Code Task tool or API)
  - Auto-reports completion after each task
  - Extracts memories automatically
  - Shows progress as it goes
- [ ] **Adapter interface** — same code works in Efecto, Claude Code, Cursor, Codex
  - `DesignTeamAdapter` in core
  - Efecto adapter: MCP bridge, 64 design tools
  - Claude Code adapter: Task tool, file writes
  - Codex/Cursor: skills + state injection

### v0.8 — Web App Living State

- [ ] Team page shows mood, XP, memories, level per agent
- [ ] Agent detail view (full emotion bars, all memories, relationships)
- [ ] Team memory viewer (brand, project context, user preferences)
- [ ] Project timeline (task history, who did what, outcomes)
- [ ] Relationship map visualization

### v0.9 — Truly Autonomous (Cron-driven)

The Paperclip model — agents work while you sleep.

- [ ] Task queue in Supabase (pending tasks per team)
- [ ] Vercel cron wakes agents every N minutes
- [ ] Agents call LLM directly via Vercel AI Gateway
- [ ] Atomic task checkout (one agent per task)
- [ ] Token budgets with hard stops
- [ ] Audit trail (every decision logged)
- [ ] Real-time UI on designteam.app

### v0.10 — Efecto Integration

- [ ] Replace Efecto's `lib/agent-builder/` with `@designteam/core`
- [ ] Update Efecto's agent-team-*.ts files
- [ ] Efecto adapter using MCP

### v0.11 — npm Package Cleanup

- [ ] Add `.npmignore` (ship only `cli/`, `skills/`, `package.json`, `README.md`)
- [ ] GitHub Actions CI (test on PR, build check)
- [ ] Auto-publish on version tag

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
