import { describe, it, expect } from 'vitest'
import { categorizeHeuristic, parseExtractionJSON } from '../src/auto-extract'

describe('categorizeHeuristic', () => {
  describe('brand signals', () => {
    it('routes brand mention to team/brand', () => {
      const r = categorizeHeuristic('use warm earth-tone brand colors')
      expect(r.scope).toBe('team')
      expect(r.teamCategory).toBe('brand')
      expect(r.salience).toBeGreaterThanOrEqual(0.7)
    })

    it('routes palette mention to team/brand', () => {
      const r = categorizeHeuristic('the palette is bold and punchy')
      expect(r.teamCategory).toBe('brand')
    })

    it('routes typography to team/brand', () => {
      const r = categorizeHeuristic('go with a serif font')
      expect(r.teamCategory).toBe('brand')
    })

    it('routes "minimalist" to team/brand', () => {
      const r = categorizeHeuristic('make the style minimalist')
      expect(r.teamCategory).toBe('brand')
    })
  })

  describe('user preference signals', () => {
    it('routes user prefers X to team/user', () => {
      const r = categorizeHeuristic('user prefers asymmetric layouts')
      expect(r.scope).toBe('team')
      expect(r.teamCategory).toBe('user')
    })

    it('routes client likes X to team/user', () => {
      const r = categorizeHeuristic('client likes bold type')
      expect(r.teamCategory).toBe('user')
    })

    it('routes user hates X to team/user', () => {
      const r = categorizeHeuristic('user hates stock photography')
      expect(r.teamCategory).toBe('user')
    })
  })

  describe('decision signals', () => {
    it('routes "tried X, rejected" to team/decision', () => {
      const r = categorizeHeuristic('tried dark mode, rejected it')
      expect(r.scope).toBe('team')
      expect(r.teamCategory).toBe('decision')
    })

    it('routes "chose X" to team/decision', () => {
      const r = categorizeHeuristic('chose asymmetric layout for hero')
      expect(r.teamCategory).toBe('decision')
    })
  })

  describe('project signals', () => {
    it('routes audience to team/project', () => {
      const r = categorizeHeuristic('target audience is indie devs')
      expect(r.scope).toBe('team')
      expect(r.teamCategory).toBe('project')
    })

    it('routes deadline day to team/project', () => {
      const r = categorizeHeuristic('must be done by Friday')
      expect(r.teamCategory).toBe('project')
    })

    it('routes explicit deadline to team/project', () => {
      const r = categorizeHeuristic('deadline is tight')
      expect(r.teamCategory).toBe('project')
    })
  })

  describe('agent fallback', () => {
    it('routes agent-specific work to agent memory', () => {
      const r = categorizeHeuristic('struggled with the grid system')
      expect(r.scope).toBe('agent')
      expect(r.agentType).toBeDefined()
    })

    it('uses inferMemoryType for categorization', () => {
      const r = categorizeHeuristic('learned to use CSS grid')
      expect(r.scope).toBe('agent')
      expect(r.agentType).toBe('skill_growth')
    })

    it('defaults to design_preference for generic content', () => {
      const r = categorizeHeuristic('nice work today')
      expect(r.scope).toBe('agent')
    })
  })

  describe('salience ranges', () => {
    it('returns salience in [0, 1] for all inputs', () => {
      const inputs = [
        'brand colors',
        'user prefers X',
        'tried X, rejected',
        'audience is devs',
        'generic text',
      ]
      for (const input of inputs) {
        const r = categorizeHeuristic(input)
        expect(r.salience).toBeGreaterThanOrEqual(0)
        expect(r.salience).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('priority order', () => {
    it('brand takes priority over user when both keywords present', () => {
      // "brand" keyword hits first
      const r = categorizeHeuristic('user prefers our brand palette')
      expect(r.teamCategory).toBe('brand')
    })

    it('user takes priority over decision when both match', () => {
      // "user prefers" hits user before "chose" hits decision
      const r = categorizeHeuristic('user prefers what we chose')
      expect(r.teamCategory).toBe('user')
    })
  })

  describe('false-positive guards (tightened heuristic)', () => {
    it('"learned to ship faster" stays agent (skill_growth), not project', () => {
      const r = categorizeHeuristic('learned to ship faster')
      expect(r.scope).toBe('agent')
      expect(r.agentType).toBe('skill_growth')
    })

    it('"refactored after trying flexbox" stays agent, not project', () => {
      const r = categorizeHeuristic('refactored after trying flexbox')
      expect(r.scope).toBe('agent')
    })

    it('"minimal changes" does NOT hit brand (bare minimal removed)', () => {
      const r = categorizeHeuristic('minimal changes needed')
      expect(r.scope).toBe('agent')
    })

    it('"approved my work" stays agent, not a team decision', () => {
      const r = categorizeHeuristic('approved my work on grid')
      expect(r.scope).toBe('agent')
    })

    it('"they like minimal effort" does not route to user', () => {
      // "they" was removed from user-pref regex
      const r = categorizeHeuristic('they put in minimal effort')
      expect(r.scope).toBe('agent')
    })

    it('user-pref regex bounded — far-apart matches do not fire', () => {
      const r = categorizeHeuristic(
        'user said lots of things today and one of them was that she prefers warm tones',
      )
      // "user" and "prefers" are > 40 chars apart — should not match
      expect(r.teamCategory).not.toBe('user')
    })
  })
})

describe('parseExtractionJSON', () => {
  it('parses valid JSON with team memory', () => {
    const text = '{"memories":[{"scope":"team","content":"user likes dark","teamCategory":"user","salience":0.9}]}'
    const result = parseExtractionJSON(text)
    expect(result).toHaveLength(1)
    expect(result[0].scope).toBe('team')
    expect(result[0].teamCategory).toBe('user')
    expect(result[0].salience).toBe(0.9)
  })

  it('parses valid JSON with agent memory', () => {
    const text = '{"memories":[{"scope":"agent","content":"struggled with grid","agentType":"skill_growth","salience":0.7}]}'
    const result = parseExtractionJSON(text)
    expect(result).toHaveLength(1)
    expect(result[0].scope).toBe('agent')
    expect(result[0].agentType).toBe('skill_growth')
  })

  it('strips markdown fences', () => {
    const text = '```json\n{"memories":[{"scope":"team","content":"brand is warm","teamCategory":"brand","salience":0.8}]}\n```'
    const result = parseExtractionJSON(text)
    expect(result).toHaveLength(1)
  })

  it('caps at 3 memories', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      scope: 'agent', content: `m${i}`, agentType: 'design_preference', salience: 0.5,
    }))
    const text = JSON.stringify({ memories: many })
    const result = parseExtractionJSON(text)
    expect(result).toHaveLength(3)
  })

  it('returns [] on invalid JSON', () => {
    expect(parseExtractionJSON('not json at all')).toEqual([])
  })

  it('returns [] on missing memories key', () => {
    expect(parseExtractionJSON('{"wrong":"shape"}')).toEqual([])
  })

  it('returns [] on malformed but JSON-shaped text', () => {
    expect(parseExtractionJSON('{"memories":"not-an-array"}')).toEqual([])
  })

  it('falls back to fact category for invalid teamCategory', () => {
    const text = '{"memories":[{"scope":"team","content":"x","teamCategory":"bogus","salience":0.8}]}'
    const result = parseExtractionJSON(text)
    expect(result[0].teamCategory).toBe('fact')
  })

  it('infers agentType for invalid agentType', () => {
    const text = '{"memories":[{"scope":"agent","content":"learned grid","agentType":"bogus","salience":0.7}]}'
    const result = parseExtractionJSON(text)
    expect(result[0].agentType).toBe('skill_growth')  // inferred from "learned"
  })

  it('clamps salience to [0.1, 1]', () => {
    const text = '{"memories":[{"scope":"team","content":"x","teamCategory":"fact","salience":5}]}'
    const result = parseExtractionJSON(text)
    expect(result[0].salience).toBe(1)
  })

  it('defaults to salience 0.7 when missing or wrong type', () => {
    const text = '{"memories":[{"scope":"team","content":"x","teamCategory":"fact"}]}'
    const result = parseExtractionJSON(text)
    expect(result[0].salience).toBe(0.7)
  })

  it('drops entries without content', () => {
    const text = '{"memories":[{"scope":"team","teamCategory":"fact","salience":0.8}]}'
    const result = parseExtractionJSON(text)
    expect(result).toEqual([])
  })

  it('defaults scope to agent when unrecognized', () => {
    const text = '{"memories":[{"scope":"weird","content":"x","salience":0.5}]}'
    const result = parseExtractionJSON(text)
    expect(result[0].scope).toBe('agent')
  })
})
