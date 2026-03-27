# Design Team — Vision & Plan

**designteam.app** — Your AI design crew, ready to ship.

## The One-Liner

Install one skill, get a full design team. Claude Code becomes your Creative Director — it knows when to research, write copy, design, and review. Each specialist has real frameworks, not generic advice.

## How It Actually Works

```bash
npx skills add pablostanley/designteam-app
```

This installs skill files into the user's project. When the user says "design a landing page for FocusFlow", Claude Code:

1. Reads the `design-team` meta-skill (the orchestrator)
2. Follows the workflow: assess → research → copy → design → review
3. Activates specialist knowledge per phase (copywriting frameworks for copy, layout systems for design, etc.)
4. Produces real deliverables at each phase

**Claude Code IS the Creative Director.** The skill files teach it how to orchestrate.

## What's Built

### Web App (designteam.app)
- [x] Homepage with hero + CTA
- [x] Full-page team builder (/build)
- [x] 16 agent roles with personality sliders
- [x] Bipolar sliders (-5 to +5, center = neutral)
- [x] 16 selectable personality traits
- [x] Custom prompt per agent
- [x] 7 team presets
- [x] AI team generation (generate prompt → paste response)
- [x] Export as Markdown / JSON
- [x] Documentation (/docs)
- [x] localStorage persistence
- [x] Deployed to Vercel

### CLI Skills (skills.sh)
- [x] 7 skill files (design-team, web-design, graphic-design, social-media, brand-strategy, copywriting, ux-writing)
- [x] .mcp.json for skills.sh compatibility
- [x] README with install instructions
- [ ] **Rewrite skills as orchestration documents (not static descriptions)**
- [ ] Slash commands (/design-audit, /brand-check, etc.)

### Claude Code Integration
- [ ] `.claude/` directory with agents, commands, hooks, rules
- [ ] Specialized agents with limited tool scopes
- [ ] Hooks for design validation on file writes
- [ ] Rules for design standards (non-negotiable)
- [ ] Context files for different modes (design, accessibility, documentation)

## What's Next (Priority Order)

### Phase 1: Make Skills Actually Orchestrate
Rewrite the 7 skill files from static descriptions to actionable orchestration:
- `design-team/SKILL.md` — The Creative Director brain. Defines the workflow per project type.
- Each specialist skill — Real frameworks, processes, deliverables. Not "you are a copywriter" but "here's how to write a landing page headline using the PAS framework."

### Phase 2: Claude Code Native Integration
Add `.claude/` directory structure (inspired by everything-claude-code):
- `agents/` — Specialized agent definitions with tool scope limits
- `commands/` — Slash commands (/design-audit, /brand-review, /copy-review)
- `hooks/` — Auto-validate design output (check tokens, accessibility, brand)
- `rules/` — Non-negotiable design standards
- `contexts/` — Mode-switching (design mode, accessibility mode, documentation mode)

### Phase 3: Design Knowledge Base
Port ALL Efecto design context skills (17 contexts) as deep, queryable knowledge:
- Landing pages, dashboards, social media, portfolios
- Marketing sites, mobile apps, UX flows, ecommerce
- Business cards, resumes, flyers, menus, presentations
- Each context: structure, patterns, rules, examples

### Phase 4: Real Agent Orchestration
- Agents that hand off work to each other via file artifacts
- Phase gates with quality checks
- Model tiering (haiku for research, sonnet for design, opus for architecture)
- Continuous learning from project patterns

## Agent Roles (16)

| Role | Name | What They Do |
|------|------|-------------|
| Researcher | Scout | Competitive analysis, audience insights, references |
| Copywriter | Aria | Headlines, body copy, CTAs, messaging |
| Graphic Designer | Pixel | Visual composition, color, typography |
| UX Designer | Flow | Interaction design, user flows, wireframes |
| UX Writer | Quill | Microcopy, labels, error messages |
| Editorial Designer | Reed | Layout, grid systems, typographic hierarchy |
| Social Media Designer | Buzz | Platform-specific content, trends |
| Creative Director | Nova | Orchestration, quality review, team coordination |
| Design Engineer | Kit | Frontend implementation, component architecture |
| Brand Strategist | Sage | Brand identity, visual systems, voice/tone |
| Marketing Strategist | Maven | Campaign planning, channel strategy |
| Print Designer | Ink | Print layouts, CMYK, packaging |
| Motion Designer | Flux | Animation, transitions, motion graphics |
| Accessibility Specialist | Atlas | WCAG, ARIA, inclusive design |
| Content Strategist | Story | Content architecture, editorial planning |
| SEO Specialist | Signal | On-page SEO, structured data, keywords |

## Design Contexts (17, from Efecto)

landing-page, dashboard, social-media, portfolio, marketing-site, mobile-app, ux-flow, ecommerce, business-card, resume, flyer, menu, infographic, invitation, newsletter, document, presentation

## Tech Stack

- Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- localStorage (no database dependency)
- Vercel deployment
- skills.sh compatible
- Claude Code native (.claude/ directory)

## Repo

- **GitHub:** github.com/pablostanley/designteam-app
- **Domain:** designteam.app (connect in Vercel)
- **Install:** `npx skills add pablostanley/designteam-app`
