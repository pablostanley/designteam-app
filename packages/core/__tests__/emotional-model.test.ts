import { describe, it, expect } from 'vitest'
import {
  applyEmotionalEvent,
  applyEmotionalDecay,
  getMood,
  emotionToPromptFragment,
  getDesignModifiers,
} from '../src/emotional-model'
import type { EmotionalState } from '../src/types'
import { DEFAULT_EMOTIONAL_STATE } from '../src/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create an emotional state with all values at a given baseline */
function makeState(overrides: Partial<EmotionalState> = {}): EmotionalState {
  return { ...DEFAULT_EMOTIONAL_STATE, ...overrides }
}

// ---------------------------------------------------------------------------
// applyEmotionalEvent
// ---------------------------------------------------------------------------

describe('applyEmotionalEvent', () => {
  it('work_approved increases confidence and enthusiasm, decreases frustration', () => {
    const before = makeState({ confidence: 50, enthusiasm: 50, frustration: 30 })
    const after = applyEmotionalEvent(before, 'work_approved')
    expect(after.confidence).toBe(58) // +8
    expect(after.enthusiasm).toBe(55) // +5
    expect(after.frustration).toBe(20) // -10
  })

  it('work_rejected decreases confidence and enthusiasm, increases frustration', () => {
    const before = makeState({ confidence: 60, enthusiasm: 60, frustration: 20 })
    const after = applyEmotionalEvent(before, 'work_rejected')
    expect(after.confidence).toBe(52) // -8
    expect(after.enthusiasm).toBe(57) // -3
    expect(after.frustration).toBe(30) // +10
  })

  it('praised increases confidence, enthusiasm, and energy', () => {
    const before = makeState({ confidence: 40, enthusiasm: 40, energy: 50 })
    const after = applyEmotionalEvent(before, 'praised')
    expect(after.confidence).toBe(50) // +10
    expect(after.enthusiasm).toBe(48) // +8
    expect(after.energy).toBe(55) // +5
  })

  it('conflicting_feedback increases frustration and decreases confidence', () => {
    const before = makeState({ frustration: 20, confidence: 50 })
    const after = applyEmotionalEvent(before, 'conflicting_feedback')
    expect(after.frustration).toBe(32) // +12
    expect(after.confidence).toBe(45) // -5
  })

  it('new_project boosts enthusiasm, inspiration, and energy', () => {
    const before = makeState({ enthusiasm: 40, inspiration: 30, energy: 60 })
    const after = applyEmotionalEvent(before, 'new_project')
    expect(after.enthusiasm).toBe(52) // +12
    expect(after.inspiration).toBe(45) // +15
    expect(after.energy).toBe(65) // +5
  })

  it('creative_freedom boosts enthusiasm and inspiration', () => {
    const before = makeState({ enthusiasm: 50, inspiration: 50 })
    const after = applyEmotionalEvent(before, 'creative_freedom')
    expect(after.enthusiasm).toBe(60) // +10
    expect(after.inspiration).toBe(58) // +8
  })

  it('collaboration_win boosts inspiration, enthusiasm, and energy', () => {
    const before = makeState({ inspiration: 40, enthusiasm: 40, energy: 60 })
    const after = applyEmotionalEvent(before, 'collaboration_win')
    expect(after.inspiration).toBe(50) // +10
    expect(after.enthusiasm).toBe(45) // +5
    expect(after.energy).toBe(63) // +3
  })

  it('clear_direction decreases frustration and increases confidence', () => {
    const before = makeState({ frustration: 50, confidence: 40 })
    const after = applyEmotionalEvent(before, 'clear_direction')
    expect(after.frustration).toBe(42) // -8
    expect(after.confidence).toBe(45) // +5
  })

  it('does not change emotions not in the event delta', () => {
    const before = makeState({ inspiration: 50 })
    const after = applyEmotionalEvent(before, 'work_approved')
    // work_approved only affects confidence, enthusiasm, frustration
    expect(after.inspiration).toBe(50)
    expect(after.energy).toBe(before.energy)
  })

  it('clamps values at 0 (never goes negative)', () => {
    const before = makeState({ frustration: 3 })
    const after = applyEmotionalEvent(before, 'work_approved')
    // frustration: 3 + (-10) = -7 -> clamped to 0
    expect(after.frustration).toBe(0)
  })

  it('clamps values at 100 (never exceeds max)', () => {
    const before = makeState({ confidence: 98 })
    const after = applyEmotionalEvent(before, 'praised')
    // confidence: 98 + 10 = 108 -> clamped to 100
    expect(after.confidence).toBe(100)
  })

  it('does not mutate the original state', () => {
    const before = makeState()
    const beforeCopy = { ...before }
    applyEmotionalEvent(before, 'work_approved')
    expect(before).toEqual(beforeCopy)
  })

  it('stacking multiple events accumulates changes', () => {
    let state = makeState({ confidence: 50, frustration: 40 })
    state = applyEmotionalEvent(state, 'work_rejected') // confidence -8, frustration +10
    state = applyEmotionalEvent(state, 'conflicting_feedback') // confidence -5, frustration +12
    expect(state.confidence).toBe(37) // 50 - 8 - 5
    expect(state.frustration).toBe(62) // 40 + 10 + 12
  })
})

// ---------------------------------------------------------------------------
// applyEmotionalDecay
// ---------------------------------------------------------------------------

describe('applyEmotionalDecay', () => {
  it('confidence stays stable regardless of time', () => {
    const before = makeState({ confidence: 40 })
    const after = applyEmotionalDecay(before, 24)
    expect(after.confidence).toBe(40)
  })

  it('energy drifts toward 70 after 24 hours', () => {
    const low = applyEmotionalDecay(makeState({ energy: 30 }), 24)
    // 30 + (70-30)*0.3*1 = 30 + 12 = 42
    expect(low.energy).toBe(42)

    const high = applyEmotionalDecay(makeState({ energy: 100 }), 24)
    // 100 + (70-100)*0.3*1 = 100 - 9 = 91
    expect(high.energy).toBe(91)
  })

  it('frustration decays toward 0 after 24 hours', () => {
    const before = makeState({ frustration: 60 })
    const after = applyEmotionalDecay(before, 24)
    // 60 * (1 - 0.2*1) = 60 * 0.8 = 48
    expect(after.frustration).toBe(48)
  })

  it('enthusiasm drifts toward 50 after 24 hours', () => {
    const high = applyEmotionalDecay(makeState({ enthusiasm: 90 }), 24)
    // 90 + (50-90)*0.15*1 = 90 - 6 = 84
    expect(high.enthusiasm).toBe(84)

    const low = applyEmotionalDecay(makeState({ enthusiasm: 20 }), 24)
    // 20 + (50-20)*0.15*1 = 20 + 4.5 = 25 (rounded)
    expect(low.enthusiasm).toBe(25)
  })

  it('inspiration decays toward 30 after 24 hours', () => {
    const high = applyEmotionalDecay(makeState({ inspiration: 80 }), 24)
    // 80 + (30-80)*0.1*1 = 80 - 5 = 75
    expect(high.inspiration).toBe(75)

    const low = applyEmotionalDecay(makeState({ inspiration: 10 }), 24)
    // 10 + (30-10)*0.1*1 = 10 + 2 = 12
    expect(low.inspiration).toBe(12)
  })

  it('zero hours means no change', () => {
    const before = makeState({ energy: 30, frustration: 80, enthusiasm: 90 })
    const after = applyEmotionalDecay(before, 0)
    expect(after.energy).toBe(30)
    expect(after.frustration).toBe(80)
    expect(after.enthusiasm).toBe(90)
    expect(after.inspiration).toBe(before.inspiration)
  })

  it('partial day applies fractional decay', () => {
    const before = makeState({ frustration: 60 })
    const after = applyEmotionalDecay(before, 12)
    // factor = 12/24 = 0.5
    // 60 * (1 - 0.2*0.5) = 60 * 0.9 = 54
    expect(after.frustration).toBe(54)
  })

  it('time beyond 24 hours is capped at factor=1', () => {
    const before = makeState({ frustration: 60 })
    const at24 = applyEmotionalDecay(before, 24)
    const at48 = applyEmotionalDecay(before, 48)
    // Both should produce the same result since factor caps at 1
    expect(at24).toEqual(at48)
  })

  it('does not mutate the original state', () => {
    const before = makeState()
    const beforeCopy = { ...before }
    applyEmotionalDecay(before, 24)
    expect(before).toEqual(beforeCopy)
  })
})

// ---------------------------------------------------------------------------
// getMood
// ---------------------------------------------------------------------------

describe('getMood', () => {
  it('returns "frustrated" when frustration >= 60', () => {
    expect(getMood(makeState({ frustration: 60 }))).toBe('frustrated')
    expect(getMood(makeState({ frustration: 100 }))).toBe('frustrated')
  })

  it('frustrated overrides other high values', () => {
    // High everything but frustration dominates
    expect(
      getMood(makeState({
        frustration: 70,
        energy: 90,
        enthusiasm: 90,
        confidence: 90,
        inspiration: 90,
      })),
    ).toBe('frustrated')
  })

  it('returns "drained" when energy <= 30 and not frustrated', () => {
    expect(getMood(makeState({ energy: 30, frustration: 10 }))).toBe('drained')
    expect(getMood(makeState({ energy: 10, frustration: 10 }))).toBe('drained')
  })

  it('returns "inspired" when inspiration >= 80 and enthusiasm >= 70', () => {
    expect(
      getMood(makeState({ inspiration: 80, enthusiasm: 70, energy: 60, frustration: 10 })),
    ).toBe('inspired')
    expect(
      getMood(makeState({ inspiration: 95, enthusiasm: 85, energy: 60, frustration: 10 })),
    ).toBe('inspired')
  })

  it('returns "fired-up" when energy >= 85, enthusiasm >= 80, confidence >= 70', () => {
    expect(
      getMood(makeState({
        energy: 85,
        enthusiasm: 80,
        confidence: 70,
        inspiration: 50,
        frustration: 10,
      })),
    ).toBe('fired-up')
  })

  it('returns "confident" when confidence >= 75', () => {
    expect(
      getMood(makeState({ confidence: 75, energy: 60, enthusiasm: 50, frustration: 10 })),
    ).toBe('confident')
  })

  it('returns "cautious" when confidence <= 35', () => {
    expect(
      getMood(makeState({ confidence: 35, energy: 60, frustration: 10 })),
    ).toBe('cautious')
    expect(
      getMood(makeState({ confidence: 10, energy: 60, frustration: 10 })),
    ).toBe('cautious')
  })

  it('returns "steady" as the default fallback', () => {
    // Middle-of-the-road values: confidence 50, energy 60, no high frustration, etc.
    expect(
      getMood(makeState({
        confidence: 50,
        energy: 60,
        enthusiasm: 50,
        frustration: 10,
        inspiration: 40,
      })),
    ).toBe('steady')
  })

  it('"inspired" requires BOTH high inspiration and high enthusiasm', () => {
    // High inspiration but low enthusiasm -> not "inspired"
    const notInspired = getMood(makeState({ inspiration: 90, enthusiasm: 50, energy: 60, frustration: 0 }))
    expect(notInspired).not.toBe('inspired')
  })
})

// ---------------------------------------------------------------------------
// emotionToPromptFragment
// ---------------------------------------------------------------------------

describe('emotionToPromptFragment', () => {
  it('returns a non-empty string', () => {
    const result = emotionToPromptFragment(DEFAULT_EMOTIONAL_STATE)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes the mood name in uppercase', () => {
    const steady = emotionToPromptFragment(makeState({ confidence: 50, energy: 60, frustration: 10 }))
    expect(steady).toContain('STEADY')
  })

  it('includes mood-specific guidance text for frustrated', () => {
    const fragment = emotionToPromptFragment(makeState({ frustration: 80 }))
    expect(fragment).toContain('FRUSTRATED')
    expect(fragment).toContain('friction')
  })

  it('includes mood-specific guidance text for inspired', () => {
    const fragment = emotionToPromptFragment(
      makeState({ inspiration: 90, enthusiasm: 80, energy: 60, frustration: 0 }),
    )
    expect(fragment).toContain('INSPIRED')
    expect(fragment).toContain('divergent')
  })

  it('includes mood-specific guidance text for drained', () => {
    const fragment = emotionToPromptFragment(makeState({ energy: 20, frustration: 10 }))
    expect(fragment).toContain('DRAINED')
    expect(fragment).toContain('simple')
  })

  it('includes mood-specific guidance text for confident', () => {
    const fragment = emotionToPromptFragment(
      makeState({ confidence: 80, energy: 60, frustration: 10 }),
    )
    expect(fragment).toContain('CONFIDENT')
    expect(fragment).toContain('instincts')
  })

  it('includes mood-specific guidance text for fired-up', () => {
    const fragment = emotionToPromptFragment(
      makeState({ energy: 90, enthusiasm: 85, confidence: 75, frustration: 0 }),
    )
    expect(fragment).toContain('FIRED-UP')
    expect(fragment).toContain('bold')
  })

  it('includes mood-specific guidance text for cautious', () => {
    const fragment = emotionToPromptFragment(
      makeState({ confidence: 30, energy: 60, frustration: 10 }),
    )
    expect(fragment).toContain('CAUTIOUS')
    expect(fragment).toContain('proven patterns')
  })

  it('starts with a markdown heading', () => {
    const result = emotionToPromptFragment(DEFAULT_EMOTIONAL_STATE)
    expect(result).toMatch(/^## CURRENT MOOD:/)
  })
})

// ---------------------------------------------------------------------------
// getDesignModifiers
// ---------------------------------------------------------------------------

describe('getDesignModifiers', () => {
  describe('riskTolerance', () => {
    it('returns "high" when confidence >= 70 and enthusiasm >= 60', () => {
      const m = getDesignModifiers(makeState({ confidence: 70, enthusiasm: 60, frustration: 10 }))
      expect(m.riskTolerance).toBe('high')
    })

    it('returns "low" when confidence <= 30', () => {
      const m = getDesignModifiers(makeState({ confidence: 30, enthusiasm: 50, frustration: 10 }))
      expect(m.riskTolerance).toBe('low')
    })

    it('returns "low" when frustration >= 60', () => {
      const m = getDesignModifiers(makeState({ confidence: 50, frustration: 60 }))
      expect(m.riskTolerance).toBe('low')
    })

    it('returns "medium" otherwise', () => {
      const m = getDesignModifiers(makeState({ confidence: 50, enthusiasm: 50, frustration: 30 }))
      expect(m.riskTolerance).toBe('medium')
    })
  })

  describe('ideaDivergence', () => {
    it('returns "wide" when inspiration >= 70', () => {
      const m = getDesignModifiers(makeState({ inspiration: 70, energy: 60 }))
      expect(m.ideaDivergence).toBe('wide')
    })

    it('returns "narrow" when energy <= 30', () => {
      const m = getDesignModifiers(makeState({ energy: 30, inspiration: 40 }))
      expect(m.ideaDivergence).toBe('narrow')
    })

    it('returns "moderate" otherwise', () => {
      const m = getDesignModifiers(makeState({ inspiration: 50, energy: 60 }))
      expect(m.ideaDivergence).toBe('moderate')
    })
  })

  describe('detailLevel', () => {
    it('returns "minimal" when energy <= 25', () => {
      const m = getDesignModifiers(makeState({ energy: 25 }))
      expect(m.detailLevel).toBe('minimal')
    })

    it('returns "thorough" when energy >= 70 and confidence >= 60', () => {
      const m = getDesignModifiers(makeState({ energy: 70, confidence: 60 }))
      expect(m.detailLevel).toBe('thorough')
    })

    it('returns "standard" otherwise', () => {
      const m = getDesignModifiers(makeState({ energy: 50, confidence: 50 }))
      expect(m.detailLevel).toBe('standard')
    })
  })

  describe('collaborationStyle', () => {
    it('returns "leading" when confidence >= 75 and enthusiasm >= 60', () => {
      const m = getDesignModifiers(makeState({ confidence: 75, enthusiasm: 60 }))
      expect(m.collaborationStyle).toBe('leading')
    })

    it('returns "consultative" when confidence <= 35', () => {
      const m = getDesignModifiers(makeState({ confidence: 35 }))
      expect(m.collaborationStyle).toBe('consultative')
    })

    it('returns "independent" otherwise', () => {
      const m = getDesignModifiers(makeState({ confidence: 50, enthusiasm: 50 }))
      expect(m.collaborationStyle).toBe('independent')
    })
  })

  it('returns all four modifier keys', () => {
    const m = getDesignModifiers(DEFAULT_EMOTIONAL_STATE)
    expect(m).toHaveProperty('riskTolerance')
    expect(m).toHaveProperty('ideaDivergence')
    expect(m).toHaveProperty('detailLevel')
    expect(m).toHaveProperty('collaborationStyle')
  })

  it('all modifiers are from valid value sets', () => {
    const m = getDesignModifiers(DEFAULT_EMOTIONAL_STATE)
    expect(['low', 'medium', 'high']).toContain(m.riskTolerance)
    expect(['narrow', 'moderate', 'wide']).toContain(m.ideaDivergence)
    expect(['minimal', 'standard', 'thorough']).toContain(m.detailLevel)
    expect(['independent', 'consultative', 'leading']).toContain(m.collaborationStyle)
  })
})
