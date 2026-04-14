import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AgentMemory } from '../src/types'
import { MEMORY_MIN_SALIENCE } from '../src/types'
import {
  addMemory,
  reinforceMemory,
  decayMemories,
  getTopMemories,
  memoryToPromptFragment,
  extractPotentialMemories,
} from '../src/memory-system'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyMemory(maxEntries = 100): AgentMemory {
  return { agentId: 'agent-test', entries: [], maxEntries }
}

function seededMemory(count: number, maxEntries = 100): AgentMemory {
  let mem = emptyMemory(maxEntries)
  for (let i = 0; i < count; i++) {
    mem = addMemory(mem, 'design_preference', `memory-${i}`, {
      salience: 0.5 + i * 0.01,
    })
  }
  return mem
}

// ---------------------------------------------------------------------------
// addMemory
// ---------------------------------------------------------------------------

describe('addMemory', () => {
  it('adds a memory entry to an empty store', () => {
    const mem = addMemory(emptyMemory(), 'feedback', 'User likes blue')
    expect(mem.entries).toHaveLength(1)
    expect(mem.entries[0].type).toBe('feedback')
    expect(mem.entries[0].content).toBe('User likes blue')
  })

  it('assigns default salience of 0.7 when none provided', () => {
    const mem = addMemory(emptyMemory(), 'feedback', 'test')
    expect(mem.entries[0].salience).toBe(0.7)
  })

  it('uses custom salience when provided', () => {
    const mem = addMemory(emptyMemory(), 'feedback', 'test', { salience: 0.95 })
    expect(mem.entries[0].salience).toBe(0.95)
  })

  it('attaches relatedAgentId and projectId when provided', () => {
    const mem = addMemory(emptyMemory(), 'relationship', 'good collab', {
      relatedAgentId: 'agent-2',
      projectId: 'proj-1',
    })
    expect(mem.entries[0].relatedAgentId).toBe('agent-2')
    expect(mem.entries[0].projectId).toBe('proj-1')
  })

  it('sets createdAt and lastRelevantAt to current time', () => {
    const before = new Date().toISOString()
    const mem = addMemory(emptyMemory(), 'feedback', 'test')
    const after = new Date().toISOString()
    expect(mem.entries[0].createdAt >= before).toBe(true)
    expect(mem.entries[0].lastRelevantAt <= after).toBe(true)
  })

  it('prunes lowest-salience entries when maxEntries is reached', () => {
    // Fill up to capacity of 3
    const mem = seededMemory(3, 3)
    expect(mem.entries).toHaveLength(3)

    // Add one more with high salience — should evict the lowest
    const updated = addMemory(mem, 'feedback', 'important', { salience: 0.99 })
    expect(updated.entries).toHaveLength(3)
    // The lowest-salience entry (memory-0 at 0.50) should be gone
    const contents = updated.entries.map((e) => e.content)
    expect(contents).not.toContain('memory-0')
    expect(contents).toContain('important')
  })

  it('does not exceed maxEntries even when adding many at once', () => {
    let mem = emptyMemory(5)
    for (let i = 0; i < 10; i++) {
      mem = addMemory(mem, 'feedback', `entry-${i}`, { salience: i * 0.1 })
    }
    expect(mem.entries.length).toBeLessThanOrEqual(5)
  })

  it('does not mutate the original memory', () => {
    const original = emptyMemory()
    const updated = addMemory(original, 'feedback', 'new entry')
    expect(original.entries).toHaveLength(0)
    expect(updated.entries).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// reinforceMemory
// ---------------------------------------------------------------------------

describe('reinforceMemory', () => {
  it('boosts salience by default amount (0.15)', () => {
    const mem = addMemory(emptyMemory(), 'feedback', 'test', { salience: 0.5 })
    const id = mem.entries[0].id
    const reinforced = reinforceMemory(mem, id)
    expect(reinforced.entries[0].salience).toBeCloseTo(0.65, 5)
  })

  it('uses custom boost amount', () => {
    const mem = addMemory(emptyMemory(), 'feedback', 'test', { salience: 0.5 })
    const id = mem.entries[0].id
    const reinforced = reinforceMemory(mem, id, 0.3)
    expect(reinforced.entries[0].salience).toBeCloseTo(0.8, 5)
  })

  it('caps salience at 1.0', () => {
    const mem = addMemory(emptyMemory(), 'feedback', 'test', { salience: 0.95 })
    const id = mem.entries[0].id
    const reinforced = reinforceMemory(mem, id, 0.5)
    expect(reinforced.entries[0].salience).toBe(1)
  })

  it('updates lastRelevantAt', () => {
    const mem = addMemory(emptyMemory(), 'feedback', 'test')
    const id = mem.entries[0].id
    const originalTimestamp = mem.entries[0].lastRelevantAt

    // Small delay to ensure different timestamp
    const reinforced = reinforceMemory(mem, id)
    expect(reinforced.entries[0].lastRelevantAt >= originalTimestamp).toBe(true)
  })

  it('only affects the targeted memory', () => {
    let mem = addMemory(emptyMemory(), 'feedback', 'first', { salience: 0.5 })
    mem = addMemory(mem, 'feedback', 'second', { salience: 0.5 })
    const firstId = mem.entries[0].id

    const reinforced = reinforceMemory(mem, firstId, 0.2)
    expect(reinforced.entries[0].salience).toBeCloseTo(0.7, 5)
    expect(reinforced.entries[1].salience).toBeCloseTo(0.5, 5)
  })

  it('is a no-op for non-existent memory id', () => {
    const mem = addMemory(emptyMemory(), 'feedback', 'test', { salience: 0.5 })
    const reinforced = reinforceMemory(mem, 'non-existent-id')
    expect(reinforced.entries[0].salience).toBe(0.5)
  })
})

// ---------------------------------------------------------------------------
// decayMemories
// ---------------------------------------------------------------------------

describe('decayMemories', () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reduces salience based on days since last relevance', () => {
    const mem = addMemory(emptyMemory(), 'feedback', 'test', { salience: 0.8 })

    // Advance time by 10 days
    vi.advanceTimersByTime(10 * ONE_DAY_MS)

    const decayed = decayMemories(mem)
    // decay = 0.02 * 10 = 0.20, so 0.8 - 0.2 = 0.6
    expect(decayed.entries[0].salience).toBeCloseTo(0.6, 1)
  })

  it('does not decay below MEMORY_MIN_SALIENCE', () => {
    const mem = addMemory(emptyMemory(), 'feedback', 'test', { salience: 0.15 })

    // Advance time by 30 days — enough to decay well past minimum
    vi.advanceTimersByTime(30 * ONE_DAY_MS)

    const decayed = decayMemories(mem)
    expect(decayed.entries[0].salience).toBe(MEMORY_MIN_SALIENCE)
  })

  it('does not decay memories that were just relevant', () => {
    const mem = addMemory(emptyMemory(), 'feedback', 'test', { salience: 0.7 })
    // No time advance — decay should be ~0
    const decayed = decayMemories(mem)
    expect(decayed.entries[0].salience).toBeCloseTo(0.7, 1)
  })

  it('decays all entries independently', () => {
    let mem = emptyMemory()
    mem = addMemory(mem, 'feedback', 'old', { salience: 0.9 })

    // Advance 5 days, then add a "newer" memory
    vi.advanceTimersByTime(5 * ONE_DAY_MS)
    mem = addMemory(mem, 'feedback', 'new', { salience: 0.9 })

    // Advance another 5 days (total 10 from first, 5 from second)
    vi.advanceTimersByTime(5 * ONE_DAY_MS)

    const decayed = decayMemories(mem)
    // "old" decayed for ~10 days: 0.9 - 0.02*10 = 0.7
    // "new" decayed for ~5 days: 0.9 - 0.02*5 = 0.8
    expect(decayed.entries[0].salience).toBeLessThan(decayed.entries[1].salience)
  })
})

// ---------------------------------------------------------------------------
// getTopMemories
// ---------------------------------------------------------------------------

describe('getTopMemories', () => {
  it('returns memories sorted by salience descending', () => {
    let mem = emptyMemory()
    mem = addMemory(mem, 'feedback', 'low', { salience: 0.3 })
    mem = addMemory(mem, 'feedback', 'high', { salience: 0.9 })
    mem = addMemory(mem, 'feedback', 'mid', { salience: 0.6 })

    const top = getTopMemories(mem)
    expect(top[0].content).toBe('high')
    expect(top[1].content).toBe('mid')
    expect(top[2].content).toBe('low')
  })

  it('limits results to the requested count', () => {
    const mem = seededMemory(10)
    const top = getTopMemories(mem, 3)
    expect(top).toHaveLength(3)
  })

  it('returns all entries when count exceeds entry count', () => {
    const mem = seededMemory(2)
    const top = getTopMemories(mem, 50)
    expect(top).toHaveLength(2)
  })

  it('returns empty array for empty memory', () => {
    const top = getTopMemories(emptyMemory())
    expect(top).toEqual([])
  })

  it('defaults to 10 entries', () => {
    const mem = seededMemory(15)
    const top = getTopMemories(mem)
    expect(top).toHaveLength(10)
  })
})

// ---------------------------------------------------------------------------
// memoryToPromptFragment
// ---------------------------------------------------------------------------

describe('memoryToPromptFragment', () => {
  it('returns empty string for empty memory', () => {
    expect(memoryToPromptFragment(emptyMemory())).toBe('')
  })

  it('returns formatted string with AGENT MEMORY header', () => {
    const mem = addMemory(emptyMemory(), 'feedback', 'User dislikes red')
    const fragment = memoryToPromptFragment(mem)
    expect(fragment).toContain('## AGENT MEMORY')
    expect(fragment).toContain('User dislikes red')
  })

  it('groups memories by type label', () => {
    let mem = emptyMemory()
    mem = addMemory(mem, 'design_preference', 'Prefers dark mode', { salience: 0.9 })
    mem = addMemory(mem, 'feedback', 'Hated the red button', { salience: 0.8 })
    mem = addMemory(mem, 'project_context', 'Building a fintech app', { salience: 0.7 })

    const fragment = memoryToPromptFragment(mem)
    expect(fragment).toContain('**Design Preferences:**')
    expect(fragment).toContain('**Past Feedback:**')
    expect(fragment).toContain('**Project Context:**')
  })

  it('respects maxEntries parameter', () => {
    let mem = emptyMemory()
    for (let i = 0; i < 10; i++) {
      mem = addMemory(mem, 'feedback', `feedback-${i}`, { salience: 0.5 + i * 0.05 })
    }

    const fragment = memoryToPromptFragment(mem, 3)
    // Only the top 3 should appear
    expect(fragment).toContain('feedback-9')
    expect(fragment).toContain('feedback-8')
    expect(fragment).toContain('feedback-7')
    expect(fragment).not.toContain('feedback-0')
  })

  it('includes the instructional footer', () => {
    const mem = addMemory(emptyMemory(), 'feedback', 'test')
    const fragment = memoryToPromptFragment(mem)
    expect(fragment).toContain('Use these memories to inform your work')
  })
})

// ---------------------------------------------------------------------------
// extractPotentialMemories
// ---------------------------------------------------------------------------

describe('extractPotentialMemories', () => {
  it('extracts design preferences from "I like" patterns', () => {
    const results = extractPotentialMemories('I like rounded corners', '')
    const pref = results.find((r) => r.type === 'design_preference')
    expect(pref).toBeDefined()
    expect(pref!.content).toContain('I like rounded corners')
  })

  it('extracts design preferences from "I prefer" patterns', () => {
    const results = extractPotentialMemories('I prefer dark backgrounds', '')
    const pref = results.find((r) => r.type === 'design_preference')
    expect(pref).toBeDefined()
    expect(pref!.content).toContain('I prefer dark backgrounds')
  })

  it('extracts feedback corrections from negative language', () => {
    const results = extractPotentialMemories("don't use that font", '')
    const fb = results.find((r) => r.type === 'feedback')
    expect(fb).toBeDefined()
    expect(fb!.salience).toBe(0.85)
  })

  it('extracts project context from "this is for" patterns', () => {
    const results = extractPotentialMemories('this is for a healthcare startup', '')
    const ctx = results.find((r) => r.type === 'project_context')
    expect(ctx).toBeDefined()
  })

  it('extracts project context from "the brand is" patterns', () => {
    const results = extractPotentialMemories('the brand is playful and bold', '')
    const ctx = results.find((r) => r.type === 'project_context')
    expect(ctx).toBeDefined()
  })

  it('extracts design decisions from agent responses', () => {
    const results = extractPotentialMemories('', 'I went with a dark palette for contrast')
    const decision = results.find((r) => r.type === 'design_preference')
    expect(decision).toBeDefined()
    expect(decision!.content).toContain('Design decision')
  })

  it('extracts industry context from agent responses', () => {
    const results = extractPotentialMemories('', 'This fintech company needs a trustworthy look')
    const ctx = results.find((r) => r.type === 'project_context')
    expect(ctx).toBeDefined()
    expect(ctx!.content).toContain('fintech')
  })

  it('limits results to max 3 per turn', () => {
    // Combine multiple triggers
    const results = extractPotentialMemories(
      "I like blue. I prefer sans-serif. Don't use gradients. This is for a saas product.",
      'I chose a dark theme for the fintech startup.',
    )
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('returns empty array when no patterns match', () => {
    const results = extractPotentialMemories('hello', 'hi there')
    expect(results).toEqual([])
  })
})
