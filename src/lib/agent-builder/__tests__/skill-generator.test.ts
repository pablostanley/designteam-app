import { describe, it, expect } from 'vitest'
import { generateSkillFile } from '../skill-generator'
import { createDefaultAgent, createDefaultPersonality } from '../types'

describe('generateSkillFile', () => {
  it('replaces {{PERSONALITY}} placeholder in base content', () => {
    const agent = createDefaultAgent('researcher')
    agent.personality.sliders['bold-subtle'] = -4
    const baseContent = {
      researcher: '# Researcher\n\n{{PERSONALITY}}\n\nDo research.',
    }
    const result = generateSkillFile(agent, baseContent)
    expect(result).not.toContain('{{PERSONALITY}}')
    expect(result).toContain('very bold')
    expect(result).toContain('Do research.')
  })

  it('returns minimal prompt when no base skill exists', () => {
    const agent = createDefaultAgent('copywriter')
    const result = generateSkillFile(agent, {})
    expect(result).toContain(`# ${agent.name}`)
    expect(result).toContain('## Personality')
  })

  it('appends personality at end when no placeholder in base content', () => {
    const agent = createDefaultAgent('researcher')
    const baseContent = {
      researcher: '# Researcher\n\nBase skill content here.',
    }
    const result = generateSkillFile(agent, baseContent)
    expect(result).toContain('Base skill content here.')
    expect(result).toContain('## Personality')
  })

  it('includes traits and customPrompt in output', () => {
    const agent = createDefaultAgent('graphic-designer')
    agent.traits = ['creative', 'minimalist']
    agent.customPrompt = 'Focus on typography'
    const result = generateSkillFile(agent, {})
    expect(result).toContain('creative, minimalist')
    expect(result).toContain('Focus on typography')
  })
})
