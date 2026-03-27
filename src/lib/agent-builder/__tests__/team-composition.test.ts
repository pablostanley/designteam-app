import { describe, it, expect } from 'vitest'
import { validateTeam, analyzeTeamCoverage, getTeamSummary } from '../team-composition'
import { createDefaultAgent, createDefaultTeam, MAX_TEAM_SIZE } from '../types'
import type { Team } from '../types'

describe('validateTeam', () => {
  it('fails for empty team', () => {
    const team = createDefaultTeam('Empty')
    const result = validateTeam(team)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Team must have at least 1 agent.')
  })

  it('passes for a valid team', () => {
    const team = createDefaultTeam('Valid')
    team.agents = [createDefaultAgent('researcher')]
    const result = validateTeam(team)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails when exceeding MAX_TEAM_SIZE', () => {
    const team = createDefaultTeam('Big')
    for (let i = 0; i < MAX_TEAM_SIZE + 1; i++) {
      team.agents.push(createDefaultAgent('researcher'))
    }
    const result = validateTeam(team)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('cannot exceed')
  })

  it('fails for duplicate agent IDs', () => {
    const team = createDefaultTeam('Dupes')
    const a1 = createDefaultAgent('researcher')
    const a2 = createDefaultAgent('copywriter')
    a2.id = a1.id // force duplicate
    team.agents = [a1, a2]
    const result = validateTeam(team)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Duplicate agent ID')
  })
})

describe('analyzeTeamCoverage', () => {
  it('shows gaps for a single-agent team', () => {
    const team = createDefaultTeam()
    team.agents = [createDefaultAgent('researcher')]
    const result = analyzeTeamCoverage(team)
    expect(result.coveredCapabilities.length).toBeGreaterThan(0)
    expect(result.gaps.length).toBeGreaterThan(0)
  })

  it('finds synergies for complementary agents', () => {
    const team = createDefaultTeam()
    team.agents = [
      createDefaultAgent('researcher'),
      createDefaultAgent('copywriter'),
    ]
    const result = analyzeTeamCoverage(team)
    expect(result.synergies).toContain('Research-informed messaging')
  })

  it('returns no synergies for unrelated agents', () => {
    const team = createDefaultTeam()
    team.agents = [createDefaultAgent('print-designer')]
    const result = analyzeTeamCoverage(team)
    expect(result.synergies).toHaveLength(0)
  })
})

describe('getTeamSummary', () => {
  it('returns "0 agents" for empty team', () => {
    const team = createDefaultTeam()
    expect(getTeamSummary(team)).toBe('0 agents')
  })

  it('returns readable string with agent count and role names', () => {
    const team = createDefaultTeam()
    team.agents = [
      createDefaultAgent('researcher'),
      createDefaultAgent('copywriter'),
    ]
    const summary = getTeamSummary(team)
    expect(summary).toContain('2 agents')
    expect(summary).toContain('Researcher')
    expect(summary).toContain('Copywriter')
  })

  it('uses singular for 1 agent', () => {
    const team = createDefaultTeam()
    team.agents = [createDefaultAgent('ux-designer')]
    const summary = getTeamSummary(team)
    expect(summary).toMatch(/^1 agent:/)
  })
})
