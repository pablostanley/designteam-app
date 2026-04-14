import { describe, it, expect } from 'vitest'
import {
  scaleToCore,
  scaleFromCore,
  configToCore,
  configFromCore,
} from '../src/scale-utils'
import type { PersonalityAxis, PersonalityConfig } from '../src/types'
import { PERSONALITY_AXES } from '../src/types'

// ---------------------------------------------------------------------------
// scaleToCore  (0-10 → -5/+5)
// ---------------------------------------------------------------------------

describe('scaleToCore', () => {
  it('maps 0 → 5', () => {
    expect(scaleToCore(0)).toBe(5)
  })

  it('maps 5 → 0 (neutral)', () => {
    expect(scaleToCore(5)).toBe(0)
  })

  it('maps 10 → -5', () => {
    expect(scaleToCore(10)).toBe(-5)
  })

  it('maps 7 → -2', () => {
    expect(scaleToCore(7)).toBe(-2)
  })

  it('maps 3 → 2', () => {
    expect(scaleToCore(3)).toBe(2)
  })

  it('clamps values above 10', () => {
    // 5 - 15 = -10, but clamped to -5
    expect(scaleToCore(15)).toBe(-5)
  })

  it('clamps values below 0', () => {
    // 5 - (-5) = 10, but clamped to 5
    expect(scaleToCore(-5)).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// scaleFromCore  (-5/+5 → 0-10)
// ---------------------------------------------------------------------------

describe('scaleFromCore', () => {
  it('maps 0 → 5 (neutral)', () => {
    expect(scaleFromCore(0)).toBe(5)
  })

  it('maps -5 → 10', () => {
    expect(scaleFromCore(-5)).toBe(10)
  })

  it('maps 5 → 0', () => {
    expect(scaleFromCore(5)).toBe(0)
  })

  it('maps -2 → 7', () => {
    expect(scaleFromCore(-2)).toBe(7)
  })

  it('maps 2 → 3', () => {
    expect(scaleFromCore(2)).toBe(3)
  })

  it('clamps values above 5', () => {
    // 5 - 10 = -5, but clamped to 0
    expect(scaleFromCore(10)).toBe(0)
  })

  it('clamps values below -5', () => {
    // 5 - (-10) = 15, but clamped to 10
    expect(scaleFromCore(-10)).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// Round-trip: scaleFromCore(scaleToCore(x)) === x for all 0-10
// ---------------------------------------------------------------------------

describe('round-trip', () => {
  for (let x = 0; x <= 10; x++) {
    it(`scaleFromCore(scaleToCore(${x})) === ${x}`, () => {
      expect(scaleFromCore(scaleToCore(x))).toBe(x)
    })
  }

  for (let c = -5; c <= 5; c++) {
    it(`scaleToCore(scaleFromCore(${c})) === ${c}`, () => {
      expect(scaleToCore(scaleFromCore(c))).toBe(c)
    })
  }
})

// ---------------------------------------------------------------------------
// configToCore  (full config 0-10 → -5/+5)
// ---------------------------------------------------------------------------

describe('configToCore', () => {
  it('converts all sliders from 0-10 to -5/+5', () => {
    const config010 = {
      sliders: {
        'bold-subtle': 0,
        'playful-serious': 5,
        'experimental-conventional': 10,
        'verbose-concise': 3,
        'warm-corporate': 7,
      } as Record<PersonalityAxis, number>,
    }

    const result = configToCore(config010)
    expect(result.sliders['bold-subtle']).toBe(5)
    expect(result.sliders['playful-serious']).toBe(0)
    expect(result.sliders['experimental-conventional']).toBe(-5)
    expect(result.sliders['verbose-concise']).toBe(2)
    expect(result.sliders['warm-corporate']).toBe(-2)
  })

  it('includes all personality axes in output', () => {
    const config010 = {
      sliders: {
        'bold-subtle': 5,
        'playful-serious': 5,
        'experimental-conventional': 5,
        'verbose-concise': 5,
        'warm-corporate': 5,
      } as Record<PersonalityAxis, number>,
    }

    const result = configToCore(config010)
    for (const axis of PERSONALITY_AXES) {
      expect(result.sliders).toHaveProperty(axis.key)
    }
  })

  it('defaults missing axis values to 5 (maps to core 0)', () => {
    // Pass an incomplete sliders object — missing axes default to 5 → core 0
    const config010 = {
      sliders: {} as Record<PersonalityAxis, number>,
    }

    const result = configToCore(config010)
    for (const axis of PERSONALITY_AXES) {
      expect(result.sliders[axis.key]).toBe(0)
    }
  })

  it('passes maxPoints through as pointBudget', () => {
    const config010 = {
      sliders: {
        'bold-subtle': 5,
        'playful-serious': 5,
        'experimental-conventional': 5,
        'verbose-concise': 5,
        'warm-corporate': 5,
      } as Record<PersonalityAxis, number>,
      maxPoints: 30,
    }

    const result = configToCore(config010)
    expect(result.pointBudget).toBe(30)
  })

  it('leaves pointBudget undefined when maxPoints not provided', () => {
    const config010 = {
      sliders: {
        'bold-subtle': 5,
        'playful-serious': 5,
        'experimental-conventional': 5,
        'verbose-concise': 5,
        'warm-corporate': 5,
      } as Record<PersonalityAxis, number>,
    }

    const result = configToCore(config010)
    expect(result.pointBudget).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// configFromCore  (full config -5/+5 → 0-10)
// ---------------------------------------------------------------------------

describe('configFromCore', () => {
  it('converts all sliders from -5/+5 to 0-10', () => {
    const config: PersonalityConfig = {
      sliders: {
        'bold-subtle': 5,
        'playful-serious': 0,
        'experimental-conventional': -5,
        'verbose-concise': 2,
        'warm-corporate': -2,
      },
    }

    const result = configFromCore(config)
    expect(result.sliders['bold-subtle']).toBe(0)
    expect(result.sliders['playful-serious']).toBe(5)
    expect(result.sliders['experimental-conventional']).toBe(10)
    expect(result.sliders['verbose-concise']).toBe(3)
    expect(result.sliders['warm-corporate']).toBe(7)
  })

  it('includes all personality axes in output', () => {
    const config: PersonalityConfig = {
      sliders: {
        'bold-subtle': 0,
        'playful-serious': 0,
        'experimental-conventional': 0,
        'verbose-concise': 0,
        'warm-corporate': 0,
      },
    }

    const result = configFromCore(config)
    for (const axis of PERSONALITY_AXES) {
      expect(result.sliders).toHaveProperty(axis.key)
    }
  })

  it('defaults missing axis values to 0 (maps to efecto 5)', () => {
    const config: PersonalityConfig = {
      sliders: {} as Record<PersonalityAxis, number>,
    }

    const result = configFromCore(config)
    for (const axis of PERSONALITY_AXES) {
      expect(result.sliders[axis.key]).toBe(5)
    }
  })

  it('returns pointBudget from config or defaults to 25', () => {
    const withBudget: PersonalityConfig = {
      sliders: {
        'bold-subtle': 0,
        'playful-serious': 0,
        'experimental-conventional': 0,
        'verbose-concise': 0,
        'warm-corporate': 0,
      },
      pointBudget: 40,
    }
    expect(configFromCore(withBudget).maxPoints).toBe(40)

    const withoutBudget: PersonalityConfig = {
      sliders: {
        'bold-subtle': 0,
        'playful-serious': 0,
        'experimental-conventional': 0,
        'verbose-concise': 0,
        'warm-corporate': 0,
      },
    }
    expect(configFromCore(withoutBudget).maxPoints).toBe(25)
  })

  it('round-trips with configToCore', () => {
    const original = {
      sliders: {
        'bold-subtle': 2,
        'playful-serious': 8,
        'experimental-conventional': 0,
        'verbose-concise': 10,
        'warm-corporate': 5,
      } as Record<PersonalityAxis, number>,
      maxPoints: 25,
    }

    const core = configToCore(original)
    const backTo010 = configFromCore(core)

    for (const axis of PERSONALITY_AXES) {
      expect(backTo010.sliders[axis.key]).toBe(original.sliders[axis.key])
    }
    expect(backTo010.maxPoints).toBe(original.maxPoints)
  })
})

// ---------------------------------------------------------------------------
// Edge cases: clamping
// ---------------------------------------------------------------------------

describe('edge cases: clamping', () => {
  it('scaleToCore clamps extreme positive input', () => {
    expect(scaleToCore(100)).toBe(-5)
  })

  it('scaleToCore clamps extreme negative input', () => {
    expect(scaleToCore(-100)).toBe(5)
  })

  it('scaleFromCore clamps extreme positive input', () => {
    expect(scaleFromCore(100)).toBe(0)
  })

  it('scaleFromCore clamps extreme negative input', () => {
    expect(scaleFromCore(-100)).toBe(10)
  })

  it('scaleToCore rounds fractional values', () => {
    // 5 - 2.7 = 2.3, rounded to 2
    expect(scaleToCore(2.7)).toBe(2)
    // 5 - 7.3 = -2.3, rounded to -2
    expect(scaleToCore(7.3)).toBe(-2)
  })

  it('scaleFromCore rounds fractional values', () => {
    // 5 - 2.7 = 2.3, rounded to 2
    expect(scaleFromCore(2.7)).toBe(2)
    // 5 - (-2.3) = 7.3, rounded to 7
    expect(scaleFromCore(-2.3)).toBe(7)
  })
})
