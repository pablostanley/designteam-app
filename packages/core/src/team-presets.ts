/**
 * Team Presets — pre-built team configurations users can load instantly
 */

import type { AgentRole, PersonalityTrait, Team } from './types'
import { AGENT_ROLES, createDefaultAgent, createDefaultTeam } from './types'
import { AGENT_ROLE_DEFINITIONS } from './role-definitions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeamPreset {
  id: string
  name: string
  description: string
  emoji: string
  roles: AgentRole[]
  /** Per-role default traits for team chemistry. Keyed by index into roles array. */
  roleTraits?: PersonalityTrait[][]
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export const TEAM_PRESETS: TeamPreset[] = [
  {
    id: 'full-studio',
    name: 'Full Studio',
    description: 'The complete crew — all 16 specialists',
    emoji: '\u{1F3A8}',
    roles: [...AGENT_ROLES],
  },
  {
    id: 'landing-page-sprint',
    name: 'Landing Page Sprint',
    description: 'Ship a high-converting landing page fast',
    emoji: '\u{1F680}',
    roles: ['researcher', 'copywriter', 'graphic-designer', 'ux-designer'],
    roleTraits: [
      ['methodical', 'detail-obsessed', 'introvert', 'thinking'],
      ['sassy', 'fast-shipper', 'extrovert', 'feeling'],
      ['intense', 'perfectionist', 'independent', 'perceiving'],
      ['chill', 'iterative', 'collaborator', 'judging'],
    ],
  },
  {
    id: 'brand-campaign',
    name: 'Brand Campaign',
    description: 'Launch a cohesive multi-channel campaign',
    emoji: '\u{1F4E2}',
    roles: ['copywriter', 'graphic-designer', 'social-media-designer', 'creative-director'],
    roleTraits: [
      ['provocative', 'chaotic-creative', 'independent', 'feeling'],
      ['stoic', 'perfectionist', 'introvert', 'thinking'],
      ['enthusiastic', 'fast-shipper', 'extrovert', 'optimist'],
      ['intense', 'big-picture', 'leader', 'judging'],
    ],
  },
  {
    id: 'content-machine',
    name: 'Content Machine',
    description: 'Produce polished content at scale',
    emoji: '\u{270D}\uFE0F',
    roles: ['copywriter', 'editorial-designer', 'social-media-designer', 'ux-writer'],
    roleTraits: [
      ['enthusiastic', 'fast-shipper', 'collaborator', 'feeling'],
      ['deadpan', 'perfectionist', 'introvert', 'judging'],
      ['sassy', 'chaotic-creative', 'extrovert', 'risk-taker'],
      ['nurturing', 'methodical', 'mentor', 'thinking'],
    ],
  },
  {
    id: 'product-team',
    name: 'Product Team',
    description: 'Design user-centered product experiences',
    emoji: '\u{1F527}',
    roles: ['ux-designer', 'ux-writer', 'graphic-designer', 'researcher'],
    roleTraits: [
      ['chill', 'iterative', 'collaborator', 'feeling'],
      ['nurturing', 'detail-obsessed', 'supporter', 'thinking'],
      ['intense', 'perfectionist', 'challenger', 'perceiving'],
      ['stoic', 'methodical', 'independent', 'realist'],
    ],
  },
  {
    id: 'full-stack-design',
    name: 'Full Stack Design',
    description: 'End-to-end from brand strategy to production code',
    emoji: '\u{1F9E9}',
    roles: ['design-engineer', 'ux-designer', 'graphic-designer', 'brand-strategist', 'content-strategist'],
    roleTraits: [
      ['deadpan', 'fast-shipper', 'independent', 'thinking'],
      ['chill', 'iterative', 'collaborator', 'feeling'],
      ['intense', 'perfectionist', 'challenger', 'perceiving'],
      ['stoic', 'big-picture', 'leader', 'cautious'],
      ['nurturing', 'methodical', 'mentor', 'judging'],
    ],
  },
  {
    id: 'marketing-blitz',
    name: 'Marketing Blitz',
    description: 'Launch campaigns that convert across every channel',
    emoji: '\u{26A1}',
    roles: ['marketing-strategist', 'copywriter', 'social-media-designer', 'seo-specialist', 'graphic-designer'],
    roleTraits: [
      ['intense', 'big-picture', 'leader', 'thinking'],
      ['sassy', 'fast-shipper', 'extrovert', 'risk-taker'],
      ['enthusiastic', 'chaotic-creative', 'collaborator', 'optimist'],
      ['deadpan', 'detail-obsessed', 'introvert', 'realist'],
      ['stoic', 'perfectionist', 'independent', 'cautious'],
    ],
  },
]

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTeamFromPreset(preset: TeamPreset): Team {
  const team = createDefaultTeam(preset.name)
  team.agents = preset.roles
    .map((role, i) => {
      const meta = AGENT_ROLE_DEFINITIONS[role]
      if (!meta) return null
      const agent = createDefaultAgent(role, meta)
      if (preset.roleTraits?.[i]) {
        agent.traits = [...preset.roleTraits[i]]
      }
      return agent
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
  return team
}
