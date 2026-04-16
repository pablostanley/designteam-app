# @designteam/core

The engine behind [Design Team](https://designteam.app) — persistent AI agent teams with personality, mood, memory, and relationships.

## Install

```bash
npm install @designteam/core
```

## What's inside

- **Personality engine** — 5 bipolar axes, 32 traits, conviction scoring
- **Emotional model** — 5 emotions, 11 events, 7 moods, time-based decay
- **Memory system** — salience-based decay, reinforcement, extraction
- **Relationship graph** — synergy scoring, bond tracking, conflict resolution
- **Lifecycle** — `reportOutcome()` and `applyDecay()` for the living loop
- **16 agent roles** — researcher, copywriter, designer, engineer, and more
- **7 team presets** — landing page sprint, brand campaign, full studio, etc.
- **AI team builder** — generate teams from project descriptions
- **Swarm orchestrator** — parallel task scheduling with dependencies

One dependency (`@pixabots/core` for avatar IDs). Dual ESM/CJS. Full TypeScript types.

## Quick start

```typescript
import {
  createDefaultAgent,
  createDefaultLivingState,
  reportOutcome,
  getMood,
} from '@designteam/core'

// Create an agent
const pixel = createDefaultAgent('graphic-designer')

// Create living state
let state = createDefaultLivingState(pixel.id)
let graph = { teamId: 'my-team', relationships: [] }

// Report work outcomes — this is what makes agents alive
const result = reportOutcome(state, graph, pixel.id, {
  type: 'approved',
  memory: 'user prefers dark themes with warm accents',
})

console.log(result.mood)      // 'confident'
console.log(result.xpGained)  // 25
console.log(result.leveledUp) // maybe!
```

## License

MIT
