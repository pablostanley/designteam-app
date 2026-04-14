import { describe, it, expect, vi } from 'vitest'
import { reportOutcome, applyDecay, reinforceAgentMemory, inferMemoryType } from '../src/lifecycle'
import { createDefaultLivingState, DEFAULT_EMOTIONAL_STATE } from '../src/types'
import type { AgentLivingState, RelationshipGraph } from '../src/types'

function makeState(overrides?: Partial<AgentLivingState>): AgentLivingState {
  return { ...createDefaultLivingState('agent-1'), ...overrides }
}

function makeGraph(teamId = 'team-1'): RelationshipGraph {
  return { teamId, relationships: [] }
}

describe('reportOutcome', () => {
  it('awards XP for completed (+10)', () => {
    const result = reportOutcome(makeState(), makeGraph(), 'agent-1', { type: 'completed' })
    expect(result.xpGained).toBe(10)
    expect(result.state.xp).toBe(10)
  })

  it('awards XP for approved (+25)', () => {
    const result = reportOutcome(makeState(), makeGraph(), 'agent-1', { type: 'approved' })
    expect(result.xpGained).toBe(25)
    expect(result.state.xp).toBe(25)
  })

  it('awards 0 XP for rejected', () => {
    const result = reportOutcome(makeState(), makeGraph(), 'agent-1', { type: 'rejected' })
    expect(result.xpGained).toBe(0)
    expect(result.state.xp).toBe(0)
  })

  it('stacks XP from prior state', () => {
    const state = makeState({ xp: 90 })
    const result = reportOutcome(state, makeGraph(), 'agent-1', { type: 'completed' })
    expect(result.state.xp).toBe(100)
  })

  it('detects level-up', () => {
    const state = makeState({ xp: 95, level: 1 })
    const result = reportOutcome(state, makeGraph(), 'agent-1', { type: 'completed' })
    expect(result.leveledUp).toBe(true)
    expect(result.oldLevel).toBe(1)
    expect(result.newLevel).toBe(2)
  })

  it('no level-up when threshold not reached', () => {
    const state = makeState({ xp: 50, level: 1 })
    const result = reportOutcome(state, makeGraph(), 'agent-1', { type: 'completed' })
    expect(result.leveledUp).toBe(false)
    expect(result.newLevel).toBe(1)
  })

  it('increments tasksCompleted on completed', () => {
    const result = reportOutcome(makeState(), makeGraph(), 'agent-1', { type: 'completed' })
    expect(result.state.tasksCompleted).toBe(1)
    expect(result.state.tasksApproved).toBe(0)
  })

  it('increments tasksApproved on approved', () => {
    const result = reportOutcome(makeState(), makeGraph(), 'agent-1', { type: 'approved' })
    expect(result.state.tasksApproved).toBe(1)
  })

  it('does not increment task counts on rejected', () => {
    const result = reportOutcome(makeState(), makeGraph(), 'agent-1', { type: 'rejected' })
    expect(result.state.tasksCompleted).toBe(0)
    expect(result.state.tasksApproved).toBe(0)
  })

  it('applies emotional event', () => {
    const state = makeState()
    const result = reportOutcome(state, makeGraph(), 'agent-1', { type: 'approved' })
    // work_approved: confidence +8, enthusiasm +5, frustration -10
    expect(result.state.emotions.confidence).toBeGreaterThan(state.emotions.confidence)
    expect(result.state.emotions.enthusiasm).toBeGreaterThan(state.emotions.enthusiasm)
  })

  it('adds memory when provided', () => {
    const result = reportOutcome(makeState(), makeGraph(), 'agent-1', {
      type: 'completed',
      memory: 'user prefers dark themes',
    })
    expect(result.state.memory.entries).toHaveLength(1)
    expect(result.state.memory.entries[0].content).toBe('user prefers dark themes')
  })

  it('infers memory type from content', () => {
    const result = reportOutcome(makeState(), makeGraph(), 'agent-1', {
      type: 'completed',
      memory: "don't use gradients",
    })
    expect(result.state.memory.entries[0].type).toBe('feedback')
  })

  it('respects explicit memoryType override', () => {
    const result = reportOutcome(makeState(), makeGraph(), 'agent-1', {
      type: 'completed',
      memory: 'some note',
      memoryType: 'project_context',
    })
    expect(result.state.memory.entries[0].type).toBe('project_context')
  })

  it('records collaboration', () => {
    const result = reportOutcome(makeState(), makeGraph(), 'agent-1', {
      type: 'completed',
      collaboratorId: 'agent-2',
      collaborationSuccessful: true,
    })
    expect(result.graph.relationships).toHaveLength(1)
    const rel = result.graph.relationships[0]
    expect(rel.collaborations).toBe(1)
    expect(rel.successfulCollabs).toBe(1)
  })

  it('infers collaboration success from outcome type', () => {
    const approved = reportOutcome(makeState(), makeGraph(), 'agent-1', {
      type: 'approved',
      collaboratorId: 'agent-2',
    })
    expect(approved.graph.relationships[0].successfulCollabs).toBe(1)

    const rejected = reportOutcome(makeState(), makeGraph(), 'agent-1', {
      type: 'rejected',
      collaboratorId: 'agent-2',
    })
    expect(rejected.graph.relationships[0].successfulCollabs).toBe(0)
  })

  it('updates lastActiveAt', () => {
    const state = makeState({ lastActiveAt: '2020-01-01T00:00:00.000Z' })
    const result = reportOutcome(state, makeGraph(), 'agent-1', { type: 'completed' })
    expect(new Date(result.state.lastActiveAt).getTime()).toBeGreaterThan(new Date('2020-01-01').getTime())
  })

  it('returns mood string', () => {
    const result = reportOutcome(makeState(), makeGraph(), 'agent-1', { type: 'completed' })
    expect(typeof result.mood).toBe('string')
    expect(result.mood.length).toBeGreaterThan(0)
  })

  it('is pure — does not mutate input state', () => {
    const state = makeState()
    const graph = makeGraph()
    const originalXp = state.xp
    const originalRels = graph.relationships.length
    reportOutcome(state, graph, 'agent-1', { type: 'completed', memory: 'test', collaboratorId: 'agent-2' })
    expect(state.xp).toBe(originalXp)
    expect(graph.relationships.length).toBe(originalRels)
  })
})

describe('applyDecay', () => {
  it('returns unchanged state for just-active agent', () => {
    const state = makeState({ lastActiveAt: new Date().toISOString() })
    const { state: decayed } = applyDecay(state, makeGraph())
    expect(decayed.emotions).toEqual(state.emotions)
  })

  it('decays emotions over time', () => {
    const hourAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const state = makeState({
      lastActiveAt: hourAgo,
      emotions: { energy: 40, confidence: 60, enthusiasm: 80, frustration: 60, inspiration: 80 },
    })
    const { state: decayed } = applyDecay(state, makeGraph())
    // Frustration should decay toward 0
    expect(decayed.emotions.frustration).toBeLessThan(60)
    // Energy should drift toward 70
    expect(decayed.emotions.energy).toBeGreaterThan(40)
  })

  it('decays relationships after extended inactivity', () => {
    const weeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const state = makeState({ lastActiveAt: weeksAgo })
    const graph: RelationshipGraph = {
      teamId: 'team-1',
      relationships: [{
        agentA: 'agent-1', agentB: 'agent-2',
        collaborations: 5, successfulCollabs: 4, conflicts: 0,
        synergyScore: 80, bond: 80,
        lastInteraction: weeksAgo,
        sharedInsights: [],
      }],
    }
    const { graph: decayed } = applyDecay(state, graph)
    // Bond should drift toward 20 baseline
    expect(decayed.relationships[0].bond).toBeLessThan(80)
  })

  it('does not decay relationships for recent activity', () => {
    const state = makeState({ lastActiveAt: new Date().toISOString() })
    const graph: RelationshipGraph = {
      teamId: 'team-1',
      relationships: [{
        agentA: 'agent-1', agentB: 'agent-2',
        collaborations: 5, successfulCollabs: 4, conflicts: 0,
        synergyScore: 80, bond: 80,
        lastInteraction: new Date().toISOString(),
        sharedInsights: [],
      }],
    }
    const { graph: decayed } = applyDecay(state, graph)
    expect(decayed.relationships[0].bond).toBe(80)
  })
})

describe('reinforceAgentMemory', () => {
  it('boosts salience of a memory', () => {
    const state = makeState()
    state.memory.entries = [{
      id: 'mem-1', type: 'design_preference', content: 'test',
      createdAt: new Date().toISOString(), lastRelevantAt: new Date().toISOString(),
      salience: 0.5,
    }]
    const result = reinforceAgentMemory(state, 'mem-1')
    expect(result.memory.entries[0].salience).toBe(0.65) // 0.5 + 0.15 default boost
  })

  it('caps salience at 1.0', () => {
    const state = makeState()
    state.memory.entries = [{
      id: 'mem-1', type: 'design_preference', content: 'test',
      createdAt: new Date().toISOString(), lastRelevantAt: new Date().toISOString(),
      salience: 0.95,
    }]
    const result = reinforceAgentMemory(state, 'mem-1', 0.15)
    expect(result.memory.entries[0].salience).toBe(1.0)
  })
})

describe('inferMemoryType', () => {
  it('detects feedback from "don\'t" pattern', () => {
    expect(inferMemoryType("don't use gradients")).toBe('feedback')
  })

  it('detects feedback from "wrong" pattern', () => {
    expect(inferMemoryType("the spacing is wrong")).toBe('feedback')
  })

  it('detects project context from "brand" pattern', () => {
    expect(inferMemoryType("brand colors are blue and gold")).toBe('project_context')
  })

  it('detects project context from "audience" pattern', () => {
    expect(inferMemoryType("target audience is developers")).toBe('project_context')
  })

  it('detects skill growth from "learned" pattern', () => {
    expect(inferMemoryType("learned to use grid layouts")).toBe('skill_growth')
  })

  it('defaults to design_preference', () => {
    expect(inferMemoryType("prefers dark mode with warm accents")).toBe('design_preference')
  })

  it('defaults for generic content', () => {
    expect(inferMemoryType("something about the project")).toBe('design_preference')
  })
})
