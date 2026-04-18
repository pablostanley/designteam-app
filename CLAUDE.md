# Design Team

> **⚠️ ALWAYS check `ROADMAP.md` FIRST before starting any work.**
> It's the single source of truth for what's shipped, what's in flight, and what's next.
> After finishing work, update it — move items to Done, add discovered follow-ups.

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

**Before starting any work:**
1. **Read `ROADMAP.md`** — find the current priority (marked `[next priority]`)
2. Don't pick work that isn't in the roadmap unless the user asks for it
3. If starting something new: add it to ROADMAP.md first, then build

**After finishing work:**
1. **Update `ROADMAP.md`** — move completed items to Done with PR # and merge date
2. Add any discovered follow-up work to the appropriate phase
3. Run `cd packages/core && pnpm test` — all tests must pass
4. Run `pnpm build` — Next.js app must build
5. Check if `@pixabots/core` has updates: `/Users/pablostanley/pixabots`
6. If publishing to npm: bump version in both `package.json` and `packages/core/package.json`, build, publish core first then CLI
7. Commit and push the ROADMAP update

## Autonomous Loop Workflow

When running in /loop mode (recurring job, no user supervision), follow this
workflow every cycle. **Always make progress.** Never idle or wait for the user.

### 1. Assess state

Run these in parallel to understand where we are:
- `gh pr list` in both repos (designteam + efecto) — any open PRs?
- `git status` — uncommitted work?
- `git log --oneline -5` — latest merges
- Read `ROADMAP.md` — find the current priority

### 2. Decide what to do

**If there's an open PR:**
- Review it (same as /review skill)
- If issues found → fix them, commit, push. Count as 1 of max 3 review rounds.
- If NO issues after up-to-3 reviews → merge it
- **Important:** "no issues" means genuinely clean. Don't rubber-stamp. But don't invent problems either.
- After merging → update ROADMAP (mark item done with PR #), pick next task

**If no PR is open:**
- Pick the next `[next priority]` item from ROADMAP
- Build it end-to-end
- Open a PR
- The next cycle will review

**If blocked** (e.g., needs user auth, migration not applied, API key missing):
- Document in ROADMAP what's blocked and why
- Pick a different unblocked task
- Never idle — find something to move forward

### 3. Always update the roadmap

Every cycle should leave the roadmap more accurate:
- Move completed items to Done
- Add discovered work as new tickets
- If assumptions were wrong, write what you learned
- If a task revealed a bigger problem, note it and scope a follow-up PR

### 4. Each cycle ends with one of these

- A new PR opened
- An existing PR pushed with review fixes
- A PR merged and next task started
- A blocker documented (with a pivot to other work)

### Review rules

- Use the full /review process — three parallel agents (reuse, quality, efficiency)
- Fix findings directly, don't argue false positives
- Max 3 review cycles per PR. If still issues after 3, merge what's clean
  and open a follow-up PR for the rest
- "No issues" means: builds clean, tests pass, no real concerns from the reviewers

### Commit hygiene

- Every commit has a clear message (what + why)
- Always push after committing
- Include `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`

### Repos we work on

- **Design Team**: `/Users/pablostanley/Dropbox/designteam` — repo `pablostanley/designteam-app`
- **Efecto**: `/Users/pablostanley/Dropbox/efecto` — repo `pablostanley/efecto-app`

Efecto integration work (roadmap v0.8) happens in the Efecto repo. Ship each phase as its own PR.
