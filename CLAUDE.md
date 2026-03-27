# Design Team

**Design Team** is an AI design crew that ships. Not just pretty pictures -- research, strategy, copy, design, code, review, deploy. 16 agent roles, 6 Claude Code agents, 17 installable skills, one workflow.

- Website: https://designteam.app
- Install: `npx skills add pablostanley/designteam-app`
- Vision: See VISION.md for the full product vision and roadmap

## Project Structure

```
designteam/
├── .claude/
│   ├── agents/           # Agent definitions (6 agents)
│   │   ├── creative-director.md   # Orchestration, phase gates
│   │   ├── copywriter.md          # Headlines, CTAs, messaging
│   │   ├── design-reviewer.md     # Visual QA, slop detection
│   │   ├── qa-lead.md             # A11y, responsive, production
│   │   ├── design-engineer.md     # React/Tailwind implementation
│   │   └── researcher.md          # Competitive analysis, audience
│   ├── commands/          # Slash commands (6 commands)
│   │   ├── design-audit.md
│   │   ├── brand-review.md
│   │   ├── copy-review.md
│   │   ├── a11y-check.md
│   │   ├── ship.md
│   │   └── design-slop-check.md
│   ├── rules/             # Design rules (always enforced)
│   │   ├── design-standards.md
│   │   ├── accessibility.md
│   │   ├── writing-style.md
│   │   └── ai-slop-detection.md
│   └── settings.json
├── skills/                # Public skills (for npx skills add)
├── src/
│   └── lib/
│       └── agent-builder/
│           ├── skills/          # Role-based skill markdown files
│           └── design-skills/   # Design context skill files
├── CLAUDE.md              # This file
└── README.md
```

## Available Agents

| Agent | Role | Model |
|-------|------|-------|
| **creative-director** | Orchestrates projects, phase gates, delegates to specialists, reviews quality | sonnet |
| **copywriter** | Headlines, body copy, CTAs using PAS/AIDA frameworks, zero slop | sonnet |
| **design-reviewer** | Reviews hierarchy, consistency, brand compliance, AI slop detection | sonnet |
| **qa-lead** | WCAG 2.1 AA audits, code-matches-design, responsive, production readiness | sonnet |
| **design-engineer** | Implements designs as React/Tailwind components, all states, accessible | sonnet |
| **researcher** | Competitive analysis, audience profiling, positioning gaps | haiku |

## Available Commands

| Command | Description |
|---------|-------------|
| `/design-audit` | Review design output against quality standards |
| `/brand-review` | Check brand compliance (logo, colors, type, voice, imagery) |
| `/copy-review` | Review copy for clarity, tone, and conversion |
| `/a11y-check` | WCAG 2.1 AA accessibility audit |
| `/ship` | Pre-ship checklist (hierarchy, responsive, a11y, copy, states, perf, brand) |
| `/design-slop-check` | Scan for generic AI output patterns |

## Design Rules (Always Enforced)

Rules in `.claude/rules/` are loaded automatically. Key constraints:

- **Spacing**: 8px grid (4, 8, 16, 24, 32, 48, 64)
- **Typography**: 16px minimum body, 1.5 line height, 65ch max width
- **Contrast**: 4.5:1 text, 3:1 large text (WCAG AA)
- **Layout**: Mobile-first, 44px touch targets, no horizontal scroll
- **Hierarchy**: One H1 per page, one primary CTA per viewport

## Writing Rules

- Direct. Lead with the point. No throat-clearing.
- 8th grade reading level. Short sentences. Active voice.
- Specific over vague. "47% faster" not "much faster"
- NO: em-dashes, "delve", "unlock", "leverage", "synergy", "empower"
- NO: "beautiful", "stunning", "seamless", "robust", "utilize", "ensure"
- NO: generic SaaS speak ("Transform your workflow")
- NO: exclamation marks (except celebrating wins)
- CTAs: verb + benefit ("Start designing free", not "Submit")
- Error messages: what happened + how to fix
- Empty states: what goes here + how to start

## AI Slop Detection

Flag instantly and fix:
- Generic SaaS card grids as hero
- Purple/violet gradients with decorative blobs
- 3-column feature grids with circle icons
- Centered-everything with no hierarchy
- Cookie-cutter section rhythm
- Copy with "unlock", "transform", "seamlessly"
- Features without benefits, no evidence or numbers

## Conventions

- Use shadcn/ui components and neutral color palette only
- Geist font family (sans + mono)
- Agents produce code (React/Tailwind) unless told otherwise
- Design mode = use Efecto MCP tools. Ship mode = write code directly.
- Reviews use severity: CRITICAL, HIGH, MEDIUM, LOW
- Auto-fix obvious issues. Batch complex decisions into one question.
- Every finding needs before/after evidence.
- Fix-first philosophy: never leave findings unfixed.

## Sources of Truth

- `VISION.md` -- Product vision, architecture, roadmap (keep updated!)
- `CLAUDE.md` -- This file. Project config and conventions.
- `skills/` -- CLI skills (what gets installed via skills.sh)
- `src/lib/agent-builder/` -- Core engine (types, personality, roles, skills)
- `.claude/` -- Claude Code native agents, commands, rules
