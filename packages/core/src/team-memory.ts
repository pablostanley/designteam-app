/**
 * Team Memory — shared knowledge every agent on the team can read.
 *
 * Distinct from AgentMemory (which is per-agent). Team memory holds:
 * - brand facts (colors, voice, typography)
 * - project context (audience, deadlines, constraints)
 * - user preferences (style, taste, past feedback)
 * - team decisions ("we tried X, user didn't like it")
 *
 * Salience decays like agent memory. Any agent can read; typically
 * the Creative Director or user writes.
 */

export const TEAM_MEMORY_CATEGORIES = ['brand', 'project', 'user', 'decision', 'fact'] as const
export type TeamMemoryCategory = typeof TEAM_MEMORY_CATEGORIES[number]

export interface TeamMemoryEntry {
  id: string
  category: TeamMemoryCategory
  content: string
  salience: number         // 0–1
  source?: string          // agent name or "user"
  createdAt: string
  lastRelevantAt: string
}

export interface TeamMemory {
  teamId: string
  entries: TeamMemoryEntry[]
  maxEntries: number
}

export const MAX_TEAM_MEMORY_ENTRIES = 200
export const TEAM_MEMORY_SALIENCE_DECAY = 0.01  // slower than agent memory
export const TEAM_MEMORY_MIN_SALIENCE = 0.1

let _teamMemCounter = 0
function teamMemoryId(): string {
  return `tm-${Date.now()}-${++_teamMemCounter}-${Math.random().toString(36).slice(2, 6)}`
}

export function createEmptyTeamMemory(teamId: string): TeamMemory {
  return { teamId, entries: [], maxEntries: MAX_TEAM_MEMORY_ENTRIES }
}

export function addTeamMemory(
  memory: TeamMemory,
  category: TeamMemoryCategory,
  content: string,
  opts: { salience?: number; source?: string } = {},
): TeamMemory {
  const now = new Date().toISOString()
  const entry: TeamMemoryEntry = {
    id: teamMemoryId(),
    category,
    content,
    salience: opts.salience ?? 0.7,
    source: opts.source,
    createdAt: now,
    lastRelevantAt: now,
  }

  let entries = [...memory.entries, entry]
  if (entries.length > memory.maxEntries) {
    entries = entries
      .sort((a, b) => b.salience - a.salience)
      .slice(0, memory.maxEntries)
  }

  return { ...memory, entries }
}

export function reinforceTeamMemory(
  memory: TeamMemory,
  memoryId: string,
  boost = 0.15,
): TeamMemory {
  const now = new Date().toISOString()
  return {
    ...memory,
    entries: memory.entries.map((e) =>
      e.id === memoryId
        ? { ...e, salience: Math.min(1, e.salience + boost), lastRelevantAt: now }
        : e,
    ),
  }
}

export function decayTeamMemory(memory: TeamMemory): TeamMemory {
  const now = Date.now()
  return {
    ...memory,
    entries: memory.entries
      .map((e) => {
        const daysSince = Math.max(
          0,
          (now - new Date(e.lastRelevantAt).getTime()) / (1000 * 60 * 60 * 24),
        )
        const newSalience = Math.max(
          TEAM_MEMORY_MIN_SALIENCE,
          e.salience - TEAM_MEMORY_SALIENCE_DECAY * daysSince,
        )
        return { ...e, salience: newSalience }
      })
      .filter((e) => e.salience > TEAM_MEMORY_MIN_SALIENCE * 0.5),
  }
}

export function getTeamMemoriesByCategory(
  memory: TeamMemory,
  category: TeamMemoryCategory,
): TeamMemoryEntry[] {
  return memory.entries
    .filter((e) => e.category === category)
    .sort((a, b) => b.salience - a.salience)
}

export function getTopTeamMemories(memory: TeamMemory, n = 10): TeamMemoryEntry[] {
  return [...memory.entries]
    .sort((a, b) => b.salience - a.salience)
    .slice(0, n)
}

export function searchTeamMemories(
  memory: TeamMemory,
  query: string,
  limit = 10,
): TeamMemoryEntry[] {
  const q = query.toLowerCase()
  return memory.entries
    .filter((e) => e.content.toLowerCase().includes(q))
    .sort((a, b) => b.salience - a.salience)
    .slice(0, limit)
}

/** Format team memory for injection into an agent's system prompt. */
export function teamMemoryToPromptFragment(memory: TeamMemory, maxEntries = 20): string {
  if (memory.entries.length === 0) return ''

  const grouped: Record<TeamMemoryCategory, TeamMemoryEntry[]> = {
    brand: [], project: [], user: [], decision: [], fact: [],
  }

  for (const entry of memory.entries) {
    grouped[entry.category].push(entry)
  }

  const lines: string[] = []
  lines.push('## TEAM KNOWLEDGE')
  lines.push('')
  lines.push('Shared context your whole team knows:')
  lines.push('')

  const categoryLabels: Record<TeamMemoryCategory, string> = {
    brand: 'Brand',
    project: 'Project',
    user: 'About the user',
    decision: 'Team decisions',
    fact: 'Facts',
  }

  let totalShown = 0
  for (const cat of ['brand', 'user', 'project', 'decision', 'fact'] as TeamMemoryCategory[]) {
    const entries = grouped[cat]
      .sort((a, b) => b.salience - a.salience)
      .slice(0, Math.max(3, Math.floor(maxEntries / 5)))
    if (entries.length === 0) continue
    lines.push(`**${categoryLabels[cat]}:**`)
    for (const e of entries) {
      lines.push(`- ${e.content}`)
      totalShown++
      if (totalShown >= maxEntries) break
    }
    lines.push('')
    if (totalShown >= maxEntries) break
  }

  return lines.join('\n')
}
