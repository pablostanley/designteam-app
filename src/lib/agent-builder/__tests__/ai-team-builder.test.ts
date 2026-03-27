import { describe, it, expect } from 'vitest'
import { generateTeamBuildPrompt, parseAITeamResponse } from '../ai-team-builder'

describe('generateTeamBuildPrompt', () => {
  it('returns a string containing role descriptions', () => {
    const prompt = generateTeamBuildPrompt('A SaaS landing page')
    expect(typeof prompt).toBe('string')
    expect(prompt).toContain('researcher')
    expect(prompt).toContain('copywriter')
    expect(prompt).toContain('A SaaS landing page')
  })

  it('includes personality axes', () => {
    const prompt = generateTeamBuildPrompt('test')
    expect(prompt).toContain('bold-subtle')
    expect(prompt).toContain('playful-serious')
  })
})

describe('parseAITeamResponse', () => {
  const validJSON = JSON.stringify({
    name: 'Test Team',
    agents: [
      {
        name: 'Scout',
        role: 'researcher',
        personality: {
          sliders: {
            'bold-subtle': -2,
            'playful-serious': 3,
            'experimental-conventional': 0,
            'verbose-concise': 1,
            'warm-corporate': -1,
          },
        },
        traits: ['methodical', 'detail-obsessed'],
        customPrompt: 'Focus on competitor analysis',
      },
    ],
  })

  it('parses valid JSON into a Team', () => {
    const team = parseAITeamResponse(validJSON)
    expect(team).not.toBeNull()
    expect(team!.name).toBe('Test Team')
    expect(team!.agents).toHaveLength(1)
    expect(team!.agents[0].name).toBe('Scout')
    expect(team!.agents[0].role).toBe('researcher')
  })

  it('returns null for invalid JSON', () => {
    expect(parseAITeamResponse('not json at all')).toBeNull()
    expect(parseAITeamResponse('{}')).toBeNull()
    expect(parseAITeamResponse('{"agents": []}')).toBeNull()
  })

  it('clamps slider values to [-5, 5]', () => {
    const extreme = JSON.stringify({
      name: 'Extreme',
      agents: [
        {
          name: 'Test',
          role: 'copywriter',
          personality: {
            sliders: {
              'bold-subtle': -10,
              'playful-serious': 99,
              'experimental-conventional': 0,
              'verbose-concise': 0,
              'warm-corporate': 0,
            },
          },
          traits: [],
          customPrompt: '',
        },
      ],
    })
    const team = parseAITeamResponse(extreme)
    expect(team).not.toBeNull()
    const sliders = team!.agents[0].personality.sliders
    expect(sliders['bold-subtle']).toBe(-5)
    expect(sliders['playful-serious']).toBe(5)
  })

  it('handles markdown-fenced JSON', () => {
    const fenced = '```json\n' + validJSON + '\n```'
    const team = parseAITeamResponse(fenced)
    expect(team).not.toBeNull()
    expect(team!.name).toBe('Test Team')
  })

  it('filters out invalid traits', () => {
    const withBadTraits = JSON.stringify({
      name: 'Team',
      agents: [
        {
          name: 'Test',
          role: 'researcher',
          personality: { sliders: {} },
          traits: ['chill', 'not-a-real-trait', 'perfectionist'],
          customPrompt: '',
        },
      ],
    })
    const team = parseAITeamResponse(withBadTraits)
    expect(team).not.toBeNull()
    expect(team!.agents[0].traits).toEqual(['chill', 'perfectionist'])
  })

  it('filters out agents with invalid roles', () => {
    const withBadRole = JSON.stringify({
      name: 'Team',
      agents: [
        { name: 'Good', role: 'researcher', personality: { sliders: {} }, traits: [], customPrompt: '' },
        { name: 'Bad', role: 'invalid-role', personality: { sliders: {} }, traits: [], customPrompt: '' },
      ],
    })
    const team = parseAITeamResponse(withBadRole)
    expect(team).not.toBeNull()
    expect(team!.agents).toHaveLength(1)
    expect(team!.agents[0].name).toBe('Good')
  })

  it('defaults team name when missing', () => {
    const noName = JSON.stringify({
      agents: [
        { name: 'Test', role: 'copywriter', personality: { sliders: {} }, traits: [], customPrompt: '' },
      ],
    })
    const team = parseAITeamResponse(noName)
    expect(team).not.toBeNull()
    expect(team!.name).toBe('AI-Built Team')
  })
})
