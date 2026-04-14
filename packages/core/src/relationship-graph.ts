/**
 * Relationship Graph — agent-to-agent bonds that compound over time
 *
 * Tracks how agents work together: collaboration count, success rate,
 * conflicts, synergy scores, and emotional bonds. Agents that work
 * well together develop stronger bonds and produce better results.
 *
 * Zero Efecto imports — standalone.
 */

import type { AgentRelationship, RelationshipGraph } from './types'

// ---------------------------------------------------------------------------
// Graph CRUD
// ---------------------------------------------------------------------------

/**
 * Get the canonical key for a relationship (alphabetical order).
 */
function relationshipKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

/**
 * Get or create a relationship between two agents.
 */
export function getRelationship(
  graph: RelationshipGraph,
  agentA: string,
  agentB: string,
): AgentRelationship {
  const [a, b] = relationshipKey(agentA, agentB)
  const existing = graph.relationships.find(
    (r) => r.agentA === a && r.agentB === b,
  )

  if (existing) return existing

  return {
    agentA: a,
    agentB: b,
    collaborations: 0,
    successfulCollabs: 0,
    conflicts: 0,
    synergyScore: 50, // neutral starting point
    bond: 20,          // slight warmth (they're on the same team)
    lastInteraction: new Date().toISOString(),
    sharedInsights: [],
  }
}

/**
 * Update a relationship in the graph (upserts).
 */
function upsertRelationship(
  graph: RelationshipGraph,
  rel: AgentRelationship,
): RelationshipGraph {
  const idx = graph.relationships.findIndex(
    (r) => r.agentA === rel.agentA && r.agentB === rel.agentB,
  )

  const relationships =
    idx >= 0
      ? graph.relationships.map((r, i) => (i === idx ? rel : r))
      : [...graph.relationships, rel]

  return { ...graph, relationships }
}

// ---------------------------------------------------------------------------
// Relationship Events
// ---------------------------------------------------------------------------

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

/**
 * Record a successful collaboration (work approved without revision).
 */
export function recordCollaboration(
  graph: RelationshipGraph,
  agentA: string,
  agentB: string,
  successful: boolean,
  insight?: string,
): RelationshipGraph {
  const rel = getRelationship(graph, agentA, agentB)

  const updated: AgentRelationship = {
    ...rel,
    collaborations: rel.collaborations + 1,
    successfulCollabs: rel.successfulCollabs + (successful ? 1 : 0),
    bond: clamp(rel.bond + (successful ? 5 : -2)),
    lastInteraction: new Date().toISOString(),
    sharedInsights: insight
      ? [...rel.sharedInsights.slice(-9), insight] // keep last 10
      : rel.sharedInsights,
  }

  // Recompute synergy
  updated.synergyScore = computeSynergy(updated)

  return upsertRelationship(graph, updated)
}

/**
 * Record a conflict between agents (disagreed on approach).
 */
export function recordConflict(
  graph: RelationshipGraph,
  agentA: string,
  agentB: string,
  resolved: boolean,
): RelationshipGraph {
  const rel = getRelationship(graph, agentA, agentB)

  const updated: AgentRelationship = {
    ...rel,
    conflicts: rel.conflicts + 1,
    // Resolved conflicts can strengthen bonds (healthy disagreement)
    bond: clamp(rel.bond + (resolved ? 2 : -5)),
    lastInteraction: new Date().toISOString(),
  }

  updated.synergyScore = computeSynergy(updated)
  return upsertRelationship(graph, updated)
}

/**
 * Compute synergy score from collaboration history.
 *
 * Formula weights:
 * - Success rate (60%): how often their collabs succeed
 * - Bond strength (25%): emotional connection
 * - Conflict resolution (15%): healthy disagreement ratio
 */
function computeSynergy(rel: AgentRelationship): number {
  if (rel.collaborations === 0) return 50 // neutral

  const successRate = rel.successfulCollabs / rel.collaborations
  const conflictRatio = rel.conflicts / rel.collaborations
  // Resolved conflicts are when bond didn't drop despite conflicts
  const healthyConflictBonus = conflictRatio > 0 && rel.bond > 40 ? 0.7 : 0.3

  const score =
    successRate * 60 +
    (rel.bond / 100) * 25 +
    healthyConflictBonus * 15

  return clamp(Math.round(score))
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get all relationships for a specific agent, sorted by synergy score.
 */
export function getAgentRelationships(
  graph: RelationshipGraph,
  agentId: string,
): AgentRelationship[] {
  return graph.relationships
    .filter((r) => r.agentA === agentId || r.agentB === agentId)
    .sort((a, b) => b.synergyScore - a.synergyScore)
}

/**
 * Get the strongest partner for an agent.
 */
export function getBestPartner(
  graph: RelationshipGraph,
  agentId: string,
): AgentRelationship | null {
  const rels = getAgentRelationships(graph, agentId)
  return rels.length > 0 ? rels[0] : null
}

/**
 * Get relationships that need attention (low bond, high conflict).
 */
export function getTroubledRelationships(
  graph: RelationshipGraph,
): AgentRelationship[] {
  return graph.relationships
    .filter((r) => r.bond < 30 || (r.conflicts > 3 && r.synergyScore < 40))
    .sort((a, b) => a.synergyScore - b.synergyScore)
}

/**
 * Get the overall team health score (average synergy across all pairs).
 */
export function getTeamHealth(graph: RelationshipGraph): number {
  if (graph.relationships.length === 0) return 50
  const total = graph.relationships.reduce((sum, r) => sum + r.synergyScore, 0)
  return Math.round(total / graph.relationships.length)
}

// ---------------------------------------------------------------------------
// Prompt Generation
// ---------------------------------------------------------------------------

/**
 * Generate a prompt fragment about this agent's relationships.
 * Helps the agent understand team dynamics when collaborating.
 */
export function relationshipsToPromptFragment(
  graph: RelationshipGraph,
  agentId: string,
  agentNames: Record<string, string>,
): string {
  const rels = getAgentRelationships(graph, agentId)
  if (rels.length === 0) return ''

  const lines = rels.map((r) => {
    const otherId = r.agentA === agentId ? r.agentB : r.agentA
    const otherName = agentNames[otherId] ?? otherId
    const quality = r.synergyScore >= 70 ? 'strong' : r.synergyScore >= 40 ? 'developing' : 'strained'
    const insights = r.sharedInsights.length > 0
      ? ` Key insight: "${r.sharedInsights[r.sharedInsights.length - 1]}"`
      : ''

    return `- **${otherName}**: ${quality} working relationship (${r.collaborations} collabs, ${r.successfulCollabs} successful).${insights}`
  })

  return `## TEAM RELATIONSHIPS\n\n${lines.join('\n')}\n\nLeverage strong relationships. Be mindful of strained ones — seek clarity before acting.`
}

// ---------------------------------------------------------------------------
// Decay
// ---------------------------------------------------------------------------

/**
 * Apply natural bond decay over time. Unused relationships fade.
 */
export function decayRelationships(
  graph: RelationshipGraph,
  daysSinceLastSession: number,
): RelationshipGraph {
  const factor = Math.min(daysSinceLastSession / 30, 1) // max 1 month of decay

  return {
    ...graph,
    relationships: graph.relationships.map((r) => ({
      ...r,
      // Bond drifts toward 20 (baseline teammate warmth)
      bond: clamp(r.bond + (20 - r.bond) * 0.1 * factor),
      // Synergy is more stable — only slight decay
      synergyScore: clamp(r.synergyScore + (50 - r.synergyScore) * 0.05 * factor),
    })),
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createRelationshipGraph(teamId: string): RelationshipGraph {
  return { teamId, relationships: [] }
}
