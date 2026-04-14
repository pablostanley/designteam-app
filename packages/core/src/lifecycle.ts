/**
 * Lifecycle — the living loop that makes agents alive.
 *
 * High-level functions that update agent state in response to outcomes.
 * Composes emotions, memory, relationships, and XP into single calls.
 *
 * Used by:
 * - CLI (`designteam report`)
 * - Efecto (after swarm tasks)
 * - Any tool via @designteam/core
 */

import type {
  AgentLivingState,
  EmotionalEvent,
  RelationshipGraph,
  MemoryType,
} from './types'
import { xpToLevel } from './types'
import { applyEmotionalEvent, applyEmotionalDecay, getMood } from './emotional-model'
import { addMemory, decayMemories, reinforceMemory } from './memory-system'
import { recordCollaboration, decayRelationships } from './relationship-graph'

// ---------------------------------------------------------------------------
// Outcome types
// ---------------------------------------------------------------------------

export type OutcomeType =
  | 'completed'
  | 'approved'
  | 'rejected'
  | 'praised'
  | 'creative_freedom'
  | 'new_project'

export interface ReportOutcome {
  type: OutcomeType
  memory?: string
  memoryType?: MemoryType
  collaboratorId?: string
  collaborationSuccessful?: boolean
  collaborationInsight?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const XP_AWARDS: Record<OutcomeType, number> = {
  completed: 10,
  approved: 25,
  rejected: 0,
  praised: 15,
  creative_freedom: 5,
  new_project: 5,
}

const OUTCOME_TO_EMOTION: Record<OutcomeType, EmotionalEvent> = {
  completed: 'work_completed',
  approved: 'work_approved',
  rejected: 'work_rejected',
  praised: 'praised',
  creative_freedom: 'creative_freedom',
  new_project: 'new_project',
}

// ---------------------------------------------------------------------------
// reportOutcome — THE function that makes agents alive
// ---------------------------------------------------------------------------

export interface ReportResult {
  state: AgentLivingState
  graph: RelationshipGraph
  xpGained: number
  leveledUp: boolean
  oldLevel: number
  newLevel: number
  mood: string
}

/**
 * Report an outcome for an agent.
 * Handles XP, emotions, level-up, memory, relationships in one call.
 * Pure function — takes state in, returns new state out. Caller persists.
 */
export function reportOutcome(
  state: AgentLivingState,
  graph: RelationshipGraph,
  agentId: string,
  outcome: ReportOutcome,
): ReportResult {
  let emotions = { ...state.emotions }
  let memory = state.memory
  let newGraph = { ...graph, relationships: [...graph.relationships] }

  // 1. XP
  const xpGained = XP_AWARDS[outcome.type] ?? 0
  const oldLevel = state.level
  const newXp = state.xp + xpGained
  const newLevel = xpToLevel(newXp)

  // 2. Emotions
  const event = OUTCOME_TO_EMOTION[outcome.type]
  if (event) {
    emotions = applyEmotionalEvent(emotions, event)
  }

  // 3. Task counts
  let tasksCompleted = state.tasksCompleted
  let tasksApproved = state.tasksApproved
  if (outcome.type === 'completed') tasksCompleted += 1
  if (outcome.type === 'approved') tasksApproved += 1

  // 4. Memory
  if (outcome.memory) {
    const memType = outcome.memoryType ?? inferMemoryType(outcome.memory)
    const salience = memType === 'feedback' ? 0.85 : 0.7
    memory = addMemory(memory, memType, outcome.memory, { salience })
  }

  // 5. Relationships
  if (outcome.collaboratorId) {
    const successful = outcome.collaborationSuccessful ??
      (outcome.type === 'approved' ? true : outcome.type === 'rejected' ? false : true)
    newGraph = recordCollaboration(
      newGraph, agentId, outcome.collaboratorId,
      successful, outcome.collaborationInsight,
    )
  }

  const newState: AgentLivingState = {
    emotions,
    memory,
    mailbox: state.mailbox,
    tasksCompleted,
    tasksApproved,
    xp: newXp,
    level: newLevel,
    lastActiveAt: new Date().toISOString(),
  }

  return {
    state: newState,
    graph: newGraph,
    xpGained,
    leveledUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
    mood: getMood(emotions),
  }
}

// ---------------------------------------------------------------------------
// applyDecay — time-based drift for emotions, memories, relationships
// ---------------------------------------------------------------------------

/**
 * Apply time-based decay to agent state.
 * Call on every read (roster, status, check) to keep state fresh.
 * Pure function — caller persists.
 */
export function applyDecay(
  state: AgentLivingState,
  graph: RelationshipGraph,
): { state: AgentLivingState; graph: RelationshipGraph } {
  const lastActiveMs = new Date(state.lastActiveAt).getTime()
  // Guard against invalid dates
  if (isNaN(lastActiveMs)) return { state, graph }

  const hoursSinceActive = Math.max(0, (Date.now() - lastActiveMs) / (1000 * 60 * 60))

  // Skip decay if less than 5 minutes — avoids pointless writes on rapid reads
  if (hoursSinceActive < 0.083) return { state, graph }

  const daysSinceActive = hoursSinceActive / 24

  const newState: AgentLivingState = {
    ...state,
    emotions: applyEmotionalDecay(state.emotions, hoursSinceActive),
    memory: decayMemories(state.memory),
  }

  const newGraph = daysSinceActive > 0.5
    ? decayRelationships(graph, daysSinceActive)
    : graph

  return { state: newState, graph: newGraph }
}

// ---------------------------------------------------------------------------
// reinforceAgentMemory
// ---------------------------------------------------------------------------

export function reinforceAgentMemory(
  state: AgentLivingState,
  memoryId: string,
  boost?: number,
): AgentLivingState {
  return { ...state, memory: reinforceMemory(state.memory, memoryId, boost) }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function inferMemoryType(content: string): MemoryType {
  const lower = content.toLowerCase()

  if (/\b(don't|not|stop|wrong|change|fix)\b/.test(lower)) return 'feedback'
  if (/\b(brand|client|project|audience|target|deadline)\b/.test(lower)) return 'project_context'
  if (/\b(learned|improved|better at)\b/.test(lower)) return 'skill_growth'

  return 'design_preference'
}
