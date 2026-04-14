# Design Team — Task Board

**Last updated**: 2026-04-13
**Current phase**: Phase 3 — The Living Loop

> Agents: update this file when you pick up a task, finish a task, or discover new work.
> Format: `[status] Task name` where status is `todo`, `in-progress`, `done`, or `blocked`.

---

## Phase 1: Extract @designteam/core [DONE]

- [done] Monorepo scaffolding (pnpm-workspace.yaml, packages/core/, tsup build)
- [done] Port 16 source files (types, personality, emotions, memory, relationships, messaging, swarm, roles, presets, composition, skills, ai-builder, export, scale-utils)
- [done] 275 tests across 11 files, all passing
- [done] Wire Design Team app — all src/lib/agent-builder/*.ts are re-export shims
- [done] Next.js build passes with workspace dependency

## Phase 2: Tamagotchi CLI [DONE]

- [done] Local state persistence (cli/state.mjs, .designteam/ directory)
- [done] CLI commands: roster, status, check, recruit, fire
- [done] Existing commands (create, install) now save local state + init living states
- [done] Code review cleanup — all duplication removed, CLI imports from @designteam/core

---

## Phase 3: The Living Loop

The tamagotchi systems exist but nothing triggers them. Agents are frozen at Level 1 with no memories forever. This phase makes them alive.

### 3.1 Report Command — How Agents Update Their State

- [todo] **T-200** `designteam report <name> --completed` — mark task done
  - Awards +10 XP
  - Fires `work_completed` emotional event
  - Updates `lastActiveAt`
  - Writes state to `.designteam/state/<id>.json`
- [todo] **T-201** `designteam report <name> --approved` — work was accepted
  - Awards +25 XP (on top of completed)
  - Fires `work_approved` emotional event
  - Increments `tasksApproved`
  - If agent leveled up, print congratulation
- [todo] **T-202** `designteam report <name> --rejected` — work needs revision
  - Fires `work_rejected` emotional event
  - No XP bonus (they already got +10 from completed)
- [todo] **T-203** `designteam report <name> --memory "learned something"` — add a memory
  - Calls `addMemory()` with type inferred from content (design_preference, feedback, project_context)
  - Default salience 0.7, feedback salience 0.85
- [todo] **T-204** `designteam report <name> --collab <other-name>` — record collaboration
  - Calls `recordCollaboration()` on the relationship graph
  - Flag `--successful` for approved joint work
- [todo] **T-205** Apply emotional decay on every CLI read
  - When roster/status/check loads state, apply `applyEmotionalDecay()` based on hours since `lastActiveAt`
  - Apply `decayMemories()` based on days since last relevant
  - Apply `decayRelationships()` based on days since last interaction
  - Write decayed state back (so decay is continuous, not just on report)

### 3.2 Dynamic Skills — Skills That Carry Live State

- [todo] **T-210** Create `cli/generate-skill.mjs` — generates SKILL.md from live team state
  - Reads `.designteam/team.json` and `.designteam/state/*.json`
  - For each agent: injects personality fragment, current mood, top 5 memories, conviction level, experience level
  - Includes reporting instructions: "After completing work, run: `designteam report <name> --completed`"
  - Includes memory instructions: "If you learn something about the user's preferences, run: `designteam report <name> --memory 'what you learned'`"
- [todo] **T-211** `designteam install` regenerates skill from live state (not static template)
  - Calls `generate-skill.mjs` instead of the old `generateSkillFile` template
  - Overwrites `.claude/skills/designteam-<id>/SKILL.md`
- [todo] **T-212** `designteam refresh` — regenerate skill file with latest state
  - Same as install but doesn't need a team-id
  - Use case: after agents gain XP and memories, refresh their skill to reflect growth
- [todo] **T-213** Skill includes self-reporting protocol
  - Instructions for the agent to update its own state via CLI after work
  - Example: "When you finish a task, run `designteam report Pixel --completed` and if the user approved, run `designteam report Pixel --approved`"
  - Example: "If you learn a design preference, run `designteam report Pixel --memory 'user prefers dark themes'`"

### 3.3 Level-Up Experience

- [todo] **T-220** Print level-up notification when XP crosses threshold
  - In `designteam report --completed/--approved`, check if `xpToLevel(newXp) > oldLevel`
  - Print: "Pixel leveled up! Level 2 — they'll take more initiative now."
- [todo] **T-221** Level affects skill output
  - `levelToPromptFragment()` already exists in core
  - Dynamic skill generation injects it: L1-3 = developing, L4-6 = experienced, L7+ = veteran
- [todo] **T-222** Mood affects skill output
  - `emotionToPromptFragment()` already exists in core
  - Dynamic skill injects current mood guidance (fired-up = push boundaries, cautious = ask questions)

---

## Phase 4: Publish & Distribution

### 4.1 npm Publish

- [todo] **T-300** Add README.md to packages/core/ (shows on npm page)
  - Brief description, install command, basic usage, link to designteam.app
- [todo] **T-301** Publish `@designteam/core` to npm
  - `cd packages/core && pnpm publish --access public`
  - Verify: `npm view @designteam/core`
- [todo] **T-302** Publish `designteam` CLI to npm
  - Change root `@designteam/core` dependency from `workspace:*` to actual version
  - `pnpm publish` at root
  - Verify: `npx designteam --help` works from a fresh directory
- [todo] **T-303** Add GitHub Actions CI
  - Run `pnpm --filter @designteam/core test` on PR
  - Run `pnpm build` on PR
  - Optional: auto-publish on version tag

### 4.2 Skills Update

- [todo] **T-310** Update the 17 skills/*.md files to reference live state
  - Add "State Management" section with report commands
  - Keep static personality as fallback when no .designteam/ exists
- [todo] **T-311** Update `.claude/agents/` and `.claude/commands/` to use core types
  - Creative director agent should reference team state
  - `/ship` command should trigger report --completed for all agents

---

## Phase 5: Cloud Persistence (Supabase)

### 5.1 Schema

- [todo] **T-400** Design `agent_states` table
  - `id` uuid PK, `team_id` FK, `agent_id` text, `role` text
  - `emotions` jsonb, `memories` jsonb, `xp` int, `level` int
  - `tasks_completed` int, `tasks_approved` int
  - `last_active_at` timestamptz
  - UNIQUE(team_id, agent_id)
- [todo] **T-401** Design `team_relationships` table
  - `id` uuid PK, `team_id` FK UNIQUE
  - `relationships` jsonb
- [todo] **T-402** Create Supabase migration files
- [todo] **T-403** Add RLS policies (owner read/write, public read for shared teams)

### 5.2 Sync

- [todo] **T-410** `designteam login` — authenticate with Supabase (GitHub OAuth or magic link)
  - Store auth token in `~/.designteam/config.json`
- [todo] **T-411** `designteam sync` — push local state to cloud, pull cloud state to local
  - Conflict resolution: latest `lastActiveAt` wins per agent
  - Prints: "Synced 4 agents to cloud. Pixel gained 2 levels since last sync."
- [todo] **T-412** Auto-sync on `designteam report` if logged in
  - After updating local state, push to Supabase in background
- [todo] **T-413** `designteam pull` — pull team + state from cloud to local
  - For setting up on a new machine

---

## Phase 6: Web App — Living State UI

### 6.1 Agent Profiles

- [todo] **T-500** Team page (`/team/[id]`) shows living state
  - Mood emoji + label next to agent name
  - XP bar with level
  - Top 3 memories
- [todo] **T-501** Agent detail view (expand card or `/team/[id]/agent/[name]`)
  - Full emotion breakdown (5 bars)
  - All memories with salience indicators
  - Conviction percentage
  - Relationship list with synergy scores
- [todo] **T-502** Team health dashboard on team page
  - Energy/morale/friction bars (same as CLI `status`)
  - Team tension analysis
  - Synergy highlights

### 6.2 Relationship Map

- [todo] **T-510** Visual relationship graph
  - Nodes = agents (with avatar, mood emoji)
  - Edges = relationships (thickness = synergy score, color = bond level)
  - Hover shows: collabs count, success rate, shared insights
- [todo] **T-511** Project timeline
  - List of tasks completed by the team
  - Who worked on what, when, approval status

---

## Phase 7: Efecto Integration

- [todo] **T-600** Publish @designteam/core to npm (blocked by Phase 4)
- [todo] **T-601** Add `@designteam/core` as dependency in Efecto's package.json
- [todo] **T-602** Replace Efecto's `lib/agent-builder/` with re-exports from @designteam/core
- [todo] **T-603** Update Efecto's 6 `agent-team-*.ts` files to import from @designteam/core
- [todo] **T-604** Use `configToCore()`/`configFromCore()` at IDB persistence boundary
  - Migrate existing saved teams from 0-10 to -5/+5 scale on read
- [todo] **T-605** Verify: `pnpm build` + `cd mcp && pnpm build` in Efecto

---

## Phase 8: Paperclip Patterns

### 8.1 Goal Hierarchy

- [todo] **T-700** Add `Goal` type to core (id, title, parentId, ownerAgentId, status)
- [todo] **T-701** Every SwarmTask gets a `goalId` linking to user intent
- [todo] **T-702** "Why chain" — trace any task back to the original user request

### 8.2 Token Budgets

- [todo] **T-710** Add `AgentBudget` type (monthlyCents, spentCents, softLimit, hardLimit)
- [todo] **T-711** Track token usage per agent in living state
- [todo] **T-712** Soft warning when approaching limit, hard stop when exceeded
- [todo] **T-713** `designteam budget` CLI command — show per-agent spend

### 8.3 Audit Trail

- [todo] **T-720** Add `AuditEntry` type (agentId, action, entityType, details, timestamp)
- [todo] **T-721** Log every state mutation (task complete, memory add, emotion change)
- [todo] **T-722** `designteam log <name>` — show agent's activity log
- [todo] **T-723** `designteam log` — show team-wide activity

### 8.4 Atomic Task Checkout

- [todo] **T-730** Add `executionRunId` to SwarmTask — prevents concurrent agents on same task
- [todo] **T-731** Checkout function with conflict detection (409-style)

---

## Phase 9: Adapter System

### 9.1 Interface

- [todo] **T-800** Define `DesignTeamAdapter` interface in core
  ```
  interface DesignTeamAdapter {
    type: string
    execute(agent, task, context): Promise<TaskResult>
    getCapabilities(): AdapterCapabilities
  }
  ```
- [todo] **T-801** Define `TaskResult` type (output, tokensUsed, toolCalls, status)
- [todo] **T-802** Define `AdapterCapabilities` (canDesign, canCode, canResearch, tools[])

### 9.2 Built-in Adapters

- [todo] **T-810** Efecto adapter — MCP bridge, 64 design tools
- [todo] **T-811** Claude Code adapter — agent as skill, CLI reporting
- [todo] **T-812** Codex adapter — agent as task
- [todo] **T-813** Generic REST adapter — HTTP API for custom integrations

---

## Discovered During Work

> Add new tasks here as they're found. Move them to the right section later.

_(none yet)_

---

## Notes

- Core package: `packages/core/` — 16 source files, 275 tests, 135KB ESM
- Personality scale: core uses -5 to +5. Efecto uses 0-10. `scale-utils.ts` bridges them.
- Local state: `.designteam/` in project root (team.json, state/*.json, relationships.json)
- Supabase project: vunmdnoervxpcvgiaamz (org: dwokmbqfzmfevmjhfexd)
- Vercel project: designteam (connected to designteam.app)
