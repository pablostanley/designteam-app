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
  /** Per-role default traits for team chemistry. Keyed by index into roles array. */
  roleTraits?: string[][]
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
    roleTraits: [
      ['methodical', 'detail-obsessed', 'introvert', 'thinking'],    // researcher: deep analytical dives
      ['sassy', 'fast-shipper', 'extrovert', 'feeling'],             // copywriter: quick, punchy, empathetic
      ['intense', 'perfectionist', 'independent', 'perceiving'],     // graphic-designer: uncompromising visual craft
      ['chill', 'iterative', 'collaborator', 'judging'],             // ux-designer: steady, process-oriented
    ],
  },
  {
    id: 'brand-campaign',
    name: 'Brand Campaign',
    description: 'Launch a cohesive multi-channel campaign',
    emoji: '\u{1F4E2}',
    roles: ['copywriter', 'graphic-designer', 'social-media-designer', 'creative-director'],
    roleTraits: [
      ['provocative', 'chaotic-creative', 'independent', 'feeling'],  // copywriter: wild ideas, emotional hooks
      ['stoic', 'perfectionist', 'introvert', 'thinking'],            // graphic-designer: disciplined craft
      ['enthusiastic', 'fast-shipper', 'extrovert', 'optimist'],      // social-media: high energy, ships fast
      ['intense', 'big-picture', 'leader', 'judging'],                // creative-director: vision and control
    ],
  },
  {
    id: 'content-machine',
    name: 'Content Machine',
    description: 'Produce polished content at scale',
    emoji: '\u{270D}\uFE0F',
    roles: ['copywriter', 'editorial-designer', 'social-media-designer', 'ux-writer'],
    roleTraits: [
      ['enthusiastic', 'fast-shipper', 'collaborator', 'feeling'],    // copywriter: productive, team-first
      ['deadpan', 'perfectionist', 'introvert', 'judging'],           // editorial: quiet precision
      ['sassy', 'chaotic-creative', 'extrovert', 'risk-taker'],       // social-media: bold, attention-grabbing
      ['nurturing', 'methodical', 'mentor', 'thinking'],              // ux-writer: careful, teaches clarity
    ],
  },
  {
    id: 'product-team',
    name: 'Product Team',
    description: 'Design user-centered product experiences',
    emoji: '\u{1F527}',
    roles: ['ux-designer', 'ux-writer', 'graphic-designer', 'researcher'],
    roleTraits: [
      ['chill', 'iterative', 'collaborator', 'feeling'],              // ux-designer: empathetic, incremental
      ['nurturing', 'detail-obsessed', 'supporter', 'thinking'],      // ux-writer: precise, people-focused
      ['intense', 'perfectionist', 'challenger', 'perceiving'],       // graphic-designer: pushes quality
      ['stoic', 'methodical', 'independent', 'realist'],              // researcher: grounded, evidence-based
    ],
  },
  {
    id: 'full-stack-design',
    name: 'Full Stack Design',
    description: 'End-to-end from brand strategy to production code',
    emoji: '\u{1F9E9}',
    roles: ['design-engineer', 'ux-designer', 'graphic-designer', 'brand-strategist', 'content-strategist'],
    roleTraits: [
      ['deadpan', 'fast-shipper', 'independent', 'thinking'],         // design-engineer: ships code, no drama
      ['chill', 'iterative', 'collaborator', 'feeling'],              // ux-designer: team glue
      ['intense', 'perfectionist', 'challenger', 'perceiving'],       // graphic-designer: quality enforcer
      ['stoic', 'big-picture', 'leader', 'cautious'],                 // brand-strategist: steady vision
      ['nurturing', 'methodical', 'mentor', 'judging'],               // content-strategist: organized, helpful
    ],
  },
  {
    id: 'marketing-blitz',
    name: 'Marketing Blitz',
    description: 'Launch campaigns that convert across every channel',
    emoji: '\u{26A1}',
    roles: ['marketing-strategist', 'copywriter', 'social-media-designer', 'seo-specialist', 'graphic-designer'],
    roleTraits: [
      ['intense', 'big-picture', 'leader', 'thinking'],               // marketing-strategist: strategic command
      ['sassy', 'fast-shipper', 'extrovert', 'risk-taker'],           // copywriter: bold, fast, punchy
      ['enthusiastic', 'chaotic-creative', 'collaborator', 'optimist'], // social-media: creative energy
      ['deadpan', 'detail-obsessed', 'introvert', 'realist'],         // seo: data-driven, precise
      ['stoic', 'perfectionist', 'independent', 'cautious'],          // graphic-designer: disciplined craft
    ],
  },
]

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTeamFromPreset(preset: TeamPreset): Team {
  const team = createDefaultTeam(preset.name)
  team.agents = preset.roles.map((role, i) => {
    const meta = AGENT_ROLE_DEFINITIONS[role]
    const agent = createDefaultAgent(role, meta)
    if (preset.roleTraits?.[i]) {
      agent.traits = [...preset.roleTraits[i]]
    }
    return agent
  })
  return team
}
