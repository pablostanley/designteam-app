/**
 * @designteam/core — Shared Types
 *
 * Personality scale: -5 to +5 (0 = neutral).
 * Negative values lean toward the LEFT label (Bold, Playful, Experimental, Verbose, Warm).
 * Positive values lean toward the RIGHT label (Subtle, Serious, Conventional, Concise, Corporate).
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
// Personality System — Scale: -5 to +5 (0 = neutral)
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
  /** Optional point budget for gamification (sum of |slider values| must not exceed this) */
  pointBudget?: number
}

// ---------------------------------------------------------------------------
// Traits (categorized personality pills)
// ---------------------------------------------------------------------------

export const TRAIT_CATEGORIES = {
  temperament: {
    label: 'Temperament',
    traits: ['sassy', 'chill', 'intense', 'nurturing', 'provocative', 'deadpan', 'enthusiastic', 'stoic'] as const,
  },
  workStyle: {
    label: 'Work Style',
    traits: ['perfectionist', 'fast-shipper', 'big-picture', 'detail-obsessed', 'methodical', 'chaotic-creative', 'iterative', 'one-shot'] as const,
  },
  social: {
    label: 'Social',
    traits: ['extrovert', 'introvert', 'leader', 'collaborator', 'independent', 'mentor', 'challenger', 'supporter'] as const,
  },
  mindset: {
    label: 'Mindset',
    traits: ['thinking', 'feeling', 'judging', 'perceiving', 'optimist', 'realist', 'risk-taker', 'cautious'] as const,
  },
} as const

export type TraitCategory = keyof typeof TRAIT_CATEGORIES
export type PersonalityTrait = typeof TRAIT_CATEGORIES[TraitCategory]['traits'][number]

/** Max traits allowed per category */
export const MAX_TRAITS_PER_CATEGORY = 2

/** Flattened list of all valid trait values */
export const PERSONALITY_TRAITS: readonly PersonalityTrait[] = Object.values(TRAIT_CATEGORIES).flatMap(c => [...c.traits]) as PersonalityTrait[]

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_POINTS_PER_AGENT = 25
export const MAX_TEAM_SIZE = 16
export const MAX_TEAMS = 20

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export interface Agent {
  id: string
  name: string
  role: AgentRole
  personality: PersonalityConfig
  /** Selectable trait pills (e.g. 'sassy', 'perfectionist', 'challenger') */
  traits: PersonalityTrait[]
  /** Free-form user instructions for this agent */
  customPrompt: string
  /** Generated markdown combining baseline skill + personality injection */
  skillFile: string
  /** Pixabot avatar ID — 4-char base36 string. Renders via Pixabots API. */
  pixabotId?: string
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

/** Lightweight entry for index listing (fast listing without loading full team) */
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

export function uid(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function teamUid(): string {
  return `team-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
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

export const AGENT_NAMES: Record<AgentRole, string> = {
  'researcher': 'Scout',
  'copywriter': 'Aria',
  'graphic-designer': 'Pixel',
  'ux-designer': 'Flow',
  'ux-writer': 'Quill',
  'editorial-designer': 'Reed',
  'social-media-designer': 'Buzz',
  'creative-director': 'Nova',
  'brand-strategist': 'Sage',
  'design-engineer': 'Kit',
  'content-strategist': 'Story',
  'motion-designer': 'Flux',
  'print-designer': 'Ink',
  'accessibility-specialist': 'Atlas',
  'seo-specialist': 'Signal',
  'marketing-strategist': 'Maven',
}

// Re-export from @pixabots/core — single source of truth for avatar IDs
import { randomId as randomPixabotId, seededId as seededPixabotId } from '@pixabots/core'
export { randomPixabotId, seededPixabotId }

export function createDefaultAgent(role: AgentRole, meta?: AgentRoleMeta): Agent {
  return {
    id: uid(),
    name: AGENT_NAMES[role] ?? role,
    role,
    personality: meta?.defaultPersonality ?? createDefaultPersonality(),
    traits: [] as PersonalityTrait[],
    customPrompt: '',
    skillFile: '',
    pixabotId: randomPixabotId(),
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

// ---------------------------------------------------------------------------
// Emotional Model
// ---------------------------------------------------------------------------

export interface EmotionalState {
  energy: number        // 0–100: depletes with work, recovers with rest/praise
  confidence: number    // 0–100: rises with approval, drops with rejection
  enthusiasm: number    // 0–100: rises with creative freedom, drops with repetition
  frustration: number   // 0–100: rises with conflicting feedback, drops with clarity
  inspiration: number   // 0–100: rises with new ideas/collaboration, decays over time
}

export type EmotionKey = keyof EmotionalState

export const EMOTION_KEYS: EmotionKey[] = [
  'energy', 'confidence', 'enthusiasm', 'frustration', 'inspiration',
]

export const DEFAULT_EMOTIONAL_STATE: EmotionalState = {
  energy: 80,
  confidence: 60,
  enthusiasm: 70,
  frustration: 10,
  inspiration: 50,
}

/** Events that shift emotional state */
export type EmotionalEvent =
  | 'work_completed'
  | 'work_approved'
  | 'work_rejected'
  | 'creative_freedom'
  | 'repetitive_task'
  | 'conflicting_feedback'
  | 'clear_direction'
  | 'collaboration_win'
  | 'idle_recovery'
  | 'praised'
  | 'new_project'

// ---------------------------------------------------------------------------
// Agent Memory
// ---------------------------------------------------------------------------

export const MEMORY_TYPES = ['design_preference', 'feedback', 'relationship', 'project_context', 'skill_growth'] as const
export type MemoryType = typeof MEMORY_TYPES[number]

export interface AgentMemoryEntry {
  id: string
  type: MemoryType
  content: string
  createdAt: string
  lastRelevantAt: string
  /** 0–1: how important this memory is (decays if not reinforced) */
  salience: number
  relatedAgentId?: string
  projectId?: string
}

export interface AgentMemory {
  agentId: string
  entries: AgentMemoryEntry[]
  maxEntries: number
}

export const MAX_MEMORY_ENTRIES = 100
export const MEMORY_SALIENCE_DECAY = 0.02
export const MEMORY_MIN_SALIENCE = 0.1

// ---------------------------------------------------------------------------
// Inter-Agent Messaging
// ---------------------------------------------------------------------------

export type MessageType =
  | 'chat'
  | 'design_handoff'
  | 'review_request'
  | 'review_response'
  | 'critique'
  | 'broadcast'
  | 'direction'

export interface AgentMessage {
  id: string
  from: string
  to: string
  type: MessageType
  content: string
  payload?: Record<string, unknown>
  timestamp: string
  read: boolean
}

export interface AgentMailbox {
  agentId: string
  inbox: AgentMessage[]
  maxMessages: number
}

export const MAX_MAILBOX_MESSAGES = 50

// ---------------------------------------------------------------------------
// Relationship Graph
// ---------------------------------------------------------------------------

export interface AgentRelationship {
  agentA: string
  agentB: string
  collaborations: number
  successfulCollabs: number
  conflicts: number
  synergyScore: number
  bond: number
  lastInteraction: string
  sharedInsights: string[]
}

export interface RelationshipGraph {
  teamId: string
  relationships: AgentRelationship[]
}

// ---------------------------------------------------------------------------
// Agent Living State (tamagotchi persistence)
// ---------------------------------------------------------------------------

export interface AgentLivingState {
  emotions: EmotionalState
  memory: AgentMemory
  mailbox: AgentMailbox
  tasksCompleted: number
  tasksApproved: number
  xp: number
  level: number
  lastActiveAt: string
}

export function createDefaultLivingState(agentId: string): AgentLivingState {
  return {
    emotions: { ...DEFAULT_EMOTIONAL_STATE },
    memory: { agentId, entries: [], maxEntries: MAX_MEMORY_ENTRIES },
    mailbox: { agentId, inbox: [], maxMessages: MAX_MAILBOX_MESSAGES },
    tasksCompleted: 0,
    tasksApproved: 0,
    xp: 0,
    level: 1,
    lastActiveAt: new Date().toISOString(),
  }
}

/** XP thresholds for each level */
export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500]

export function xpToLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1
  }
  return 1
}
