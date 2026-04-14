/**
 * Team Export — generate shareable markdown from a team configuration
 */

import type { Team } from './types'
import { personalityToPromptFragment } from './personality-engine'
import { AGENT_ROLE_DEFINITIONS } from './role-definitions'
import { generateSkillFile } from './skill-generator'
import { AGENT_SKILL_CONTENT } from './agent-skills-generated'

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
      if (agent.customPrompt.trim()) {
        lines.push(`**Custom Instructions:** ${agent.customPrompt.trim()}`)
        lines.push('')
      }
      lines.push(`**Role:** ${meta.description}`)
      lines.push('')

      // Generate and include full skill file
      const skillFile = generateSkillFile(agent, AGENT_SKILL_CONTENT)
      if (skillFile) {
        lines.push('<details>')
        lines.push(`<summary>Skill File for ${agent.name}</summary>`)
        lines.push('')
        lines.push(skillFile)
        lines.push('')
        lines.push('</details>')
        lines.push('')
      }

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
