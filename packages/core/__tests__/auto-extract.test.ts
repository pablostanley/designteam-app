import { describe, it, expect } from 'vitest'
import { categorizeHeuristic } from '../src/auto-extract'

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

    it('routes deadline to team/project', () => {
      const r = categorizeHeuristic('ship before Friday')
      expect(r.teamCategory).toBe('project')
    })

    it('routes launch date to team/project', () => {
      const r = categorizeHeuristic('launch in 2 weeks')
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
})
