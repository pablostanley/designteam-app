/**
 * Team Export — generate shareable markdown from a team configuration
 */

import type { Team } from './types'
import { personalityToPromptFragment } from './personality-engine'
import { AGENT_ROLE_DEFINITIONS } from './role-definitions'

export function teamToMarkdown(team: Team): string {
  const lines: string[] = []

  lines.push(`# Team: ${team.name}`)
  lines.push('')
  lines.push(
    `${team.agents.length} agent${team.agents.length !== 1 ? 's' : ''} configured for collaborative AI design.`,
  )

  if (team.agents.length > 0) {
    lines.push('')
    lines.push('## Agents')

    for (const agent of team.agents) {
      const meta = AGENT_ROLE_DEFINITIONS[agent.role]
      const fragment = personalityToPromptFragment(
        agent.personality,
        agent.traits,
        agent.customPrompt,
      )

      lines.push('')
      lines.push(`### ${agent.name} (${meta.displayName})`)
      lines.push('')
      lines.push(fragment)
      lines.push('')
      if (agent.traits.length > 0) {
        lines.push(`**Traits:** ${agent.traits.join(', ')}`)
        lines.push('')
      }
      if (agent.customPrompt.trim()) {
        lines.push(`**Custom Instructions:** ${agent.customPrompt.trim()}`)
        lines.push('')
      }
      lines.push(`**Role:** ${meta.description}`)
      lines.push('')
      lines.push('---')
    }
  }

  lines.push('')
  lines.push('## How to Use')
  lines.push('')
  lines.push(
    'Copy each agent\'s personality description into your AI tool\'s system prompt.',
  )
  lines.push(
    'For Claude Code, add these as custom instructions or skill files.',
  )
  lines.push('')

  return lines.join('\n')
}
