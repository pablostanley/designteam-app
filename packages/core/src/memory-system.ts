/**
 * Memory System — agents learn and remember across sessions
 *
 * Each agent builds a personal knowledge base of design preferences,
 * user feedback, project context, and relationship observations.
 * Memories have salience that decays over time — important memories
 * get reinforced, stale ones get pruned.
 *
 * Zero Efecto imports — standalone.
 */

import type { AgentMemory, AgentMemoryEntry, MemoryType } from './types'
import { MAX_MEMORY_ENTRIES, MEMORY_SALIENCE_DECAY, MEMORY_MIN_SALIENCE } from './types'

// ---------------------------------------------------------------------------
// Memory CRUD
// ---------------------------------------------------------------------------

let _memCounter = 0
function memoryId(): string {
  return `mem-${Date.now()}-${++_memCounter}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Add a new memory entry. If at capacity, prunes lowest-salience entries first.
 */
export function addMemory(
  memory: AgentMemory,
  type: MemoryType,
  content: string,
  opts?: { salience?: number; relatedAgentId?: string; projectId?: string },
): AgentMemory {
  const now = new Date().toISOString()
  const entry: AgentMemoryEntry = {
    id: memoryId(),
    type,
    content,
    createdAt: now,
    lastRelevantAt: now,
    salience: opts?.salience ?? 0.7,
    relatedAgentId: opts?.relatedAgentId,
    projectId: opts?.projectId,
  }

  let entries = [...memory.entries, entry]

  // Prune if over capacity
  if (entries.length > memory.maxEntries) {
    entries = pruneMemories(entries, memory.maxEntries)
  }

  return { ...memory, entries }
}

/**
 * Reinforce an existing memory — bump its salience and update lastRelevantAt.
 * Call this when a memory proves useful (e.g., user confirms a preference).
 */
export function reinforceMemory(
  memory: AgentMemory,
  memoryId: string,
  boost?: number,
): AgentMemory {
  const now = new Date().toISOString()
  return {
    ...memory,
    entries: memory.entries.map((e) =>
      e.id === memoryId
        ? {
            ...e,
            salience: Math.min(1, e.salience + (boost ?? 0.15)),
            lastRelevantAt: now,
          }
        : e,
    ),
  }
}

/**
 * Apply salience decay based on time since last relevance.
 * Call this at session start to keep memories fresh.
 */
export function decayMemories(memory: AgentMemory): AgentMemory {
  const now = Date.now()
  return {
    ...memory,
    entries: memory.entries.map((e) => {
      const daysSinceRelevant =
        (now - new Date(e.lastRelevantAt).getTime()) / (1000 * 60 * 60 * 24)
      const decay = MEMORY_SALIENCE_DECAY * daysSinceRelevant
      return {
        ...e,
        salience: Math.max(MEMORY_MIN_SALIENCE, e.salience - decay),
      }
    }),
  }
}

/**
 * Remove lowest-salience memories when over capacity.
 * Always removes exactly `entries.length - maxEntries` entries.
 */
function pruneMemories(
  entries: AgentMemoryEntry[],
  maxEntries: number,
): AgentMemoryEntry[] {
  if (entries.length <= maxEntries) return entries

  // Sort by salience ascending — remove from the bottom
  const sorted = [...entries].sort((a, b) => a.salience - b.salience)
  const toRemove = entries.length - maxEntries
  const removeIds = new Set(sorted.slice(0, toRemove).map((e) => e.id))
  return entries.filter((e) => !removeIds.has(e.id))
}

// ---------------------------------------------------------------------------
// Memory Retrieval
// ---------------------------------------------------------------------------

/**
 * Get memories of a specific type, sorted by salience (highest first).
 */
export function getMemoriesByType(
  memory: AgentMemory,
  type: MemoryType,
): AgentMemoryEntry[] {
  return memory.entries
    .filter((e) => e.type === type)
    .sort((a, b) => b.salience - a.salience)
}

/**
 * Get memories related to a specific agent (for relationship context).
 */
export function getMemoriesAboutAgent(
  memory: AgentMemory,
  agentId: string,
): AgentMemoryEntry[] {
  return memory.entries
    .filter((e) => e.relatedAgentId === agentId)
    .sort((a, b) => b.salience - a.salience)
}

/**
 * Get the most salient memories across all types (top-k).
 */
export function getTopMemories(
  memory: AgentMemory,
  count = 10,
): AgentMemoryEntry[] {
  return [...memory.entries]
    .sort((a, b) => b.salience - a.salience)
    .slice(0, count)
}

/**
 * Search memories by content (simple substring match).
 */
export function searchMemories(
  memory: AgentMemory,
  query: string,
): AgentMemoryEntry[] {
  const lower = query.toLowerCase()
  return memory.entries
    .filter((e) => e.content.toLowerCase().includes(lower))
    .sort((a, b) => b.salience - a.salience)
}

// ---------------------------------------------------------------------------
// Prompt Generation
// ---------------------------------------------------------------------------

/**
 * Generate a prompt fragment from an agent's most important memories.
 * Injected into the system prompt so the agent "remembers" context.
 */
export function memoryToPromptFragment(
  memory: AgentMemory,
  maxEntries = 8,
): string {
  const top = getTopMemories(memory, maxEntries)
  if (top.length === 0) return ''

  const grouped: Record<string, string[]> = {}
  for (const entry of top) {
    const label = memoryTypeLabel(entry.type)
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(entry.content)
  }

  const sections = Object.entries(grouped)
    .map(([label, items]) => `**${label}:**\n${items.map((i) => `- ${i}`).join('\n')}`)
    .join('\n\n')

  return `## AGENT MEMORY\n\nThings you've learned from past sessions:\n\n${sections}\n\nUse these memories to inform your work, but verify they still apply to the current context.`
}

function memoryTypeLabel(type: MemoryType): string {
  const labels: Record<MemoryType, string> = {
    design_preference: 'Design Preferences',
    feedback: 'Past Feedback',
    relationship: 'Team Dynamics',
    project_context: 'Project Context',
    skill_growth: 'Skills Learned',
  }
  return labels[type]
}

// ---------------------------------------------------------------------------
// Memory Extraction (from AI responses)
// ---------------------------------------------------------------------------

/**
 * Given a user message and agent response, extract potential memories.
 * Returns suggested memories that the integration layer should store.
 *
 * This is a heuristic extractor — the integration layer can also use
 * the AI itself to extract richer memories.
 */
export function extractPotentialMemories(
  userMessage: string,
  agentResponse: string,
): Array<{ type: MemoryType; content: string; salience: number }> {
  const suggestions: Array<{ type: MemoryType; content: string; salience: number }> = []
  const msg = userMessage.toLowerCase()
  const resp = agentResponse.toLowerCase()

  // --- From user message ---

  // Preference signals
  const prefPatterns = [
    /(?:i (?:like|prefer|want|love)|make it more|keep it|always use|never use) (.+)/i,
    /(?:the (?:style|vibe|feel|look) should be) (.+)/i,
  ]
  for (const pattern of prefPatterns) {
    const match = userMessage.match(pattern)
    if (match) {
      suggestions.push({
        type: 'design_preference',
        content: `User preference: ${match[0].trim()}`,
        salience: 0.8,
      })
    }
  }

  // Feedback signals
  if (msg.includes("don't") || msg.includes('not like') || msg.includes('change') || msg.includes('wrong')) {
    suggestions.push({
      type: 'feedback',
      content: `User correction: "${userMessage.slice(0, 200)}"`,
      salience: 0.85,
    })
  }

  // Project context from user
  const contextPatterns = [
    /(?:this is (?:for|about)|the (?:brand|project|client|company) is|we're (?:building|creating|designing)) (.+)/i,
    /(?:the audience is|target (?:audience|user|demographic)) (.+)/i,
    /(?:for|about) ([\w\s]{2,40}?)(?:\.|,|$)/i,
  ]
  for (const pattern of contextPatterns) {
    const match = userMessage.match(pattern)
    if (match) {
      suggestions.push({
        type: 'project_context',
        content: match[0].trim(),
        salience: 0.9,
      })
    }
  }

  // --- From agent response (what the agent learned while working) ---

  // Design decisions the agent made
  const designDecisionPatterns = [
    /(?:dark|light|minimal|bold|clean|warm|cool|neutral) (?:palette|theme|background|design|style|aesthetic)/i,
    /(?:color|palette|accent|typography|layout|spacing)[:—] (.{10,80})/i,
  ]
  for (const pattern of designDecisionPatterns) {
    const match = agentResponse.match(pattern)
    if (match) {
      suggestions.push({
        type: 'design_preference',
        content: `Design decision: ${match[0].trim().slice(0, 150)}`,
        salience: 0.65,
      })
    }
  }

  // Brand/project info the agent discovered
  if (resp.includes('venture capital') || resp.includes('startup') || resp.includes('fintech') ||
      resp.includes('saas') || resp.includes('e-commerce') || resp.includes('agency')) {
    const industry = agentResponse.match(/(?:venture capital|startup|fintech|saas|e-commerce|agency|healthcare|education|real estate)/i)
    if (industry) {
      suggestions.push({
        type: 'project_context',
        content: `Industry context: ${industry[0]}`,
        salience: 0.7,
      })
    }
  }

  return suggestions.slice(0, 3) // max 3 per turn
}
