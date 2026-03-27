import { describe, it, expect } from 'vitest'
import { personalityToModifiers, personalityToPromptFragment } from '../personality-engine'
import type { PersonalityConfig } from '../types'

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

  it('includes traits if provided', () => {
    const result = personalityToPromptFragment(makeConfig(), ['creative', 'analytical'])
    expect(result).toContain('Key traits: creative, analytical.')
  })

  it('includes customPrompt if provided', () => {
    const result = personalityToPromptFragment(makeConfig(), [], 'Focus on branding')
    expect(result).toContain('Additional instructions: Focus on branding')
  })

  it('includes both traits and customPrompt', () => {
    const result = personalityToPromptFragment(
      makeConfig({ 'warm-corporate': 3 }),
      ['empathetic'],
      'Be concise',
    )
    expect(result).toContain('very corporate')
    expect(result).toContain('Key traits: empathetic.')
    expect(result).toContain('Additional instructions: Be concise')
  })
})
