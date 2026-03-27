import { anthropic } from "@ai-sdk/anthropic"
import { streamText } from "ai"
import { AGENT_ROLES } from "@/lib/agent-builder/types"
import { AGENT_ROLE_DEFINITIONS } from "@/lib/agent-builder/role-definitions"
import {
  PERSONALITY_AXES,
  PERSONALITY_TRAITS,
  TRAIT_CATEGORIES,
  MAX_TEAM_SIZE,
} from "@/lib/agent-builder/types"

const rolesBlock = AGENT_ROLES.map((role) => {
  const meta = AGENT_ROLE_DEFINITIONS[role]
  return `  - ${role}: ${meta.description}`
}).join("\n")

const axesBlock = PERSONALITY_AXES.map(
  (a) => `  - ${a.key}: ${a.leftLabel} (-5) to ${a.rightLabel} (+5)`
).join("\n")

const traitsByCategory = Object.entries(TRAIT_CATEGORIES)
  .map(([, cat]) => `  ${cat.label}: ${cat.traits.join(", ")}`)
  .join("\n")

const SYSTEM_PROMPT = `You are the Design Team AI — you build specialized design teams for creative projects.

When the user describes a project, create a team of AI agents to work on it.

## Available Roles
${rolesBlock}

## Personality Sliders (each -5 to +5, 0 = neutral)
${axesBlock}

## Trait Categories (pick max 2 per category, 4-6 total per agent)
${traitsByCategory}

## Instructions
- Pick 3-6 agents depending on project scope
- Give each a creative one-word name (not the role name)
- Set slider values that match each agent's personality (not all zeros!)
- Pick 4-6 traits that create an interesting personality
- Write a customPrompt specific to THIS project (1-2 sentences)
- Create productive tension — a perfectionist designer and a fast-shipper engineer, a sassy copywriter and a nurturing UX writer, etc.
- Give the team a creative name that reflects the project

Respond with ONLY valid JSON (no markdown fences, no explanation):
{
  "name": "Team Name",
  "agents": [
    {
      "name": "AgentName",
      "role": "role-id",
      "personality": {
        "sliders": {
          "bold-subtle": 0,
          "playful-serious": 0,
          "experimental-conventional": 0,
          "verbose-concise": 0,
          "warm-corporate": 0
        }
      },
      "traits": ["trait1", "trait2", "trait3", "trait4"],
      "customPrompt": "Focus instructions for this project..."
    }
  ]
}`

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    )
  }

  const { prompt } = await req.json()

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "prompt is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    prompt: `Build a design team for this project: ${prompt.trim()}`,
    maxOutputTokens: 4000,
  })

  return result.toTextStreamResponse()
}
