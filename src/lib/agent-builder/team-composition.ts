/**
 * Team Composition — coverage analysis, validation, summaries
 */

import type { AgentRole, Team } from './types'
import { MAX_TEAM_SIZE } from './types'
import { AGENT_ROLE_DEFINITIONS } from './role-definitions'

// ---------------------------------------------------------------------------
// Capability map
// ---------------------------------------------------------------------------

const ROLE_CAPABILITIES: Record<AgentRole, string[]> = {
  researcher: ['competitive analysis', 'user research', 'trend analysis', 'data gathering'],
  copywriter: ['headline writing', 'body copy', 'messaging strategy', 'tone of voice'],
  'graphic-designer': ['visual design', 'illustration', 'color theory', 'composition'],
  'ux-designer': ['interaction design', 'user flows', 'wireframing', 'usability'],
  'ux-writer': ['microcopy', 'interface text', 'content strategy', 'voice & tone'],
  'editorial-designer': ['layout design', 'typography', 'visual hierarchy', 'print-ready output'],
  'social-media-designer': ['social content', 'platform optimization', 'engagement design', 'format adaptation'],
  'creative-director': ['creative vision', 'brand coherence', 'team orchestration', 'quality assurance'],
}

const SYNERGY_PAIRS: [AgentRole, AgentRole, string][] = [
  ['researcher', 'copywriter', 'Research-informed messaging'],
  ['researcher', 'ux-designer', 'Evidence-based UX decisions'],
  ['copywriter', 'ux-writer', 'Unified voice across marketing and product'],
  ['graphic-designer', 'editorial-designer', 'Cohesive visual language'],
  ['ux-designer', 'ux-writer', 'Seamless interaction copy'],
  ['social-media-designer', 'graphic-designer', 'Platform-optimized visuals'],
  ['creative-director', 'graphic-designer', 'Directed visual execution'],
  ['creative-director', 'copywriter', 'Directed messaging execution'],
]

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export function analyzeTeamCoverage(team: Team): {
  coveredCapabilities: string[]
  gaps: string[]
  synergies: string[]
} {
  const presentRoles = new Set(team.agents.map((a) => a.role))

  const covered: string[] = []
  const allCapabilities: string[] = []

  for (const [role, caps] of Object.entries(ROLE_CAPABILITIES) as [AgentRole, string[]][]) {
    allCapabilities.push(...caps)
    if (presentRoles.has(role)) {
      covered.push(...caps)
    }
  }

  const coveredSet = new Set(covered)
  const gaps = allCapabilities.filter((c) => !coveredSet.has(c))

  const synergies: string[] = []
  for (const [a, b, label] of SYNERGY_PAIRS) {
    if (presentRoles.has(a) && presentRoles.has(b)) {
      synergies.push(label)
    }
  }

  return {
    coveredCapabilities: Array.from(new Set(covered)),
    gaps: Array.from(new Set(gaps)),
    synergies,
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateTeam(team: Team): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (team.agents.length === 0) {
    errors.push('Team must have at least 1 agent.')
  }

  if (team.agents.length > MAX_TEAM_SIZE) {
    errors.push(`Team cannot exceed ${MAX_TEAM_SIZE} agents (currently ${team.agents.length}).`)
  }

  const ids = new Set<string>()
  for (const agent of team.agents) {
    if (ids.has(agent.id)) {
      errors.push(`Duplicate agent ID: ${agent.id}`)
    }
    ids.add(agent.id)
  }

  return { valid: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export function getTeamSummary(team: Team): string {
  if (team.agents.length === 0) return '0 agents'

  const names = team.agents.map((a) => {
    const meta = AGENT_ROLE_DEFINITIONS[a.role]
    return meta?.displayName ?? a.role
  })

  return `${team.agents.length} agent${team.agents.length === 1 ? '' : 's'}: ${names.join(', ')}`
}
