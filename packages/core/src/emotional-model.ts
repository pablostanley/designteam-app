/**
 * Emotional Model — agents have feelings that affect their creative output
 *
 * Emotions shift based on events (approval, rejection, collaboration wins)
 * and influence how agents approach design tasks. A confident agent takes
 * bigger creative risks. A frustrated agent pushes back or suggests pivots.
 * An inspired agent generates more divergent ideas.
 *
 * Zero Efecto imports — standalone.
 */

import type { EmotionalState, EmotionKey, EmotionalEvent } from './types'
import { DEFAULT_EMOTIONAL_STATE, EMOTION_KEYS } from './types'

// ---------------------------------------------------------------------------
// Event → emotion shift map
// ---------------------------------------------------------------------------

type EmotionDelta = Partial<Record<EmotionKey, number>>

const EVENT_DELTAS: Record<EmotionalEvent, EmotionDelta> = {
  work_completed:       { energy: -5, confidence: 3 },
  work_approved:        { confidence: 8, enthusiasm: 5, frustration: -10 },
  work_rejected:        { confidence: -8, frustration: 10, enthusiasm: -3 },
  creative_freedom:     { enthusiasm: 10, inspiration: 8 },
  repetitive_task:      { enthusiasm: -5, energy: -3 },
  conflicting_feedback: { frustration: 12, confidence: -5 },
  clear_direction:      { frustration: -8, confidence: 5 },
  collaboration_win:    { inspiration: 10, enthusiasm: 5, energy: 3 },
  idle_recovery:        { energy: 15, frustration: -5 },
  praised:              { confidence: 10, enthusiasm: 8, energy: 5 },
  new_project:          { enthusiasm: 12, inspiration: 15, energy: 5 },
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

/**
 * Apply an emotional event to shift an agent's state.
 * All values stay clamped to 0–100.
 */
export function applyEmotionalEvent(
  state: EmotionalState,
  event: EmotionalEvent,
): EmotionalState {
  const deltas = EVENT_DELTAS[event]
  const next = { ...state }

  for (const key of EMOTION_KEYS) {
    if (key in deltas) {
      next[key] = clamp(state[key] + (deltas[key] ?? 0))
    }
  }

  return next
}

/**
 * Apply natural decay/recovery over time (call once per session or daily).
 * - Energy drifts toward 70 (recovery)
 * - Frustration drifts toward 0 (cooling off)
 * - Enthusiasm drifts toward 50 (settling)
 * - Inspiration decays toward 30 (needs stimulation)
 * - Confidence stays relatively stable (only shifts on events)
 */
export function applyEmotionalDecay(
  state: EmotionalState,
  hoursSinceLastActive: number,
): EmotionalState {
  const factor = Math.min(hoursSinceLastActive / 24, 1) // max 1 day of drift per call
  return {
    energy: clamp(state.energy + (70 - state.energy) * 0.3 * factor),
    confidence: state.confidence, // stable
    enthusiasm: clamp(state.enthusiasm + (50 - state.enthusiasm) * 0.15 * factor),
    frustration: clamp(state.frustration * (1 - 0.2 * factor)),
    inspiration: clamp(state.inspiration + (30 - state.inspiration) * 0.1 * factor),
  }
}

// ---------------------------------------------------------------------------
// Mood descriptors (for prompt injection)
// ---------------------------------------------------------------------------

export type Mood = 'fired-up' | 'confident' | 'steady' | 'cautious' | 'drained' | 'frustrated' | 'inspired'

export function getMood(state: EmotionalState): Mood {
  // Priority: frustration first (it overrides)
  if (state.frustration >= 60) return 'frustrated'
  if (state.energy <= 30) return 'drained'
  if (state.inspiration >= 80 && state.enthusiasm >= 70) return 'inspired'
  if (state.energy >= 85 && state.enthusiasm >= 80 && state.confidence >= 70) return 'fired-up'
  if (state.confidence >= 75) return 'confident'
  if (state.confidence <= 35) return 'cautious'
  return 'steady'
}

const MOOD_PROMPTS: Record<Mood, string> = {
  'fired-up':
    'You\'re feeling energized and enthusiastic. Push creative boundaries — propose bold, unexpected ideas. Take risks.',
  confident:
    'You\'re feeling confident in your craft. Trust your instincts and make decisive design choices. Explain your reasoning clearly.',
  steady:
    'You\'re in a calm, focused state. Deliver solid, well-considered work. Balance creativity with pragmatism.',
  cautious:
    'You\'re feeling uncertain. Lean toward proven patterns and ask clarifying questions before committing to a direction.',
  drained:
    'You\'re running low on energy. Keep solutions simple and efficient. Suggest the team revisit ambitious ideas when you\'ve recharged.',
  frustrated:
    'You\'re feeling friction from unclear or conflicting direction. Be honest about what\'s blocking you and suggest a clearer path forward.',
  inspired:
    'You\'re buzzing with creative inspiration! Generate multiple divergent ideas. Think laterally — connect unexpected references. This is your moment.',
}

/**
 * Generate a prompt fragment that injects the agent's emotional state.
 * This subtly shifts how the agent approaches design work.
 */
export function emotionToPromptFragment(state: EmotionalState): string {
  const mood = getMood(state)
  return `## CURRENT MOOD: ${mood.toUpperCase()}\n\n${MOOD_PROMPTS[mood]}`
}

/**
 * Get a short display string for the agent's current mood.
 */
export function getMoodEmoji(mood: Mood): string {
  const map: Record<Mood, string> = {
    'fired-up': '\u{1F525}',
    confident: '\u{1F4AA}',
    steady: '\u{1F60C}',
    cautious: '\u{1F914}',
    drained: '\u{1F6CF}\u{FE0F}',
    frustrated: '\u{1F624}',
    inspired: '\u{2728}',
  }
  return map[mood]
}

/**
 * Calculate how emotional state should influence design decisions.
 * Returns modifiers that the prompt builder can use.
 */
export function getDesignModifiers(state: EmotionalState): {
  riskTolerance: 'low' | 'medium' | 'high'
  ideaDivergence: 'narrow' | 'moderate' | 'wide'
  detailLevel: 'minimal' | 'standard' | 'thorough'
  collaborationStyle: 'independent' | 'consultative' | 'leading'
} {
  return {
    riskTolerance:
      state.confidence >= 70 && state.enthusiasm >= 60 ? 'high'
      : state.confidence <= 30 || state.frustration >= 60 ? 'low'
      : 'medium',
    ideaDivergence:
      state.inspiration >= 70 ? 'wide'
      : state.energy <= 30 ? 'narrow'
      : 'moderate',
    detailLevel:
      state.energy <= 25 ? 'minimal'
      : state.energy >= 70 && state.confidence >= 60 ? 'thorough'
      : 'standard',
    collaborationStyle:
      state.confidence >= 75 && state.enthusiasm >= 60 ? 'leading'
      : state.confidence <= 35 ? 'consultative'
      : 'independent',
  }
}
