import { describe, it, expect } from 'vitest'
import { teamToMarkdown } from '../team-export'
import { createDefaultAgent, createDefaultTeam } from '../types'

describe('teamToMarkdown', () => {
  it('includes team name in header', () => {
    const team = createDefaultTeam('Alpha Squad')
    const md = teamToMarkdown(team)
    expect(md).toContain('# Team: Alpha Squad')
  })

  it('handles empty team gracefully', () => {
    const team = createDefaultTeam('Empty')
    const md = teamToMarkdown(team)
    expect(md).toContain('0 agents')
    expect(md).not.toContain('## Agents')
  })

  it('includes agent names and role display names', () => {
    const team = createDefaultTeam('Duo')
    team.agents = [
      createDefaultAgent('researcher'),
      createDefaultAgent('copywriter'),
    ]
    const md = teamToMarkdown(team)
    expect(md).toContain('Scout')
    expect(md).toContain('Researcher')
    expect(md).toContain('Aria')
    expect(md).toContain('Copywriter')
  })

  it('includes personality descriptions', () => {
    const team = createDefaultTeam('Styled')
    const agent = createDefaultAgent('graphic-designer')
    agent.personality.sliders['bold-subtle'] = -4
    team.agents = [agent]
    const md = teamToMarkdown(team)
    expect(md).toContain('very bold')
  })

  it('includes traits and custom prompt when present', () => {
    const team = createDefaultTeam('Custom')
    const agent = createDefaultAgent('ux-designer')
    agent.traits = ['empathetic', 'methodical']
    agent.customPrompt = 'Focus on mobile flows'
    team.agents = [agent]
    const md = teamToMarkdown(team)
    expect(md).toContain('empathetic, methodical')
    expect(md).toContain('Focus on mobile flows')
  })

  it('includes How to Use section', () => {
    const team = createDefaultTeam()
    const md = teamToMarkdown(team)
    expect(md).toContain('## How to Use')
  })
})
