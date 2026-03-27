/**
 * Agent Team Builder — Shared Types
 *
 * This module is intentionally free of Efecto-specific imports.
 * All types here use semantic keys (not file paths) so the module
 * can be extracted as an open-source package later.
 */

// ---------------------------------------------------------------------------
// Agent Roles
// ---------------------------------------------------------------------------

export type AgentRole =
  | 'researcher'
  | 'copywriter'
  | 'graphic-designer'
  | 'ux-designer'
  | 'ux-writer'
  | 'editorial-designer'
  | 'social-media-designer'
  | 'creative-director'
  | 'design-engineer'
  | 'brand-strategist'
  | 'marketing-strategist'
  | 'print-designer'
  | 'motion-designer'
  | 'accessibility-specialist'
  | 'content-strategist'
  | 'seo-specialist'

export const AGENT_ROLES: AgentRole[] = [
  'researcher',
  'copywriter',
  'graphic-designer',
  'ux-designer',
  'ux-writer',
  'editorial-designer',
  'social-media-designer',
  'creative-director',
  'design-engineer',
  'brand-strategist',
  'marketing-strategist',
  'print-designer',
  'motion-designer',
  'accessibility-specialist',
  'content-strategist',
  'seo-specialist',
]

// ---------------------------------------------------------------------------
// Personality System
// ---------------------------------------------------------------------------

export type PersonalityAxis =
  | 'bold-subtle'
  | 'playful-serious'
  | 'experimental-conventional'
  | 'verbose-concise'
  | 'warm-corporate'

export interface PersonalityAxisMeta {
  key: PersonalityAxis
  leftLabel: string   // negative end (-5)
  rightLabel: string  // positive end (+5)
}

export const PERSONALITY_AXES: PersonalityAxisMeta[] = [
  { key: 'bold-subtle', leftLabel: 'Bold', rightLabel: 'Subtle' },
  { key: 'playful-serious', leftLabel: 'Playful', rightLabel: 'Serious' },
  { key: 'experimental-conventional', leftLabel: 'Experimental', rightLabel: 'Conventional' },
  { key: 'verbose-concise', leftLabel: 'Verbose', rightLabel: 'Concise' },
  { key: 'warm-corporate', leftLabel: 'Warm', rightLabel: 'Corporate' },
]

export interface PersonalityConfig {
  sliders: Record<PersonalityAxis, number>  // each -5 to +5 (0 = neutral)
}

// ---------------------------------------------------------------------------
// Traits
// ---------------------------------------------------------------------------

export const PERSONALITY_TRAITS = [
  'creative', 'analytical', 'detail-oriented', 'big-picture',
  'fast-paced', 'methodical', 'minimalist', 'maximalist',
  'data-driven', 'intuitive', 'collaborative', 'independent',
  'risk-taking', 'cautious', 'empathetic', 'direct',
] as const

export type PersonalityTrait = typeof PERSONALITY_TRAITS[number]

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_TEAM_SIZE = 17
export const MAX_TEAMS = 20

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export interface Agent {
  id: string
  name: string
  role: AgentRole
  personality: PersonalityConfig
  traits: string[]           // selectable trait pills
  customPrompt: string       // user's custom prompt/instructions
  /** Generated markdown combining baseline skill + personality injection */
  skillFile: string
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export interface Team {
  id: string
  name: string
  agents: Agent[]
  createdAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
}

/** Lightweight entry for localStorage index (fast listing without loading full team) */
export interface TeamEntry {
  id: string
  name: string
  agentCount: number
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Role Metadata (for UI and prompt generation)
// ---------------------------------------------------------------------------

export interface AgentRoleMeta {
  role: AgentRole
  displayName: string
  description: string
  /** Semantic avatar key — mapped to actual image paths in the UI layer */
  avatarKey: string
  defaultPersonality: PersonalityConfig
  /** Which agent skill markdown files to use as base (keys into AGENT_SKILL_CONTENT) */
  baseSkillKeys: string[]
  /** Hex color for UI badges */
  color: string
}

// ---------------------------------------------------------------------------
// Factory Helpers
// ---------------------------------------------------------------------------

let _counter = 0
export function uid(prefix = 'agent'): string {
  return `${prefix}-${Date.now()}-${++_counter}-${Math.random().toString(36).slice(2, 8)}`
}

export function teamUid(): string {
  return uid('team')
}

export function createDefaultPersonality(): PersonalityConfig {
  return {
    sliders: {
      'bold-subtle': 0,
      'playful-serious': 0,
      'experimental-conventional': 0,
      'verbose-concise': 0,
      'warm-corporate': 0,
    },
  }
}

const AGENT_NAMES: Record<AgentRole, string> = {
  'researcher': 'Scout',
  'copywriter': 'Aria',
  'graphic-designer': 'Pixel',
  'ux-designer': 'Flow',
  'ux-writer': 'Quill',
  'editorial-designer': 'Reed',
  'social-media-designer': 'Buzz',
  'creative-director': 'Nova',
  'design-engineer': 'Kit',
  'brand-strategist': 'Sage',
  'marketing-strategist': 'Maven',
  'print-designer': 'Ink',
  'motion-designer': 'Flux',
  'accessibility-specialist': 'Atlas',
  'content-strategist': 'Story',
  'seo-specialist': 'Signal',
}

export function createDefaultAgent(role: AgentRole, meta?: AgentRoleMeta): Agent {
  return {
    id: uid(),
    name: AGENT_NAMES[role] ?? role,
    role,
    personality: meta?.defaultPersonality ?? createDefaultPersonality(),
    traits: [],
    customPrompt: '',
    skillFile: '',
  }
}

export function createDefaultTeam(name?: string): Team {
  const now = new Date().toISOString()
  return {
    id: teamUid(),
    name: name ?? 'Untitled Team',
    agents: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function teamToEntry(team: Team): TeamEntry {
  return {
    id: team.id,
    name: team.name,
    agentCount: team.agents.length,
    updatedAt: team.updatedAt,
  }
}
