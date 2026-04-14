import { describe, it, expect } from 'vitest'
import type { RelationshipGraph, AgentRelationship } from '../src/types'
import {
  getRelationship,
  recordCollaboration,
  recordConflict,
  getTeamHealth,
  decayRelationships,
  createRelationshipGraph,
} from '../src/relationship-graph'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyGraph(): RelationshipGraph {
  return createRelationshipGraph('team-test')
}

/** Build a graph with one relationship that has known collaboration history. */
function graphWithRelationship(overrides?: Partial<AgentRelationship>): RelationshipGraph {
  const base: AgentRelationship = {
    agentA: 'alice',
    agentB: 'bob',
    collaborations: 5,
    successfulCollabs: 4,
    conflicts: 1,
    synergyScore: 60,
    bond: 40,
    lastInteraction: new Date().toISOString(),
    sharedInsights: [],
    ...overrides,
  }
  return { teamId: 'team-test', relationships: [base] }
}

// ---------------------------------------------------------------------------
// getRelationship
// ---------------------------------------------------------------------------

describe('getRelationship', () => {
  it('returns a new default relationship for unknown pair', () => {
    const rel = getRelationship(emptyGraph(), 'alice', 'bob')
    expect(rel.collaborations).toBe(0)
    expect(rel.successfulCollabs).toBe(0)
    expect(rel.conflicts).toBe(0)
    expect(rel.synergyScore).toBe(50)
    expect(rel.bond).toBe(20)
    expect(rel.sharedInsights).toEqual([])
  })

  it('returns the existing relationship when present', () => {
    const graph = graphWithRelationship({ collaborations: 10, bond: 80 })
    const rel = getRelationship(graph, 'alice', 'bob')
    expect(rel.collaborations).toBe(10)
    expect(rel.bond).toBe(80)
  })

  it('normalizes key order (alphabetical)', () => {
    const graph = graphWithRelationship()
    // 'bob' > 'alice' alphabetically, so ('bob','alice') should find the same record
    const rel = getRelationship(graph, 'bob', 'alice')
    expect(rel.agentA).toBe('alice')
    expect(rel.agentB).toBe('bob')
    expect(rel.collaborations).toBe(5)
  })

  it('keeps different pairs separate', () => {
    let graph = emptyGraph()
    graph = recordCollaboration(graph, 'alice', 'bob', true)
    graph = recordCollaboration(graph, 'alice', 'carol', true)

    const ab = getRelationship(graph, 'alice', 'bob')
    const ac = getRelationship(graph, 'alice', 'carol')
    expect(ab.collaborations).toBe(1)
    expect(ac.collaborations).toBe(1)
    expect(graph.relationships).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// recordCollaboration
// ---------------------------------------------------------------------------

describe('recordCollaboration', () => {
  it('increments collaborations count', () => {
    const graph = recordCollaboration(emptyGraph(), 'alice', 'bob', true)
    const rel = getRelationship(graph, 'alice', 'bob')
    expect(rel.collaborations).toBe(1)
  })

  it('increments successfulCollabs when successful', () => {
    const graph = recordCollaboration(emptyGraph(), 'alice', 'bob', true)
    const rel = getRelationship(graph, 'alice', 'bob')
    expect(rel.successfulCollabs).toBe(1)
  })

  it('does not increment successfulCollabs when unsuccessful', () => {
    const graph = recordCollaboration(emptyGraph(), 'alice', 'bob', false)
    const rel = getRelationship(graph, 'alice', 'bob')
    expect(rel.successfulCollabs).toBe(0)
    expect(rel.collaborations).toBe(1)
  })

  it('increases bond on success (+5)', () => {
    const graph = graphWithRelationship({ bond: 40 })
    const updated = recordCollaboration(graph, 'alice', 'bob', true)
    const rel = getRelationship(updated, 'alice', 'bob')
    expect(rel.bond).toBe(45)
  })

  it('decreases bond on failure (-2)', () => {
    const graph = graphWithRelationship({ bond: 40 })
    const updated = recordCollaboration(graph, 'alice', 'bob', false)
    const rel = getRelationship(updated, 'alice', 'bob')
    expect(rel.bond).toBe(38)
  })

  it('clamps bond at 0 (no negative bonds)', () => {
    const graph = graphWithRelationship({ bond: 1 })
    const updated = recordCollaboration(graph, 'alice', 'bob', false)
    const rel = getRelationship(updated, 'alice', 'bob')
    expect(rel.bond).toBeGreaterThanOrEqual(0)
  })

  it('clamps bond at 100', () => {
    const graph = graphWithRelationship({ bond: 98 })
    const updated = recordCollaboration(graph, 'alice', 'bob', true)
    const rel = getRelationship(updated, 'alice', 'bob')
    expect(rel.bond).toBeLessThanOrEqual(100)
  })

  it('recalculates synergy score', () => {
    const graph = graphWithRelationship({ synergyScore: 50 })
    const updated = recordCollaboration(graph, 'alice', 'bob', true)
    const rel = getRelationship(updated, 'alice', 'bob')
    // Synergy should have been recalculated (not left at 50)
    expect(typeof rel.synergyScore).toBe('number')
    expect(rel.synergyScore).toBeGreaterThanOrEqual(0)
    expect(rel.synergyScore).toBeLessThanOrEqual(100)
  })

  it('stores shared insight (last 10)', () => {
    let graph = emptyGraph()
    for (let i = 0; i < 12; i++) {
      graph = recordCollaboration(graph, 'alice', 'bob', true, `insight-${i}`)
    }
    const rel = getRelationship(graph, 'alice', 'bob')
    expect(rel.sharedInsights.length).toBeLessThanOrEqual(10)
    // Most recent should be present
    expect(rel.sharedInsights).toContain('insight-11')
  })

  it('updates lastInteraction timestamp', () => {
    const oldGraph = graphWithRelationship({
      lastInteraction: '2020-01-01T00:00:00.000Z',
    })
    const updated = recordCollaboration(oldGraph, 'alice', 'bob', true)
    const rel = getRelationship(updated, 'alice', 'bob')
    expect(rel.lastInteraction > '2020-01-01T00:00:00.000Z').toBe(true)
  })

  it('creates a new relationship if one does not exist', () => {
    const graph = recordCollaboration(emptyGraph(), 'x', 'y', true)
    expect(graph.relationships).toHaveLength(1)
    expect(getRelationship(graph, 'x', 'y').collaborations).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// recordConflict
// ---------------------------------------------------------------------------

describe('recordConflict', () => {
  it('increments conflicts count', () => {
    const graph = recordConflict(emptyGraph(), 'alice', 'bob', true)
    const rel = getRelationship(graph, 'alice', 'bob')
    expect(rel.conflicts).toBe(1)
  })

  it('increases bond when conflict is resolved (+2)', () => {
    const graph = graphWithRelationship({ bond: 40 })
    const updated = recordConflict(graph, 'alice', 'bob', true)
    const rel = getRelationship(updated, 'alice', 'bob')
    expect(rel.bond).toBe(42)
  })

  it('decreases bond when conflict is unresolved (-5)', () => {
    const graph = graphWithRelationship({ bond: 40 })
    const updated = recordConflict(graph, 'alice', 'bob', false)
    const rel = getRelationship(updated, 'alice', 'bob')
    expect(rel.bond).toBe(35)
  })

  it('clamps bond at 0 on heavy unresolved conflicts', () => {
    const graph = graphWithRelationship({ bond: 3 })
    const updated = recordConflict(graph, 'alice', 'bob', false)
    const rel = getRelationship(updated, 'alice', 'bob')
    expect(rel.bond).toBe(0)
  })

  it('recalculates synergy after conflict', () => {
    const graph = graphWithRelationship({ synergyScore: 70 })
    const updated = recordConflict(graph, 'alice', 'bob', false)
    const rel = getRelationship(updated, 'alice', 'bob')
    expect(typeof rel.synergyScore).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// computeSynergy (tested indirectly via recordCollaboration)
// ---------------------------------------------------------------------------

describe('computeSynergy (via recorded events)', () => {
  it('returns 50 for a brand-new relationship with no collaborations', () => {
    const rel = getRelationship(emptyGraph(), 'alice', 'bob')
    expect(rel.synergyScore).toBe(50)
  })

  it('follows the weighted formula: 60% success + 25% bond + 15% conflict', () => {
    // Create a relationship with known values:
    // 10 collabs, 8 successful => successRate = 0.8
    // bond = 60 => bondFactor = 0.6
    // 2 conflicts with bond > 40 => healthyConflictBonus = 0.7
    // conflictRatio = 2/10 = 0.2 > 0
    //
    // synergy = 0.8*60 + 0.6*25 + 0.7*15 = 48 + 15 + 10.5 = 73.5 => round to 74
    const graph = graphWithRelationship({
      collaborations: 10,
      successfulCollabs: 8,
      conflicts: 2,
      bond: 60,
      synergyScore: 0, // will be recalculated
    })

    // Trigger a recalc via a successful collaboration
    const updated = recordCollaboration(graph, 'alice', 'bob', true)
    const rel = getRelationship(updated, 'alice', 'bob')

    // After the collab: 11 collabs, 9 successful => 9/11 = 0.818
    // bond = 60 + 5 = 65 => 0.65
    // conflicts = 2, conflictRatio = 2/11 > 0, bond 65 > 40 => bonus = 0.7
    // synergy = 0.818*60 + 0.65*25 + 0.7*15 = 49.09 + 16.25 + 10.5 = 75.84 => 76
    expect(rel.synergyScore).toBe(76)
  })

  it('uses low conflict bonus (0.3) when bond is at or below 40', () => {
    // 4 collabs, 2 successful => successRate = 0.5
    // bond = 15 => bondFactor = 0.15
    // 3 conflicts, bond <= 40 => healthyConflictBonus = 0.3
    // conflictRatio = 3/4 > 0
    //
    // We record an unsuccessful collab to trigger recalc:
    // After: 5 collabs, 2 successful => 2/5 = 0.4
    // bond = 15 - 2 = 13 => 0.13
    // conflicts = 3, conflictRatio = 3/5 > 0, bond 13 <= 40 => bonus = 0.3
    // synergy = 0.4*60 + 0.13*25 + 0.3*15 = 24 + 3.25 + 4.5 = 31.75 => 32
    const graph = graphWithRelationship({
      collaborations: 4,
      successfulCollabs: 2,
      conflicts: 3,
      bond: 15,
      synergyScore: 0,
    })

    const updated = recordCollaboration(graph, 'alice', 'bob', false)
    const rel = getRelationship(updated, 'alice', 'bob')
    expect(rel.synergyScore).toBe(32)
  })

  it('high success + high bond yields high synergy', () => {
    let graph = emptyGraph()
    // 10 successful collabs in a row
    for (let i = 0; i < 10; i++) {
      graph = recordCollaboration(graph, 'alice', 'bob', true)
    }
    const rel = getRelationship(graph, 'alice', 'bob')
    expect(rel.synergyScore).toBeGreaterThan(70)
  })

  it('all failures yields low synergy', () => {
    let graph = emptyGraph()
    for (let i = 0; i < 5; i++) {
      graph = recordCollaboration(graph, 'alice', 'bob', false)
    }
    const rel = getRelationship(graph, 'alice', 'bob')
    expect(rel.synergyScore).toBeLessThan(20)
  })
})

// ---------------------------------------------------------------------------
// getTeamHealth
// ---------------------------------------------------------------------------

describe('getTeamHealth', () => {
  it('returns 50 for empty graph', () => {
    expect(getTeamHealth(emptyGraph())).toBe(50)
  })

  it('returns the average synergy across all pairs', () => {
    const graph: RelationshipGraph = {
      teamId: 'team-test',
      relationships: [
        { ...getRelationship(emptyGraph(), 'a', 'b'), synergyScore: 80 },
        { ...getRelationship(emptyGraph(), 'a', 'c'), synergyScore: 60 },
        { ...getRelationship(emptyGraph(), 'b', 'c'), synergyScore: 40 },
      ],
    }
    // Average: (80 + 60 + 40) / 3 = 60
    expect(getTeamHealth(graph)).toBe(60)
  })

  it('returns the exact score for a single relationship', () => {
    const graph = graphWithRelationship({ synergyScore: 73 })
    expect(getTeamHealth(graph)).toBe(73)
  })

  it('rounds to nearest integer', () => {
    const graph: RelationshipGraph = {
      teamId: 'team-test',
      relationships: [
        { ...getRelationship(emptyGraph(), 'a', 'b'), synergyScore: 33 },
        { ...getRelationship(emptyGraph(), 'a', 'c'), synergyScore: 33 },
        { ...getRelationship(emptyGraph(), 'b', 'c'), synergyScore: 34 },
      ],
    }
    // Average: 100/3 = 33.333 => rounds to 33
    expect(getTeamHealth(graph)).toBe(33)
  })
})

// ---------------------------------------------------------------------------
// decayRelationships
// ---------------------------------------------------------------------------

describe('decayRelationships', () => {
  it('drifts bond toward baseline (20) over time', () => {
    const graph = graphWithRelationship({ bond: 80, synergyScore: 70 })
    const decayed = decayRelationships(graph, 30) // 30 days = max factor of 1
    const rel = decayed.relationships[0]

    // bond drifts toward 20: bond + (20 - 80) * 0.1 * 1.0 = 80 - 6 = 74
    expect(rel.bond).toBe(74)
  })

  it('drifts low bond upward toward baseline', () => {
    const graph = graphWithRelationship({ bond: 5, synergyScore: 30 })
    const decayed = decayRelationships(graph, 30)
    const rel = decayed.relationships[0]

    // bond drifts toward 20: 5 + (20 - 5) * 0.1 * 1.0 = 5 + 1.5 = 6.5 => clamp/round = 7
    expect(rel.bond).toBeGreaterThan(5)
  })

  it('drifts synergy toward neutral (50) over time', () => {
    const graph = graphWithRelationship({ synergyScore: 90, bond: 50 })
    const decayed = decayRelationships(graph, 30)
    const rel = decayed.relationships[0]

    // synergy drifts toward 50: 90 + (50 - 90) * 0.05 * 1.0 = 90 - 2 = 88
    expect(rel.synergyScore).toBe(88)
  })

  it('applies proportional decay for shorter periods', () => {
    const graph = graphWithRelationship({ bond: 80, synergyScore: 70 })

    // 15 days => factor = 15/30 = 0.5
    const decayed = decayRelationships(graph, 15)
    const rel = decayed.relationships[0]

    // bond: 80 + (20 - 80) * 0.1 * 0.5 = 80 - 3 = 77
    expect(rel.bond).toBe(77)
  })

  it('caps decay factor at 1 (30+ days treated same as 30)', () => {
    const graph = graphWithRelationship({ bond: 80, synergyScore: 70 })

    const decay30 = decayRelationships(graph, 30)
    const decay90 = decayRelationships(graph, 90)

    expect(decay30.relationships[0].bond).toBe(decay90.relationships[0].bond)
    expect(decay30.relationships[0].synergyScore).toBe(decay90.relationships[0].synergyScore)
  })

  it('does not mutate the original graph', () => {
    const graph = graphWithRelationship({ bond: 80 })
    const decayed = decayRelationships(graph, 30)
    expect(graph.relationships[0].bond).toBe(80)
    expect(decayed.relationships[0].bond).not.toBe(80)
  })

  it('no change at 0 days', () => {
    const graph = graphWithRelationship({ bond: 60, synergyScore: 70 })
    const decayed = decayRelationships(graph, 0)
    expect(decayed.relationships[0].bond).toBe(60)
    expect(decayed.relationships[0].synergyScore).toBe(70)
  })
})
