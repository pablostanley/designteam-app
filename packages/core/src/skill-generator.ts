/**
 * Skill Generator — merges base skill markdown with personality injection
 */

import type { Agent } from './types'
import { personalityToPromptFragment } from './personality-engine'

/**
 * Generate the final skill file for an agent.
 *
 * @param agent - The agent to generate for
 * @param baseSkillContent - Map of role key → markdown content (from build-generated AGENT_SKILL_CONTENT)
 * @returns Final skill markdown with personality injected
 */
export function generateSkillFile(
  agent: Agent,
  baseSkillContent: Record<string, string>,
): string {
  const fragment = personalityToPromptFragment(
    agent.personality,
    agent.traits,
    agent.customPrompt,
  )

  // Look up base skill content by role key
  const baseContent = baseSkillContent[agent.role]

  if (!baseContent) {
    // Minimal prompt with just personality
    return [
      `# ${agent.name}`,
      '',
      `## Personality`,
      '',
      fragment,
    ].join('\n')
  }

  // Replace {{PERSONALITY}} placeholder
  if (baseContent.includes('{{PERSONALITY}}')) {
    return baseContent.replace(/\{\{PERSONALITY\}\}/g, fragment)
  }

  // If no placeholder, append personality at the end
  return baseContent + '\n\n## Personality\n\n' + fragment
}
