/**
 * AI Team Builder — generates prompts for AI-assisted team creation
 * and parses AI responses back into Team objects.
 */

import type { Agent, AgentRole, PersonalityAxis, PersonalityTrait, Team } from './types'
import {
  AGENT_ROLES,
  PERSONALITY_AXES,
  PERSONALITY_TRAITS,
  createDefaultTeam,
  MAX_TEAM_SIZE,
  MAX_POINTS_PER_AGENT,
} from './types'
import { AGENT_ROLE_DEFINITIONS } from './role-definitions'

// ---------------------------------------------------------------------------
// Example prompts users can pick from
// ---------------------------------------------------------------------------

export const AI_BUILD_SUGGESTIONS = [
  'A SaaS landing page for a fintech startup',
  'A complete rebrand for a sustainable fashion brand',
  'Social media campaign for a product launch',
  'A mobile app onboarding flow for a health app',
  'An e-commerce site redesign for a luxury watch brand',
  'A pitch deck for a Series A startup',
] as const

// ---------------------------------------------------------------------------
// Prompt generation
// ---------------------------------------------------------------------------

export function generateTeamBuildPrompt(projectDescription: string): string {
  const rolesBlock = AGENT_ROLES.map((role) => {
    const meta = AGENT_ROLE_DEFINITIONS[role]
    return `  - **${role}**: ${meta.description}`
  }).join('\n')

  const axesBlock = PERSONALITY_AXES.map(
    (a) => `  - \`${a.key}\`: ${a.leftLabel} (-5) to ${a.rightLabel} (+5)`,
  ).join('\n')

  const traitsBlock = PERSONALITY_TRAITS.join(', ')

  return `You are an AI design team architect. Given a project description, you must compose the ideal team of AI design agents.

## Project Description
${projectDescription}

## Available Roles (pick 2–${MAX_TEAM_SIZE})
${rolesBlock}

## Personality Sliders
Each agent has 5 personality axes, each an integer from -5 to +5 (0 = neutral). The total absolute values across all sliders for one agent should not exceed ${MAX_POINTS_PER_AGENT}.

${axesBlock}

## Available Traits
Pick 2–4 traits per agent from this list:
${traitsBlock}

## Instructions
1. Select the roles most relevant to this project (minimum 2, maximum ${MAX_TEAM_SIZE}).
2. For each agent, set personality slider values that fit the project tone and goals.
3. Pick 2–4 traits per agent.
4. Give each agent a short, memorable name (one word, like "Nova" or "Pixel").
5. Write a customPrompt for each agent — 1–2 sentences describing their specific focus for THIS project.
6. Give the team a creative name that reflects the project.

## Output Format
Respond with ONLY a JSON object (no markdown fences, no explanation) matching this exact structure:

{
  "name": "Team Name",
  "agents": [
    {
      "name": "AgentName",
      "role": "role-key",
      "personality": {
        "sliders": {
          "bold-subtle": 0,
          "playful-serious": 0,
          "experimental-conventional": 0,
          "verbose-concise": 0,
          "warm-corporate": 0
        }
      },
      "traits": ["trait1", "trait2"],
      "customPrompt": "Focus instructions for this project..."
    }
  ]
}`
}

// ---------------------------------------------------------------------------
// Response parsing & validation
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

const VALID_ROLES = new Set<string>(AGENT_ROLES)
const VALID_AXES = new Set<string>(PERSONALITY_AXES.map((a) => a.key))
const VALID_TRAITS = new Set<string>(PERSONALITY_TRAITS)

let _parseCounter = 0
function uid(): string {
  return `ai-agent-${Date.now()}-${++_parseCounter}-${Math.random().toString(36).slice(2, 8)}`
}

function teamUid(): string {
  return `ai-team-${Date.now()}-${++_parseCounter}-${Math.random().toString(36).slice(2, 8)}`
}

function parseAgent(raw: unknown): Agent | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const role = typeof obj.role === 'string' ? obj.role : ''
  if (!VALID_ROLES.has(role)) return null

  const name = typeof obj.name === 'string' && obj.name.trim()
    ? obj.name.trim()
    : role

  // Parse personality sliders
  const sliders: Record<PersonalityAxis, number> = {
    'bold-subtle': 0,
    'playful-serious': 0,
    'experimental-conventional': 0,
    'verbose-concise': 0,
    'warm-corporate': 0,
  }

  const rawPersonality = obj.personality as Record<string, unknown> | undefined
  const rawSliders = rawPersonality?.sliders as Record<string, unknown> | undefined
  if (rawSliders && typeof rawSliders === 'object') {
    for (const [key, val] of Object.entries(rawSliders)) {
      if (VALID_AXES.has(key) && typeof val === 'number') {
        sliders[key as PersonalityAxis] = clamp(val, -5, 5)
      }
    }
  }

  // Parse traits — keep only valid ones
  const rawTraits = Array.isArray(obj.traits) ? obj.traits : []
  const traits = rawTraits
    .filter((t): t is string => typeof t === 'string' && VALID_TRAITS.has(t))
    .slice(0, 4)

  const customPrompt = typeof obj.customPrompt === 'string' ? obj.customPrompt : ''

  return {
    id: uid(),
    name,
    role: role as AgentRole,
    personality: { sliders },
    traits,
    customPrompt,
    skillFile: '',
  }
}

export function parseAITeamResponse(jsonString: string): Team | null {
  // Try to extract JSON from markdown fences if present
  let cleaned = jsonString.trim()
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>

  const rawAgents = Array.isArray(obj.agents) ? obj.agents : []
  if (rawAgents.length === 0) return null

  const agents = rawAgents
    .map(parseAgent)
    .filter((a): a is Agent => a !== null)
    .slice(0, MAX_TEAM_SIZE)

  if (agents.length === 0) return null

  const teamName = typeof obj.name === 'string' && obj.name.trim()
    ? obj.name.trim()
    : 'AI-Built Team'

  const now = new Date().toISOString()
  return {
    id: teamUid(),
    name: teamName,
    agents,
    createdAt: now,
    updatedAt: now,
  }
}
