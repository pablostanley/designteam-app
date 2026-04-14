# Design Team — Vision

**Your AI creative studio. Hire a team, customize their personalities, watch them grow.**

---

## What is Design Team?

Design Team is an open-source platform for building persistent AI agent teams. Agents are like tamagotchis — they have personalities, moods, memories, and relationships. They get better over time. They remember your brand, your taste, your feedback. They're YOUR team.

One AI gives you one opinion. A team gives you a studio.

## The Problem

1. **AI output is generic.** Everyone's landing page looks the same because everyone uses the same AI with the same personality.
2. **AI doesn't remember.** Every conversation starts fresh. No accumulated taste, no brand knowledge.
3. **AI is a generalist.** One agent does everything mediocrely. A copywriter should write copy. A designer should design.
4. **AI doesn't critique itself.** A single AI can't catch its own blind spots. A team has built-in review.

## The Experience

### In your tools (Claude Code, Cursor, Codex)

Agents show up as skills. They carry their personality, memories, mood. You work WITH them.

```
> design a landing page for my fitness app

Nova (Creative Director): Breaking this down. Scout — research fitness
app patterns. Aria — messaging angles. Pixel — visual direction.

Scout: Looked at Strava, Fitbit, Hevy. Pattern: dark theme, phone
mockup hero, social proof. Your differentiator should lead.

Aria: Three headline options:
1. "Count reps. Not calories."
2. "The gym log that stays out of your way."
3. "Less tracking. More lifting."

Pixel: Going minimal. Dark, tight, one sans-serif font. No feature
grids — if simplicity is the brand, the page should feel simple too.

Nova: Pixel's right. Go with headline #1. Build it.
```

After the session, each agent's state updates:
- Pixel gains XP, mood stays inspired
- Scout remembers "this user's product is about simplicity"
- Aria remembers "user responds to short, punchy copy"
- Nova-Pixel synergy goes up

### In the CLI (manage your team)

```
$ designteam roster

  Acme Studio (4 agents)

  NAME     ROLE              LVL  MOOD       LAST ACTIVE
  Nova     Creative Director  3   fired-up   2h ago
  Aria     Copywriter         2   steady     1d ago
  Pixel    Graphic Designer   4   inspired   30m ago
  Scout    Researcher         1   cautious   3d ago

$ designteam check pixel

  Pixel (Graphic Designer) — Level 4 (320 XP)
  Mood: inspired
  Conviction: HIGH — will push back on safe choices

  Remembers:
  - "Prefers asymmetric layouts over centered grids" (strong)
  - "Brand palette: warm neutrals #F5F0EB #2D2A26 #C4956A" (strong)
  - "Hates stock photos, use illustrations" (fading)

  Best partner: Aria (synergy 91)

$ designteam recruit design-engineer

  Kit joins at Level 1. They'll learn your stack over time.

$ designteam status

  Team health: 78/100
  Nova is fired up — good time for ambitious work
  Pixel is inspired — riding momentum from last project
  Tip: Nova and Pixel have high synergy. Pair them.
```

### On designteam.app (home base)

Visual version of the CLI plus:
- Drag personality sliders, see how the agent changes
- Relationship map — who works well together
- Project timeline — what your team has worked on
- Share/fork teams — "here's my landing page team, fork it"
- Agent profiles — public pages showing personality, level, specialties

## What Makes Agents Alive (Tamagotchi)

**They grow.** Level 1 agents follow safe patterns. Level 5+ agents take risks, know your taste, push back. You feel the progression.

**They have moods.** After shipping, they're fired up — bolder proposals. After rejections, they're cautious — more questions. This changes the output.

**They remember.** Not just this project — across projects. "Last time you asked for a landing page, you loved the asymmetric layout but hated the stock photos."

**They have relationships.** Agents that work together develop synergy. They learn each other's styles. A new team member takes time to integrate.

**They're yours.** You chose their personalities. You named them. When you share your team, others fork it and make it their own.

## Architecture

```
@designteam/core               (npm package, MIT, zero dependencies)
  Personality engine            5 axes, 32 traits, conviction scoring
  Emotional model               5 emotions, 11 events, 7 moods, decay
  Memory system                 Salience decay, reinforcement, extraction
  Relationship graph            Synergy scoring, bond decay, conflict
  Swarm orchestrator            Task templates, dependency scheduling
  Messaging                     Inter-agent mailbox, handoffs, reviews
  Role definitions              16 roles with defaults
  Team presets                  7 pre-built team compositions
  AI team builder               Claude-powered team generation
        |
        | used by
        v
designteam.app                  (web app, team builder, sharing)
cli/                            (npx designteam, team management)
skills/                         (17 installable skills for AI tools)
        |
        | adapters
        v
Efecto          Claude Code          Cursor          Codex
(MCP canvas)    (skills)             (skills)        (tasks)
```

## What We Stole From Paperclip

Paperclip (github.com/paperclipai/paperclip) is a control plane for AI companies. It treats agent management as a business operations problem. We take the operational rigor but keep the personality and soul.

| Pattern | Paperclip | Design Team |
|---------|-----------|-------------|
| **Goal hierarchy** | Every task traces to company mission | Every task traces to user intent |
| **Token budgets** | Per-agent cost tracking with hard stops | Per-agent cost tracking with warnings |
| **Audit trail** | Every action logged immutably | Every decision logged with context |
| **Atomic checkout** | One agent per task, 409 Conflict | One agent per task, no clobbering |
| **Compact context** | Agents get just what they need | Curated context per task |
| **Adapters** | 7 LLM adapters (Claude, Codex, Gemini) | Tool adapters (Efecto, Claude Code, Cursor) |
| **Personality** | None (stateless workers) | 5 axes, 32 traits, moods, memories |
| **Design domain** | None (domain-agnostic) | 16 design roles, 17 design contexts |

## The Pitch

"Paperclip is for AI companies. Design Team is for AI creative studios. Hire a team, customize their personalities, assign them work, watch them collaborate. They remember your brand. They learn your taste. They're your team."

## Open Source Strategy

- **@designteam/core** — MIT, open source, anyone can build agent teams
- **designteam.app** — open source web app (like Supabase's OSS dashboard)
- **Agent marketplace** — people create and share custom agents/teams
- **Efecto integration** — proprietary adapter (Efecto is Pablo's commercial product)
- **Revenue** — Efecto Pro includes Design Team agents. Standalone Design Team is free/open.

## Tech Stack

- **Core**: TypeScript, zero dependencies, dual ESM/CJS
- **App**: Next.js 16, React 19, Tailwind 4, Supabase, Vercel AI SDK
- **CLI**: Node.js ESM, imports @designteam/core
- **Build**: tsup (core), pnpm workspaces (monorepo)
- **Persistence**: Supabase (cloud) + local `.designteam/` (project-scoped)
