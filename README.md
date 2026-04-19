# Design Team

Your AI design crew that ships. Not just pretty pictures — research, strategy, copy, design, code, review, deploy.

Hire agents with personalities. They remember your brand, learn your taste, bond with each other, and grow with use. Think tamagotchi meets agency — now with a paperclip-style control plane so agents can work autonomously on a plan while you sleep.

## Install

```bash
# Full skill set for Claude Code, Cursor, Codex, Windsurf — any skills.sh-compatible tool
npx skills add pablostanley/designteam-app

# Or install a specific team by ID
npx designteam install <team-id>
```

## Visual Team Builder

Build, chat with, and share teams at **[designteam.app](https://designteam.app)**. Every team gets a public page that shows mood, XP, memories, relationships, and a project timeline of what the team has actually done.

## What You Get

### The crew
- **16 agent roles** — researcher, copywriter, graphic designer, UX designer, creative director, brand strategist, design engineer, accessibility specialist, and 8 more
- **Personality system** — 5 bipolar axes (−5 to +5), 32 traits across 4 categories (temperament, work style, social, mindset)
- **AI team builder** — describe your project, Claude assembles a team with roles, personalities, traits, and Pixabots avatars
- **7 team presets** — `full-studio`, `landing-page-sprint`, `brand-campaign`, `content-machine`, `product-team`, `full-stack-design`, `marketing-blitz`

### The tamagotchi layer
- **Emotions + mood** — 5 emotions, 11 triggering events, 7 moods with decay over time
- **Memory** — per-agent (preferences, corrections, approvals, goals) + team-scoped (brand, project, user, decisions, facts). Auto-extracted from work reports via Haiku, with heuristic fallback.
- **User profile** — one place for your business, industry, audience, voice, style. Every agent reads it before responding.
- **Relationships** — agents track collaborations, conflicts, synergy. Visualized on the team page as a circular bond map.
- **XP + levels** — experienced agents get bolder. Their system prompt shifts as they level up.
- **Cloud sync** — state follows you across devices via Supabase (`agent_states`, `team_relationships`, `team_memory`, `user_profile`, `task_events`)

### Ship + share
- **Export** — Markdown (one skill file per agent) and JSON
- **Fork any team** — one click from any public team page
- **Agent detail sheet** — click any agent to see all 5 emotion bars, XP band, memories by type, personality sliders, traits
- **Project timeline** — every `designteam report` becomes a row on the team page — "Nova shipped landing hero" · "Pixel approved copy deck"

## CLI Commands

```bash
# Management
designteam roster                    # compact team view with moods
designteam status                    # team health + energy/morale bars
designteam check <name>              # deep dive on one agent
designteam recruit [role]            # hire with defaults, or browse roles
designteam fire <name>               # retire an agent
designteam report <name> [flags]     # after doing work — triggers XP, mood, memory
                                     # flags: --completed --approved --rejected --praised
                                     #        --memory "what they learned"
                                     #        --collab <other-name> [--successful]
designteam refresh                   # regenerate skill files with live state

# Memory + profile
designteam remember <category> "..."  # add team memory (brand/project/user/decision/fact)
designteam recall [query]             # search team memory
designteam memory                     # list all entries
designteam profile [get|set key val]  # edit your user profile

# Cloud sync
designteam sync                      # push local state to cloud
designteam pull                      # pull cloud state into .designteam/

# Create + install
designteam create "landing page for a coffee app"   # AI generates a team
designteam create --preset=full-studio
designteam create --roles=researcher,copywriter,graphic-designer
designteam install <id-or-url>
designteam list                      # browse public teams

# Control plane (v0.13 — paperclip-style autonomous mode)
designteam plan "<description>"              # Haiku turns it into a DAG of tasks
designteam plans                             # list projects with progress
designteam show <plan-id>                    # one plan + tasks, statuses, holders
designteam next <plan-id>                    # print the first ready task (todo, no blockers)
designteam run <plan-id> <task-id> --adapter=<id>   # dispatch via a registered adapter
designteam run <plan-id> <task-id> --command="<shell>"   # ephemeral local-script
designteam progress <plan-id> <task-id> --done|--review|--block=<reason>
designteam checkout <plan-id> <task-id>      # atomic lock for the next run
designteam release <plan-id> <task-id>       # manual release (rare — terminal states auto-release)
designteam recover <plan-id> [--stale-minutes=N] [--dry-run]   # reset wedged tasks
designteam activity [--tail=N]               # append-only event log
designteam adapters                          # list registered adapters (env-gated + third-party)
designteam approvals                         # list tasks in in_review across all plans
designteam approve <plan-id> <task-id> [--comment="..."]
designteam reject  <plan-id> <task-id> [--reason="..."] [--block]
designteam budget [show|set --usd=N|reset]   # monthly spend cap with soft warning at 80%
```

Local state lives in `.designteam/` at the root of your project — `team.json`, `state/<agent-id>.json`, `relationships.json`, `projects/<plan-id>.json`, `activity.jsonl`, `budget.json`, `budget.jsonl`.

## Built on

- **[@designteam/core](https://www.npmjs.com/package/@designteam/core)** — the engine (personality, emotions, memory, relationships, swarm). Zero runtime deps, MIT.
- **[@designteam/adapter-utils](./packages/adapter-utils)** — public `TaskAdapter` contract + shared helpers (`buildAgentPrompt`, `runSubprocess`, `truncate`, mutable registry).
- **Adapters** — four reference implementations ship in the repo:
  - `@designteam/adapter-local-script` — shell-out per task, no LLM (great for evals)
  - `@designteam/adapter-claude-cli` — wraps `claude` on PATH (the default)
  - `@designteam/adapter-anthropic-api` — hits `api.anthropic.com` directly + reports token cost (autonomous mode)
  - `@designteam/adapter-efecto` — creates Efecto design sessions per task (agency-shaped)
- **Supabase** — auth + RLS-protected tables for cloud sync
- **Next.js 16** + **React 19** — the web app at designteam.app
- **Claude Haiku** — auto-memory extraction + Haiku-planned task DAGs
- **[@pixabots/core](https://www.npmjs.com/package/@pixabots/core)** — pixel-art avatars

463 vitest cases + 8 sandbox evals across the monorepo.

## Documentation

- [Getting Started](https://designteam.app/docs/getting-started)
- [Agent Roles](https://designteam.app/docs/roles)
- [CLI Integration](https://designteam.app/docs/cli)
- [Export Formats](https://designteam.app/docs/export)

## Links

- **App:** [designteam.app](https://designteam.app)
- **Core package:** [@designteam/core](https://www.npmjs.com/package/@designteam/core)
- **CLI package:** [designteam](https://www.npmjs.com/package/designteam)
- **Repo:** [github.com/pablostanley/designteam-app](https://github.com/pablostanley/designteam-app)
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)
