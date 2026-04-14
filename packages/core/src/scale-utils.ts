/**
 * Scale Conversion Utilities
 *
 * Core uses -5 to +5 (bipolar, 0 = neutral).
 * Efecto historically used 0-10 with reversed polarity (10 = left label).
 *
 * Conversion: core = -(efecto - 5) = 5 - efecto
 *             efecto = 5 - core
 */

import type { PersonalityConfig, PersonalityAxis } from './types'
import { PERSONALITY_AXES, MAX_POINTS_PER_AGENT } from './types'

/** Convert a single 0-10 (Efecto) value to -5/+5 (core) */
export function scaleToCore(value010: number): number {
  return Math.round(Math.min(5, Math.max(-5, 5 - value010)))
}

/** Convert a single -5/+5 (core) value to 0-10 (Efecto) */
export function scaleFromCore(valueBipolar: number): number {
  return Math.round(Math.min(10, Math.max(0, 5 - valueBipolar)))
}

/** Convert an entire 0-10 PersonalityConfig to -5/+5 */
export function configToCore(
  config010: { sliders: Record<PersonalityAxis, number>; maxPoints?: number },
): PersonalityConfig {
  const sliders = {} as Record<PersonalityAxis, number>
  for (const axis of PERSONALITY_AXES) {
    sliders[axis.key] = scaleToCore(config010.sliders[axis.key] ?? 5)
  }
  return { sliders, pointBudget: config010.maxPoints }
}

/** Convert an entire -5/+5 PersonalityConfig to 0-10 */
export function configFromCore(
  config: PersonalityConfig,
): { sliders: Record<PersonalityAxis, number>; maxPoints: number } {
  const sliders = {} as Record<PersonalityAxis, number>
  for (const axis of PERSONALITY_AXES) {
    sliders[axis.key] = scaleFromCore(config.sliders[axis.key] ?? 0)
  }
  return { sliders, maxPoints: config.pointBudget ?? MAX_POINTS_PER_AGENT }
}
