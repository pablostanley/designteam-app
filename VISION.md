# Design Team — Vision

**designteam.app** — Assemble AI agent teams for design work.

## What is Design Team?

A standalone app + CLI skill system where users (humans and AI agents) build teams of specialized design agents. Each agent has a role, personality, traits, and custom instructions that shape how they work.

## Who uses it?

1. **Humans via UI** — Build teams visually at designteam.app, configure personalities, export configs
2. **AI agents via CLI** — Claude Code, Codex, Cursor, Windsurf install `designteam` as a skill and get a full design team with specialized sub-skills
3. **Any tool via API** — JSON/Markdown export, skills.sh compatible

## Core Concept

A Design Team is a collection of specialized AI agents. Each agent has:
- **Role** — what they do (copywriter, graphic designer, UX designer, etc.)
- **Personality** — bipolar sliders (-5 to +5) that shape their style
- **Traits** — selectable personality pills (creative, analytical, detail-oriented, etc.)
- **Custom Prompt** — user's own instructions for the agent
- **Skill File** — generated markdown combining role baseline + personality + traits + instructions

## Agent Roles

### Design Roles (from Efecto)
- Researcher / Benchmarker
- Copywriter
- Graphic Designer
- UX / Product Designer
- UX Writer / Microcopy
- Editorial Designer
- Social Media Designer
- Creative Director (orchestrator)

### Extended Roles
- Design Engineer / Frontend Developer
- Brand Strategist
- Marketing Strategist
- Print Designer
- Motion Designer
- Accessibility Specialist
- Content Strategist
- SEO Specialist

## Design Skills (from Efecto)

Each role maps to design context skills:
- Landing pages, dashboards, social media, portfolios
- Marketing sites, mobile apps, UX flows, ecommerce
- Business cards, resumes, flyers, menus
- Infographics, invitations, newsletters, documents
- Presentations, pitch decks

## Distribution

### 1. Web App (designteam.app)
- Build teams visually
- Configure personalities with sliders + traits
- Export as Markdown / JSON
- AI-assisted team building ("I need a team for X")

### 2. CLI Skill (skills.sh)
```bash
npx skills add pablostanley/designteam
```
Installs a meta-skill that:
- Configures a design team based on the project
- Each agent becomes a sub-skill the AI can invoke
- Works with Claude Code, Cursor, Windsurf, Codex

### 3. Claude Code Plugin
```bash
claude plugin add designteam
```
Same skills, packaged for Claude Code's plugin system.

### 4. API
- `GET /api/teams` — list saved teams
- `POST /api/teams` — create a team
- `GET /api/teams/:id/export` — export as markdown/json
- `POST /api/ai/build-team` — AI generates a team from a prompt

## Tech Stack
- Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- No database (localStorage + JSON export for now)
- Vercel deployment
- skills.sh compatible skill files
