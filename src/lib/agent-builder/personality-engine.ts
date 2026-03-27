/**
 * Personality Engine — bipolar sliders (-5 to +5) → descriptors → prompt fragments
 */

import type { PersonalityAxis, PersonalityConfig } from './types'
import { PERSONALITY_AXES } from './types'

// ---------------------------------------------------------------------------
// Descriptors
// ---------------------------------------------------------------------------

type Intensity = 'low' | 'medium' | 'high'

export function personalityToModifiers(
  config: PersonalityConfig,
): Record<PersonalityAxis, { descriptor: string; intensity: Intensity }> {
  const result = {} as Record<
    PersonalityAxis,
    { descriptor: string; intensity: Intensity }
  >

  for (const axis of PERSONALITY_AXES) {
    const value = config.sliders[axis.key]
    result[axis.key] = describeAxis(axis.leftLabel, axis.rightLabel, value)
  }

  return result
}

function describeAxis(
  leftLabel: string,
  rightLabel: string,
  value: number,
): { descriptor: string; intensity: Intensity } {
  const left = leftLabel.toLowerCase()
  const right = rightLabel.toLowerCase()

  // Negative = left trait, Positive = right trait
  if (value <= -3) return { descriptor: `very ${left}`, intensity: 'high' }
  if (value <= -1) return { descriptor: `somewhat ${left}`, intensity: 'medium' }
  if (value === 0) return { descriptor: 'balanced', intensity: 'low' }
  if (value <= 2) return { descriptor: `somewhat ${right}`, intensity: 'medium' }
  return { descriptor: `very ${right}`, intensity: 'high' }
}

// ---------------------------------------------------------------------------
// Prompt Fragment
// ---------------------------------------------------------------------------

const AXIS_TEMPLATES: Record<PersonalityAxis, (desc: string) => string> = {
  'bold-subtle': (d) => `a ${d} tone`,
  'playful-serious': (d) => `a ${d} manner`,
  'experimental-conventional': (d) => `${d} approaches`,
  'verbose-concise': (d) => `${d} responses`,
  'warm-corporate': (d) => `a ${d} style`,
}

export function personalityToPromptFragment(
  config: PersonalityConfig,
  traits?: string[],
  customPrompt?: string,
): string {
  const modifiers = personalityToModifiers(config)
  const parts: string[] = []

  for (const axis of PERSONALITY_AXES) {
    const value = config.sliders[axis.key]
    if (value === 0) continue // skip neutral axes
    const mod = modifiers[axis.key]
    const template = AXIS_TEMPLATES[axis.key]
    parts.push(template(mod.descriptor))
  }

  const lines: string[] = []

  if (parts.length === 0) {
    lines.push('You have a neutral, balanced communication style.')
  } else {
    const joined =
      parts.length === 1
        ? parts[0]
        : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1]
    lines.push(`You communicate with ${joined}.`)
  }

  if (traits && traits.length > 0) {
    lines.push(`Key traits: ${traits.join(', ')}.`)
  }

  if (customPrompt && customPrompt.trim()) {
    lines.push(`Additional instructions: ${customPrompt.trim()}`)
  }

  return lines.join('\n')
}
