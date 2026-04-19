/**
 * Scenario: memory-routing
 *
 * Covers:
 *  - `designteam remember` lands entries in the team memory file.
 *  - Category + salience + source persist correctly.
 *  - Activity log records `memory.add` with the right category.
 *
 * Doesn't require Haiku (we use the explicit CLI, which bypasses
 * auto-extraction). A follow-up scenario gated on ANTHROPIC_API_KEY
 * will cover the heuristic vs AI routing path.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { withSandbox, assert, assertEqual, assertIncludes } from '../harness.mjs'

const slug = 'memory-routing'

export async function run() {
  return withSandbox(slug, async ({ cli, readJson, readJsonl, sandboxPath }) => {
    // Seed: a minimal team file. `remember` requires a team to exist because
    // team memory is keyed by team.id.
    const stateDir = join(sandboxPath, '.designteam')
    mkdirSync(stateDir, { recursive: true })
    const team = {
      id: 'team-mr',
      short_id: 'team-mr',
      name: 'eval team',
      agents: [],
      createdAt: new Date().toISOString(),
    }
    writeFileSync(join(stateDir, 'team.json'), JSON.stringify(team, null, 2), 'utf8')

    cli('remember', 'brand', 'we use a calm, confident voice')
    cli('remember', 'user', 'Pablo prefers terse updates over narration')
    cli('remember', 'decision', 'we chose monospace for headlines in the april refresh')

    const memory = readJson('team-memory.json')
    assert(memory, 'team-memory.json should exist after remember')
    assertEqual(memory.teamId, 'team-mr', 'memory should be scoped to the team')
    assertEqual(memory.entries.length, 3, 'three entries added')

    // Entries arrive newest-first in addTeamMemory, but order inside the
    // array isn't the invariant we're testing — categories are.
    const categories = memory.entries.map((e) => e.category).sort()
    assertEqual(JSON.stringify(categories), JSON.stringify(['brand', 'decision', 'user']), 'all three categories represented')

    // Every entry should have the source set to "user" (manual remembers)
    // and a salience in range [0, 1].
    for (const entry of memory.entries) {
      assertEqual(entry.source, 'user', 'manual remembers attribute source=user')
      assert(entry.salience >= 0 && entry.salience <= 1, 'salience in [0,1]')
      assert(entry.content.length > 0, 'content non-empty')
    }

    // Activity log should have three memory.add events, one per call.
    const events = readJsonl('activity.jsonl')
    const adds = events.filter((e) => e.action === 'memory.add')
    assertEqual(adds.length, 3, 'three memory.add events')
    const activityCats = adds.map((e) => e.meta.category).sort()
    assertEqual(JSON.stringify(activityCats), JSON.stringify(['brand', 'decision', 'user']), 'activity log captures every category')
    // Newest first → decision first
    assertIncludes(['decision'], adds[0].meta.category, 'activity log is newest-first')
  })
}

run.slug = slug
