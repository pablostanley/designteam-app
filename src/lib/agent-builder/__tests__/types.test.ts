import { describe, it, expect } from 'vitest'
import {
  createDefaultPersonality,
  createDefaultAgent,
  createDefaultTeam,
} from '../types'

describe('createDefaultPersonality', () => {
  it('has all sliders at 0', () => {
    const p = createDefaultPersonality()
    for (const value of Object.values(p.sliders)) {
      expect(value).toBe(0)
    }
  })

  it('has no maxPoints field', () => {
    const p = createDefaultPersonality()
    expect(p.maxPoints).toBeUndefined()
  })

  it('has all 5 personality axes', () => {
    const p = createDefaultPersonality()
    expect(Object.keys(p.sliders)).toHaveLength(5)
    expect(p.sliders).toHaveProperty('bold-subtle')
    expect(p.sliders).toHaveProperty('playful-serious')
    expect(p.sliders).toHaveProperty('experimental-conventional')
    expect(p.sliders).toHaveProperty('verbose-concise')
    expect(p.sliders).toHaveProperty('warm-corporate')
  })
})

describe('createDefaultAgent', () => {
  it('has an id', () => {
    const a = createDefaultAgent('researcher')
    expect(a.id).toBeTruthy()
    expect(typeof a.id).toBe('string')
  })

  it('has a name based on role', () => {
    const a = createDefaultAgent('researcher')
    expect(a.name).toBe('Scout')
  })

  it('has the correct role', () => {
    const a = createDefaultAgent('copywriter')
    expect(a.role).toBe('copywriter')
  })

  it('has empty traits and customPrompt', () => {
    const a = createDefaultAgent('ux-designer')
    expect(a.traits).toEqual([])
    expect(a.customPrompt).toBe('')
  })

  it('generates unique IDs', () => {
    const a1 = createDefaultAgent('researcher')
    const a2 = createDefaultAgent('researcher')
    expect(a1.id).not.toBe(a2.id)
  })
})

describe('createDefaultTeam', () => {
  it('has an id and name', () => {
    const t = createDefaultTeam('My Team')
    expect(t.id).toBeTruthy()
    expect(t.name).toBe('My Team')
  })

  it('defaults name to "Untitled Team"', () => {
    const t = createDefaultTeam()
    expect(t.name).toBe('Untitled Team')
  })

  it('has empty agents array', () => {
    const t = createDefaultTeam()
    expect(t.agents).toEqual([])
  })

  it('has createdAt and updatedAt timestamps', () => {
    const t = createDefaultTeam()
    expect(t.createdAt).toBeTruthy()
    expect(t.updatedAt).toBeTruthy()
  })
})
