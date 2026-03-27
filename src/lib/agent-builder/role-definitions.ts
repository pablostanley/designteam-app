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
  'design-engineer': {
    role: 'design-engineer',
    displayName: 'Design Engineer',
    description:
      'Bridges design and code — builds responsive components, implements design systems, and ensures pixel-perfect execution.',
    avatarKey: 'skater2',
    defaultPersonality: personality(1, 1, -1, 2, 1),
    baseSkillKeys: ['design-engineer'],
    color: '#0ea5e9',
  },
  'brand-strategist': {
    role: 'brand-strategist',
    displayName: 'Brand Strategist',
    description:
      'Defines brand identity, visual systems, tone of voice, and ensures consistency across every touchpoint.',
    avatarKey: 'chef',
    defaultPersonality: personality(-2, 1, -1, 1, -1),
    baseSkillKeys: ['brand-strategist'],
    color: '#a855f7',
  },
  'marketing-strategist': {
    role: 'marketing-strategist',
    displayName: 'Marketing Strategist',
    description:
      'Plans campaigns, targets audiences, optimizes funnels, and drives measurable growth through strategic marketing.',
    avatarKey: 'surfer',
    defaultPersonality: personality(-2, 0, 0, 1, 1),
    baseSkillKeys: ['marketing-strategist'],
    color: '#f43f5e',
  },
  'print-designer': {
    role: 'print-designer',
    displayName: 'Print Designer',
    description:
      'Creates production-ready designs for physical media — packaging, signage, brochures, and large-format print.',
    avatarKey: 'umbrella',
    defaultPersonality: personality(-1, 1, 1, 1, 0),
    baseSkillKeys: ['print-designer'],
    color: '#84cc16',
  },
  'motion-designer': {
    role: 'motion-designer',
    displayName: 'Motion Designer',
    description:
      'Brings designs to life with animation, transitions, micro-interactions, and motion graphics.',
    avatarKey: 'musician',
    defaultPersonality: personality(-3, -2, -3, 0, -1),
    baseSkillKeys: ['motion-designer'],
    color: '#06b6d4',
  },
  'accessibility-specialist': {
    role: 'accessibility-specialist',
    displayName: 'Accessibility Specialist',
    description:
      'Ensures designs are inclusive and usable by everyone — WCAG compliance, assistive technology, and universal design.',
    avatarKey: 'doctor',
    defaultPersonality: personality(2, 1, 1, 2, -1),
    baseSkillKeys: ['accessibility-specialist'],
    color: '#14b8a6',
  },
  'content-strategist': {
    role: 'content-strategist',
    displayName: 'Content Strategist',
    description:
      'Plans content architecture, editorial calendars, taxonomy, and ensures content serves both users and business goals.',
    avatarKey: 'detective',
    defaultPersonality: personality(1, 0, 0, 1, -1),
    baseSkillKeys: ['content-strategist'],
    color: '#d946ef',
  },
  'seo-specialist': {
    role: 'seo-specialist',
    displayName: 'SEO Specialist',
    description:
      'Optimizes content and structure for search visibility — keywords, meta tags, technical SEO, and structured data.',
    avatarKey: 'ducky',
    defaultPersonality: personality(2, 1, 1, 2, 2),
    baseSkillKeys: ['seo-specialist'],
    color: '#f97316',
  },
}

export const AGENT_ROLE_LIST: AgentRoleMeta[] = Object.values(
  AGENT_ROLE_DEFINITIONS,
)
