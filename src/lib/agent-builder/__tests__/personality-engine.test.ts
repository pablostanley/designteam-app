import { describe, it, expect } from 'vitest'
import { personalityToModifiers, personalityToPromptFragment, traitToPersonalityDescription, analyzeTeamTension } from '../personality-engine'
import type { Agent, PersonalityConfig } from '../types'
import { createDefaultAgent } from '../types'

function makeConfig(overrides: Partial<PersonalityConfig['sliders']> = {}): PersonalityConfig {
  return {
    sliders: {
      'bold-subtle': 0,
      'playful-serious': 0,
      'experimental-conventional': 0,
      'verbose-concise': 0,
      'warm-corporate': 0,
      ...overrides,
    },
  }
}

function makeAgent(name: string, traits: string[]): Agent {
  const agent = createDefaultAgent('researcher')
  agent.name = name
  agent.traits = traits
  return agent
}

describe('personalityToModifiers', () => {
  it('returns balanced for value 0', () => {
    const result = personalityToModifiers(makeConfig())
    expect(result['bold-subtle'].descriptor).toBe('balanced')
    expect(result['bold-subtle'].intensity).toBe('low')
  })

  it('returns strong left (very) for value -5', () => {
    const result = personalityToModifiers(makeConfig({ 'bold-subtle': -5 }))
    expect(result['bold-subtle'].descriptor).toBe('very bold')
    expect(result['bold-subtle'].intensity).toBe('high')
  })

  it('returns strong right (very) for value +5', () => {
    const result = personalityToModifiers(makeConfig({ 'bold-subtle': 5 }))
    expect(result['bold-subtle'].descriptor).toBe('very subtle')
    expect(result['bold-subtle'].intensity).toBe('high')
  })

  it('returns medium left for value -2', () => {
    const result = personalityToModifiers(makeConfig({ 'playful-serious': -2 }))
    expect(result['playful-serious'].descriptor).toBe('somewhat playful')
    expect(result['playful-serious'].intensity).toBe('medium')
  })

  it('returns medium right for value +2', () => {
    const result = personalityToModifiers(makeConfig({ 'playful-serious': 2 }))
    expect(result['playful-serious'].descriptor).toBe('somewhat serious')
    expect(result['playful-serious'].intensity).toBe('medium')
  })
})

describe('personalityToPromptFragment', () => {
  it('returns neutral message when all sliders are 0', () => {
    const result = personalityToPromptFragment(makeConfig())
    expect(result).toBe('You have a neutral, balanced communication style.')
  })

  it('skips axes at 0 and includes non-zero axes', () => {
    const result = personalityToPromptFragment(makeConfig({ 'bold-subtle': -3 }))
    expect(result).toContain('very bold')
    expect(result).not.toContain('balanced')
  })

  it('joins multiple non-zero axes with commas and "and"', () => {
    const result = personalityToPromptFragment(
      makeConfig({ 'bold-subtle': -3, 'playful-serious': 2 }),
    )
    expect(result).toContain('and')
  })

  it('includes personality description when traits provided', () => {
    const result = personalityToPromptFragment(makeConfig(), ['sassy', 'perfectionist'])
    expect(result).toContain('Your personality:')
    expect(result).toContain('sharp-tongued')
    expect(result).not.toContain('Key traits:')
  })

  it('falls back to Key traits for unknown traits', () => {
    const result = personalityToPromptFragment(makeConfig(), ['some-custom-trait'])
    expect(result).toContain('Key traits: some-custom-trait.')
  })

  it('includes customPrompt if provided', () => {
    const result = personalityToPromptFragment(makeConfig(), [], 'Focus on branding')
    expect(result).toContain('Additional instructions: Focus on branding')
  })

  it('includes both personality description and customPrompt', () => {
    const result = personalityToPromptFragment(
      makeConfig({ 'warm-corporate': 3 }),
      ['chill', 'fast-shipper'],
      'Be concise',
    )
    expect(result).toContain('very corporate')
    expect(result).toContain('Your personality:')
    expect(result).toContain('easygoing')
    expect(result).toContain('Additional instructions: Be concise')
  })
})

describe('traitToPersonalityDescription', () => {
  it('returns empty string for no traits', () => {
    expect(traitToPersonalityDescription([])).toBe('')
  })

  it('produces natural description for known traits', () => {
    const result = traitToPersonalityDescription(['sassy', 'perfectionist', 'leader', 'thinking'])
    expect(result).toContain('Your personality:')
    expect(result).toContain('sharp-tongued')
    expect(result).toContain("don't ship")
    expect(result).toContain('logic and evidence')
  })

  it('includes conflict and cares lines', () => {
    const result = traitToPersonalityDescription(['chill', 'fast-shipper'])
    expect(result).toContain('easygoing')
    expect(result).toContain('ship')
    // Should have conflict and cares
    expect(result.split('\n').length).toBeGreaterThanOrEqual(3)
  })

  it('falls back to Key traits for unknown traits', () => {
    const result = traitToPersonalityDescription(['unknown-trait-xyz'])
    expect(result).toBe('Key traits: unknown-trait-xyz.')
  })

  it('handles mix of known and unknown traits', () => {
    const result = traitToPersonalityDescription(['sassy', 'unknown-trait'])
    expect(result).toContain('Your personality:')
    expect(result).toContain('sharp-tongued')
  })
})

describe('analyzeTeamTension', () => {
  it('returns empty array when no tensions exist', () => {
    const agents = [makeAgent('A', ['chill']), makeAgent('B', ['stoic'])]
    expect(analyzeTeamTension(agents)).toEqual([])
  })

  it('detects perfectionist vs fast-shipper tension', () => {
    const agents = [
      makeAgent('Pixel', ['perfectionist']),
      makeAgent('Kit', ['fast-shipper']),
    ]
    const tensions = analyzeTeamTension(agents)
    expect(tensions).toHaveLength(1)
    expect(tensions[0].description).toContain('Quality vs Speed')
    expect(tensions[0].agentA).toBe('Pixel')
    expect(tensions[0].agentB).toBe('Kit')
    expect(tensions[0].traitA).toBe('perfectionist')
    expect(tensions[0].traitB).toBe('fast-shipper')
  })

  it('detects multiple tensions in a team', () => {
    const agents = [
      makeAgent('Pixel', ['perfectionist', 'introvert', 'thinking']),
      makeAgent('Kit', ['fast-shipper', 'extrovert', 'feeling']),
    ]
    const tensions = analyzeTeamTension(agents)
    expect(tensions.length).toBeGreaterThanOrEqual(3) // quality/speed, introvert/extrovert, thinking/feeling
  })

  it('does not create tension within the same agent', () => {
    const agents = [makeAgent('Solo', ['perfectionist', 'fast-shipper'])]
    const tensions = analyzeTeamTension(agents)
    expect(tensions).toHaveLength(0)
  })

  it('returns agent names in tension pairs', () => {
    const agents = [
      makeAgent('Scout', ['methodical']),
      makeAgent('Buzz', ['chaotic-creative']),
    ]
    const tensions = analyzeTeamTension(agents)
    expect(tensions).toHaveLength(1)
    expect(tensions[0].agentA).toBe('Scout')
    expect(tensions[0].agentB).toBe('Buzz')
  })
})
