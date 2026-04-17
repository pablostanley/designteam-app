/**
 * Local state persistence for Design Team CLI.
 * Stores team config and agent living state in .designteam/ directory.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

const DIR_NAME = '.designteam'

export function getStateDir() {
  return join(process.cwd(), DIR_NAME)
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export function loadTeam() {
  const path = join(getStateDir(), 'team.json')
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

export function saveTeam(team) {
  const dir = getStateDir()
  ensureDir(dir)
  writeFileSync(join(dir, 'team.json'), JSON.stringify(team, null, 2), 'utf8')
}

// ---------------------------------------------------------------------------
// Agent State (living state / tamagotchi)
// ---------------------------------------------------------------------------

export function loadAgentState(agentId) {
  const path = join(getStateDir(), 'state', `${agentId}.json`)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

export function saveAgentState(agentId, state) {
  const dir = join(getStateDir(), 'state')
  ensureDir(dir)
  writeFileSync(join(dir, `${agentId}.json`), JSON.stringify(state, null, 2), 'utf8')
}

export function loadAllAgentStates() {
  const dir = join(getStateDir(), 'state')
  if (!existsSync(dir)) return {}
  const states = {}
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    const id = file.replace('.json', '')
    try {
      states[id] = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    } catch {
      // skip corrupt files
    }
  }
  return states
}

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

export function loadRelationships() {
  const path = join(getStateDir(), 'relationships.json')
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

export function saveRelationships(graph) {
  const dir = getStateDir()
  ensureDir(dir)
  writeFileSync(join(dir, 'relationships.json'), JSON.stringify(graph, null, 2), 'utf8')
}

// ---------------------------------------------------------------------------
// Init — create default living states for all agents in a team
// ---------------------------------------------------------------------------

export function initTeamState(team, createDefaultLivingStateFn) {
  for (const agent of team.agents) {
    const existing = loadAgentState(agent.id)
    if (!existing) {
      saveAgentState(agent.id, createDefaultLivingStateFn(agent.id))
    }
  }
  // Init empty relationship graph if not exists
  if (!loadRelationships()) {
    saveRelationships({ teamId: team.id, relationships: [] })
  }
}

// ---------------------------------------------------------------------------
// Team Memory (shared across all agents)
// ---------------------------------------------------------------------------

export function loadTeamMemory() {
  const path = join(getStateDir(), 'team-memory.json')
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

export function saveTeamMemory(memory) {
  const dir = getStateDir()
  ensureDir(dir)
  writeFileSync(join(dir, 'team-memory.json'), JSON.stringify(memory, null, 2), 'utf8')
}

// ---------------------------------------------------------------------------
// User Profile (who you are, what you care about)
// ---------------------------------------------------------------------------

export function loadUserProfile() {
  const path = join(getStateDir(), 'user.json')
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

export function saveUserProfile(profile) {
  const dir = getStateDir()
  ensureDir(dir)
  writeFileSync(join(dir, 'user.json'), JSON.stringify(profile, null, 2), 'utf8')
}
