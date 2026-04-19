# Design Team — Task Board

**Last updated**: 2026-04-19 (v0.13 effectively done — adapter-efecto V1 shipped in PR #43, soft budget warning in PR #41, runSubprocess extraction in PR #44, `designteam adapters` CLI in PR #45; only first-publish dry-run + community runtime adapters remain open)
**Current phase**: v0.13 finish line → v0.14 scoping

> ROADMAP.md is the source of truth for _what's shipped_. This file is
> the scratch board for _open work items not yet promoted to a PR_.
> If a task here disagrees with ROADMAP.md, ROADMAP wins.

---

## How to use this file

- New work: add under `## Open`, give it a `T-###` id, note the owner if any.
- Picked up: change `[todo]` → `[in-progress]`, add your name.
- Finished: delete the line here and flip the corresponding ROADMAP bullet to `[x]` with the PR link. This file stays short — ROADMAP is the ledger.
- Discovered mid-flight: drop under `## Discovered` with enough context to route later.

---

## Open

### v0.13 — Control Plane (finish line)

- [todo] **T-811** `@designteam/adapter-efecto` V2 — the autonomous LLM+MCP tool-use loop. V1 (session creator) shipped in PR #43. V2 spawns Anthropic API with Efecto's MCP tools in a tool-use loop so assigned tasks actually produce design work without a human. Blocks v0.11 Phase 4 ("Design as a Service") and Efecto Phase 7.
- [todo] **T-812** `@designteam/adapter-codex-local` — wraps the local `codex` CLI the same way adapter-claude-cli wraps `claude`. With `runSubprocess` hoisted into adapter-utils (PR #44) this is ~30 LOC of spawn config. Community-ownable.
- [todo] **T-820** `@designteam/adapter-cursor-local` — spawns cursor-agent for a task. Community-ownable.
- [todo] **T-821** `@designteam/adapter-gemini-local` — Gemini CLI wrapper. Community-ownable.
- [todo] **T-830** First publish dry-run — push a `v0.13.0-rc` tag after `NPM_TOKEN` is set on the repo. Verify `scripts/publish-if-changed.sh` rewrites `workspace:*` → real versions across all six packages + CLI.

### v0.14 — Efecto Schema Reconciliation

- [todo] **T-900** Reconcile `agent_living_state` (Efecto) vs `agent_states` (designteam) Supabase tables — prefer the normalized designteam shape for queryability.
- [todo] **T-901** Backfill migration for existing Efecto users (map old jsonb blob → new columns).
- [todo] **T-902** End-to-end verification: same team works identically in CLI and Efecto without a re-sync.

### Future (roadmap stubs — don't start without scoping)

- [todo] **T-910** Public agent profiles on designteam.app.
- [todo] **T-911** Custom agent creation beyond the 16 built-in roles.
- [todo] **T-912** Agent marketplace — browse and hire community-built agents.
- [todo] **T-920** Voice check-ins (spoken updates from the team).
- [todo] **T-921** Screen sharing — agents watch you work, learn your taste.

---

## Discovered

> Add new tasks here when they surface mid-flight. Move to the right
> section with an ID once they're real.

- [todo] Schema divergence caveat lives in Efecto's memory (noted 2026-04-15): Efecto's `agent_living_state` table stores emotions+memory+xp as a single `state` jsonb blob; designteam's `agent_states` table normalizes them into columns. A migration is needed before the two products can share a backend. T-900/T-901/T-902 above track it.

---

## Notes

- Core package: `packages/core/` — MIT, ~560 LOC + tests, 135 KB ESM.
- Adapters: `packages/adapter-utils` (contract) + `packages/adapter-local-script`, `packages/adapter-claude-cli`, `packages/adapter-anthropic-api` (reference implementations).
- Personality scale: core uses -5/+5. Efecto uses 0-10. `scale-utils.ts` bridges.
- Local state: `.designteam/` in project root (team.json, state/\*.json, relationships.json, activity.jsonl, projects/\*.json, budget.json + budget.jsonl).
- Supabase project: vunmdnoervxpcvgiaamz.
- Vercel project: designteam (connected to designteam.app).
