# Design Team — Roadmap

**Last updated**: 2026-04-15

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
- [x] `designteam roster` — team with mood, level, XP, last active
- [x] `designteam status` — energy/morale/friction bars
- [x] `designteam check <name>` — deep dive (personality, memories, relationships)
- [x] `designteam recruit [role]` — hire agents
- [x] `designteam fire <name>` — remove agents
- [x] `designteam report <name>` — XP, emotions, memories, collaborations
- [x] `designteam refresh` — regenerate skill with live state
- [x] Local state persistence (`.designteam/` directory)
- [x] Dynamic skill generation (mood, memories, level, conviction injected into SKILL.md)
- [x] Self-reporting protocol (skill instructs agents to run `npx designteam report`)
- [x] Combined flags (`--completed --approved --memory` in one call)
- [x] Decay on read (emotions, memories, bonds drift on every CLI read)

### v0.3 — Pixabots Avatars (PR #3, merged Apr 15)
- [x] Pixabots API integration (all agents render as pixel-art characters)
- [x] Per-role stable pixabotIds (consistent identity across the app)
- [x] Per-agent custom pixabotId (set on creation, customizable)
- [x] PixabotEditor in personality sheet (per-part controls + shuffle)
- [x] Recruitment preview (random on mount, shuffle button, keeps ID on recruit)
- [x] All Image components: `unoptimized` + `imageRendering: pixelated`
- [x] Homepage hero with stable pixabot characters

---

## Up Next

### v0.4 — Use `@pixabots/core` from npm
- [ ] Replace hand-rolled `randomPixabotId()` in `packages/core/src/types.ts` with `import { randomId } from '@pixabots/core'`
- [ ] Replace `PIXABOT_PARTS` ranges in `personality-editor.tsx` with `import { PARTS, partCount } from '@pixabots/core'`
- [ ] Use `seededId(agentId)` for deterministic default avatars (same agent ID = same pixabot, no randomness)
- [ ] Use `isValidId()` for validation when loading from Supabase/JSON
- [ ] Export `PIXABOT_PART_RANGES` from core types so everything uses one source
- [ ] Explore animated GIF API (`?animated=true`) — show on hover in team cards?

### v0.5 — Cloud Persistence (Supabase)
- [ ] `agent_states` table (team_id, agent_id, emotions, memories, xp, level)
- [ ] `team_relationships` table (team_id, relationships jsonb)
- [ ] Supabase migration files
- [ ] `designteam login` — Supabase auth
- [ ] `designteam sync` — push/pull state to cloud
- [ ] Auto-sync on report if logged in
- [ ] `designteam pull` — set up on new machine

### v0.6 — Web App Living State
- [ ] Team page shows mood, XP, memories, level per agent
- [ ] Agent detail view (full emotion bars, all memories, relationships)
- [ ] Team health dashboard (energy/morale/friction bars)
- [ ] Relationship map visualization (nodes + edges)
- [ ] Project timeline (task history)

### v0.7 — Efecto Integration
- [ ] Replace Efecto's `lib/agent-builder/` with `@designteam/core` dependency
- [ ] Update 6 `agent-team-*.ts` files to import from core
- [ ] Scale migration at IDB persistence boundary
- [ ] Verify Efecto builds

### v0.8 — npm Package Cleanup
- [ ] Add `.npmignore` to CLI package (currently ships 8.5MB with images/tests/source)
- [ ] Should ship: `cli/`, `skills/`, `package.json`, `README.md` (~50KB)
- [ ] Add GitHub Actions CI (test on PR, build check)
- [ ] Auto-publish on version tag

---

## Future

### Paperclip Patterns
- [ ] Goal hierarchy — tasks trace to user intent via parentId chain
- [ ] Per-agent token budget tracking with soft/hard limits
- [ ] Audit trail — log decisions with run ID linkage
- [ ] Atomic task checkout — one agent per task, conflict prevention
- [ ] Curated context generation — compact, relevant context per task

### Adapter System
- [ ] `DesignTeamAdapter` interface in core
- [ ] Efecto adapter (MCP bridge, 64 design tools)
- [ ] Claude Code adapter (skills + self-reporting)
- [ ] Codex adapter
- [ ] Generic REST adapter

### Agent Marketplace
- [ ] Public agent profiles on designteam.app
- [ ] Share/fork custom agents (not just teams)
- [ ] Custom agent creation (beyond the 16 roles)
- [ ] Agent marketplace — browse and hire community-built agents

---

## Notes

- Core package: `packages/core/` — 17 source files, 307 tests
- Personality scale: -5 to +5 (0 = neutral). Efecto uses 0-10 (scale-utils bridges them)
- Pixabots: use `@pixabots/core` npm package. API at `https://pixabots.com/api/pixabot/{id}`
- Local state: `.designteam/` in project root
- Supabase: vunmdnoervxpcvgiaamz
- Vercel: designteam (auto-deploys from main)
