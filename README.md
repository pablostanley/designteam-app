# Design Team

Assemble AI agent teams for design work. Each agent has a unique role, personality, and expertise.

**Website**: [designteam.app](https://designteam.app)

## Install

```bash
npx skills add pablostanley/designteam-app
```

This installs a set of design skills that any CLI AI agent can use — Claude Code, Cursor, Windsurf, Codex.

## How It Works

```bash
# 1. Install the skills
npx skills add pablostanley/designteam-app

# 2. Open Claude Code in your project
claude

# 3. Ask for design work — agents activate automatically
> "Design a landing page for my SaaS product"
```

The design lead assesses your request, assembles the right team, and runs through phases:

1. **Strategy** — Define audience, goals, messaging hierarchy
2. **Copy** — Write headlines, body copy, CTAs (copywriter agent)
3. **Design** — Build the layout with components (design lead)
4. **Review** — Check quality, accessibility, brand compliance (reviewer + a11y checker)
5. **Iterate** — Fix issues, polish, deliver

## Available Skills

| Skill | Description |
|-------|-------------|
| **design-team** | Meta-skill — assemble and manage a full design team with specialized agents |
| **web-design** | Landing pages, dashboards, marketing sites, e-commerce, portfolios, mobile apps, UX flows |
| **graphic-design** | Presentations, flyers, business cards, resumes, menus, infographics, invitations, newsletters, documents |
| **social-media** | Platform-optimized content for Instagram, Twitter/X, LinkedIn, TikTok, YouTube, Facebook |
| **brand-strategy** | Brand identity systems, visual language, color palettes, typography, voice/tone, guidelines |
| **copywriting** | Headlines, body copy, CTAs, value propositions, messaging hierarchies |
| **ux-writing** | Microcopy, button labels, error messages, empty states, onboarding text, tooltips |

## Slash Commands

Run these inside Claude Code for quick audits:

| Command | Description |
|---------|-------------|
| `/design-audit` | Review design output against quality standards |
| `/brand-review` | Check brand compliance (logo, colors, type, voice, imagery) |
| `/copy-review` | Review copy for clarity, tone, and conversion |
| `/a11y-check` | WCAG 2.1 AA accessibility audit |

## Agent Roles

### Core Design
- **Graphic Designer** — Visual layouts, composition, color, typography
- **UX / Product Designer** — User flows, wireframes, interaction patterns
- **Social Media Designer** — Platform-optimized content
- **Editorial Designer** — Documents, publications, presentations

### Strategy
- **Creative Director** — Orchestrates the team, sets direction, ensures cohesion
- **Brand Strategist** — Identity systems, visual language, brand guidelines
- **Researcher** — Competitive analysis, trends, audience insights

### Writing
- **Copywriter** — Headlines, body copy, CTAs, value propositions
- **UX Writer** — Microcopy, button labels, error messages, interface language

### Extended
- **Design Engineer** — Bridges design and code (Tailwind, components, responsive)
- **Marketing Strategist** — Campaign structure, messaging hierarchy
- **Accessibility Specialist** — WCAG compliance, inclusive design

## Team Presets

- **Startup Landing Page**: Creative Director + Copywriter + Graphic Designer + UX Designer
- **Brand Identity**: Brand Strategist + Graphic Designer + Copywriter
- **Social Campaign**: Social Media Designer + Copywriter + Graphic Designer
- **Product Design Sprint**: UX Designer + UX Writer + Design Engineer + Researcher
- **Content Marketing**: Editorial Designer + Copywriter + Social Media Designer

## Usage

### With Claude Code

```bash
npx skills add pablostanley/designteam-app

# Skills are available automatically. Ask for design work:
> "Design a landing page for my SaaS product"
> "Create a brand identity for a coffee shop"
> "Write the copy for our pricing page"
```

### With Cursor / Windsurf

```bash
npx skills add pablostanley/designteam-app
```

Skills are loaded as context when relevant to your prompt.

### With Codex

```bash
npx skills add pablostanley/designteam-app
```

Reference the skills in your Codex instructions or let them activate based on context.

## Visual Team Builder

Visit [designteam.app](https://designteam.app) to build teams visually, configure agent personalities with sliders and traits, and export configurations.

## How Skills Work

Each skill is a Markdown file (`SKILL.md`) with structured design knowledge. When you install them via `npx skills add`, they become available as context for your AI agent. The agent reads the relevant skill based on your task and follows its specialized instructions.

No API keys. No runtime dependencies. No configuration. Just Markdown.
