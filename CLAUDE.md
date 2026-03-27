# Design Team

**Design Team** is an AI agent team for design work. Agents collaborate with specialized roles — design lead, copywriter, reviewer, accessibility checker — to produce high-quality design output.

Website: https://designteam.app

## Project Structure

```
designteam/
├── .claude/
│   ├── agents/           # Agent definitions
│   │   ├── design-lead.md
│   │   ├── copywriter.md
│   │   ├── design-reviewer.md
│   │   └── accessibility-checker.md
│   ├── commands/          # Slash commands
│   │   ├── design-audit.md
│   │   ├── brand-review.md
│   │   ├── copy-review.md
│   │   └── a11y-check.md
│   ├── rules/             # Design rules (always enforced)
│   │   ├── design-standards.md
│   │   └── accessibility.md
│   └── settings.json
├── skills/                # Public skills (for npx skills add)
├── CLAUDE.md              # This file
└── README.md
```

## Available Agents

| Agent | Role | Model |
|-------|------|-------|
| **design-lead** | Orchestrates projects, delegates to specialists, reviews quality | sonnet |
| **copywriter** | Headlines, body copy, CTAs using PAS/AIDA frameworks | sonnet |
| **design-reviewer** | Reviews hierarchy, consistency, accessibility, brand compliance | sonnet |
| **accessibility-checker** | WCAG 2.1 AA audits — contrast, keyboard, screen readers | haiku |

## Available Commands

| Command | Description |
|---------|-------------|
| `/design-audit` | Review design output against quality standards |
| `/brand-review` | Check brand compliance (logo, colors, type, voice, imagery) |
| `/copy-review` | Review copy for clarity, tone, and conversion |
| `/a11y-check` | WCAG 2.1 AA accessibility audit |

## Design Rules (Always Enforced)

Rules in `.claude/rules/` are loaded automatically. Key constraints:

- **Spacing**: 8px grid (4, 8, 16, 24, 32, 48, 64)
- **Typography**: 16px minimum body, 1.5 line height, 65ch max width
- **Contrast**: 4.5:1 text, 3:1 large text (WCAG AA)
- **Layout**: Mobile-first, 44px touch targets, no horizontal scroll
- **Hierarchy**: One H1 per page, one primary CTA per viewport

## Conventions

- Agents write output as code (React/Tailwind components) unless told otherwise
- Copy is written at 8th grade reading level, active voice
- Headlines: 8 words max, benefit-driven
- CTAs: verb + benefit (e.g., "Start designing free")
- Reviews use severity levels: CRITICAL, HIGH, MEDIUM, LOW
