# Design Team

**Your AI creative studio. Hire a team, customize their personalities, watch them grow.**

16 agent roles. Tamagotchi persistence (XP, moods, memories, relationships). Works in Claude Code, Cursor, Codex, Efecto.

- Website: https://designteam.app
- CLI: `npx designteam create --preset=landing-page-sprint`
- npm: `@designteam/core` (engine), `designteam` (CLI)
- Install skills: `npx skills add pablostanley/designteam-app`

## Key Files — Check Before Working

- **`ROADMAP.md`** — What's done, what's next, what's planned. **Check this first.**
- **`DESIGN-TEAM-VISION.md`** — The WHY. Product vision, architecture, Paperclip patterns.
- **`TASKS.md`** — Detailed task board with per-task status.
- **`packages/core/`** — `@designteam/core` npm package (engine, single source of truth for agent logic)
- **`cli/index.mjs`** — CLI commands (roster, status, check, recruit, fire, report, refresh)
- **`cli/state.mjs`** — Local `.designteam/` persistence

## Architecture

```
packages/core/           @designteam/core (npm, MIT, zero deps)
  src/types.ts           Agent, Team, Personality, Emotions, Memory, Relationships
  src/personality-engine  5 axes, 32 traits, conviction, level modulation
  src/emotional-model     5 emotions, 11 events, 7 moods, decay
  src/memory-system       Salience decay, reinforcement, extraction
  src/relationship-graph  Synergy scoring, bond decay, conflict
  src/lifecycle           reportOutcome(), applyDecay() — THE living loop
  src/swarm               Task templates, dependency scheduling

cli/index.mjs            npx designteam (roster, status, check, recruit, fire, report, refresh)
cli/state.mjs            .designteam/ file persistence

src/lib/agent-builder/   Re-export shims → @designteam/core
src/components/          Next.js app UI (team builder, personality editor, pixabot editor)

skills/                  17 installable skills (skills.sh compatible)
.claude/agents/          6 Claude Code agents
.claude/commands/        6 slash commands
.claude/rules/           4 design rules (always enforced)
```

## Pixabots Integration

Agents have pixel-art avatars via [Pixabots](https://pixabots.com).

- **npm**: `@pixabots/core` — use `randomId()`, `seededId()`, `PARTS`, `partCount()`
- **API**: `https://pixabots.com/api/pixabot/{id}?size=240` (PNG), `?animated=true` (GIF)
- **Sizes**: 32, 64, 128, 240, 480, 960
- **ID format**: 4-char base36 (eyes, heads, body, top)
- **Rendering**: always `unoptimized` + `imageRendering: 'pixelated'` on Image components
- **TODO**: Replace hand-rolled `randomPixabotId()` with `@pixabots/core`'s `randomId()`

## Project Structure

```
designteam/
├── .claude/
│   ├── agents/           # Agent definitions (6 agents)
│   ├── commands/          # Slash commands (6 commands)
│   ├── rules/             # Design rules (always enforced)
│   └── settings.json
├── packages/core/         # @designteam/core npm package
│   ├── src/               # 17 source files
│   └── __tests__/         # 12 test files, 307 tests
├── cli/
│   ├── index.mjs          # CLI entry point
│   └── state.mjs          # .designteam/ file I/O
├── skills/                # 17 installable skills
├── src/
│   ├── app/               # Next.js 16 pages
│   ├── components/        # UI (team builder, personality editor, pixabot editor)
│   └── lib/agent-builder/ # Re-export shims → @designteam/core
├── ROADMAP.md             # What's done, what's next
├── DESIGN-TEAM-VISION.md  # Product vision
├── TASKS.md               # Detailed task board
└── CLAUDE.md              # This file
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

- **`ROADMAP.md`** — What's done, what's next, what's planned. **Always check and update after work.**
- **`DESIGN-TEAM-VISION.md`** — Product vision, architecture, Paperclip patterns
- **`TASKS.md`** — Detailed task board with per-task status
- **`packages/core/`** — `@designteam/core` engine (types, personality, emotions, memory, lifecycle)
- **`cli/`** — CLI commands + local state persistence
- **`skills/`** — 17 installable skills (skills.sh compatible)
- **`.claude/`** — Claude Code agents, commands, rules
- **Pixabots**: `@pixabots/core` npm + API at pixabots.com. Source: `/Users/pablostanley/pixabots`

## Checklist — Before and After Work

**Before starting**: Read `ROADMAP.md` to understand current state and priorities.

**After finishing**:
1. Update `ROADMAP.md` — move completed items, add discovered work
2. Run `cd packages/core && pnpm test` — 307 tests must pass
3. Run `pnpm build` — Next.js app must build
4. Check if `@pixabots/core` has updates: `/Users/pablostanley/pixabots`
5. If publishing to npm: bump version, build, publish core first then CLI
