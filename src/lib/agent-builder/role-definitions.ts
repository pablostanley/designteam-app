/**
 * Role Definitions — metadata for each AgentRole
 */

import type { AgentRole, AgentRoleMeta, PersonalityConfig } from './types'

function personality(
  bold: number,
  playful: number,
  experimental: number,
  verbose: number,
  warm: number,
): PersonalityConfig {
  return {
    sliders: {
      'bold-subtle': bold,
      'playful-serious': playful,
      'experimental-conventional': experimental,
      'verbose-concise': verbose,
      'warm-corporate': warm,
    },
  }
}

export const AGENT_ROLE_DEFINITIONS: Record<AgentRole, AgentRoleMeta> = {
  researcher: {
    role: 'researcher',
    displayName: 'Researcher',
    description:
      'Investigates competitors, trends, and user insights to ground the team in evidence-based decisions.',
    avatarKey: 'detective',
    defaultPersonality: personality(1, 0, -2, 2, 0),
    baseSkillKeys: ['researcher'],
    color: '#6366f1',
  },
  copywriter: {
    role: 'copywriter',
    displayName: 'Copywriter',
    description:
      'Crafts compelling headlines, body copy, and messaging that connects with the target audience.',
    avatarKey: 'musician',
    defaultPersonality: personality(-3, -2, 0, 0, -2),
    baseSkillKeys: ['copywriter'],
    color: '#ec4899',
  },
  'graphic-designer': {
    role: 'graphic-designer',
    displayName: 'Graphic Designer',
    description:
      'Creates visual compositions, illustrations, and graphic elements that bring concepts to life.',
    avatarKey: 'skater',
    defaultPersonality: personality(-3, 0, -3, 0, -1),
    baseSkillKeys: ['graphic-designer'],
    color: '#f97316',
  },
  'ux-designer': {
    role: 'ux-designer',
    displayName: 'UX Designer',
    description:
      'Designs intuitive interactions, user flows, and information architecture for seamless experiences.',
    avatarKey: 'doctor',
    defaultPersonality: personality(1, 1, -1, 2, 0),
    baseSkillKeys: ['ux-designer'],
    color: '#14b8a6',
  },
  'ux-writer': {
    role: 'ux-writer',
    displayName: 'UX Writer',
    description:
      'Writes clear microcopy, labels, and interface text that guides users through the product.',
    avatarKey: 'ducky',
    defaultPersonality: personality(1, -1, 1, 2, -1),
    baseSkillKeys: ['ux-writer'],
    color: '#eab308',
  },
  'editorial-designer': {
    role: 'editorial-designer',
    displayName: 'Editorial Designer',
    description:
      'Arranges layout, typography, and visual hierarchy to create polished, publication-ready designs.',
    avatarKey: 'umbrella',
    defaultPersonality: personality(-2, 1, -2, 1, -2),
    baseSkillKeys: ['editorial-designer'],
    color: '#8b5cf6',
  },
  'social-media-designer': {
    role: 'social-media-designer',
    displayName: 'Social Media Designer',
    description:
      'Creates scroll-stopping content optimized for each social platform and its audience.',
    avatarKey: 'surfer',
    defaultPersonality: personality(-3, -3, -1, 0, -2),
    baseSkillKeys: ['social-media-designer'],
    color: '#06b6d4',
  },
  'creative-director': {
    role: 'creative-director',
    displayName: 'Creative Director',
    description:
      'Orchestrates the team vision, ensures brand coherence, and elevates the overall creative quality.',
    avatarKey: 'chef',
    defaultPersonality: personality(-3, 0, -2, 1, -1),
    baseSkillKeys: ['creative-director'],
    color: '#ef4444',
  },
}

export const AGENT_ROLE_LIST: AgentRoleMeta[] = Object.values(
  AGENT_ROLE_DEFINITIONS,
)
