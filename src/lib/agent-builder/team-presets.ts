/**
 * Team Presets — pre-built team configurations users can load instantly
 */

import type { AgentRole, Team } from './types'
import { createDefaultAgent, createDefaultTeam } from './types'
import { AGENT_ROLE_DEFINITIONS } from './role-definitions'
import { AGENT_ROLES } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeamPreset {
  id: string
  name: string
  description: string
  emoji: string
  roles: AgentRole[]
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export const TEAM_PRESETS: TeamPreset[] = [
  {
    id: 'full-studio',
    name: 'Full Studio',
    description: 'The complete crew for any project',
    emoji: '\u{1F3A8}',
    roles: [...AGENT_ROLES],
  },
  {
    id: 'landing-page-sprint',
    name: 'Landing Page Sprint',
    description: 'Ship a high-converting landing page fast',
    emoji: '\u{1F680}',
    roles: ['researcher', 'copywriter', 'graphic-designer', 'ux-designer'],
  },
  {
    id: 'brand-campaign',
    name: 'Brand Campaign',
    description: 'Launch a cohesive multi-channel campaign',
    emoji: '\u{1F4E2}',
    roles: ['copywriter', 'graphic-designer', 'social-media-designer', 'creative-director'],
  },
  {
    id: 'content-machine',
    name: 'Content Machine',
    description: 'Produce polished content at scale',
    emoji: '\u{270D}\uFE0F',
    roles: ['copywriter', 'editorial-designer', 'social-media-designer', 'ux-writer'],
  },
  {
    id: 'product-team',
    name: 'Product Team',
    description: 'Design user-centered product experiences',
    emoji: '\u{1F527}',
    roles: ['ux-designer', 'ux-writer', 'graphic-designer', 'researcher'],
  },
]

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTeamFromPreset(preset: TeamPreset): Team {
  const team = createDefaultTeam(preset.name)
  team.agents = preset.roles.map((role) => {
    const meta = AGENT_ROLE_DEFINITIONS[role]
    return createDefaultAgent(role, meta)
  })
  return team
}
