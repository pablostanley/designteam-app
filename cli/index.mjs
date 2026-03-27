#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const API_BASE = 'https://designteam.app'

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === '--help' || command === '-h') {
    console.log(`
Design Team CLI

Usage:
  npx designteam install <team-id>   Install a team's skills into your project
  npx designteam install <url>       Install from a designteam.app URL
  npx designteam list                List available preset teams

Examples:
  npx designteam install abc123
  npx designteam install https://designteam.app/team/abc123
`)
    return
  }

  if (command === 'install') {
    const input = args[1]
    if (!input) {
      console.error('Error: Please provide a team ID or URL')
      console.error('Usage: npx designteam install <team-id>')
      process.exit(1)
    }

    // Extract team ID from URL or use directly
    let teamId = input
    if (input.includes('designteam.app/team/')) {
      teamId = input.split('/team/').pop().split('?')[0].split('#')[0]
    }
    if (input.includes('/api/teams/')) {
      teamId = input.split('/api/teams/').pop().split('?')[0].split('#')[0]
    }

    console.log(`Fetching team ${teamId}...`)

    try {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}`)
      if (!res.ok) {
        if (res.status === 404) {
          console.error(`Error: Team "${teamId}" not found`)
        } else {
          console.error(`Error: Failed to fetch team (${res.status})`)
        }
        process.exit(1)
      }

      const data = await res.json()
      const team = data.team

      if (!team || !team.team_data) {
        console.error('Error: Invalid team data')
        process.exit(1)
      }

      const teamData = team.team_data
      const teamName = teamData.name || team.name || 'My Team'
      const agents = teamData.agents || []

      if (agents.length === 0) {
        console.error('Error: Team has no agents')
        process.exit(1)
      }

      // Generate the SKILL.md content
      const skillContent = generateSkillFile(teamName, agents, teamId)

      // Determine install directory
      const skillDir = join(process.cwd(), '.claude', 'skills', `designteam-${teamId}`)
      mkdirSync(skillDir, { recursive: true })

      // Write the skill file
      const skillPath = join(skillDir, 'SKILL.md')
      writeFileSync(skillPath, skillContent, 'utf8')

      console.log()
      console.log(`Installed "${teamName}" (${agents.length} agents)`)
      console.log()
      console.log(`  ${skillPath}`)
      console.log()
      console.log(`Agents:`)
      for (const agent of agents) {
        const traits = agent.traits?.length ? ` [${agent.traits.join(', ')}]` : ''
        console.log(`  - ${agent.name} (${agent.role})${traits}`)
      }
      console.log()
      console.log('Your AI agent will now use this team configuration.')
      console.log(`View/edit: ${API_BASE}/team/${teamId}`)

    } catch (err) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  }

  if (command === 'list') {
    console.log(`Fetching public teams...`)
    try {
      const res = await fetch(`${API_BASE}/api/teams`)
      const data = await res.json()
      const teams = data.teams || []

      if (teams.length === 0) {
        console.log('No public teams found.')
        console.log(`Create one at ${API_BASE}/build`)
        return
      }

      console.log()
      console.log('Public teams:')
      console.log()
      for (const t of teams) {
        console.log(`  ${t.short_id}  ${t.name} (${t.agent_count} agents)`)
      }
      console.log()
      console.log('Install: npx designteam install <id>')
    } catch (err) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  }
}

function generateSkillFile(teamName, agents, teamId) {
  const lines = []
  lines.push('---')
  lines.push(`name: designteam-${teamId}`)
  lines.push(`description: "${teamName}" — a custom design team with ${agents.length} agents, each with unique personality and expertise.`)
  lines.push('license: MIT')
  lines.push('metadata:')
  lines.push('  author: designteam.app')
  lines.push('  version: "1.0.0"')
  lines.push('---')
  lines.push('')
  lines.push(`# ${teamName}`)
  lines.push('')
  lines.push(`A design team with ${agents.length} specialized agents. Each has a distinct personality that shapes how they work.`)
  lines.push('')
  lines.push('## Your Team')
  lines.push('')

  for (const agent of agents) {
    lines.push(`### ${agent.name} (${formatRole(agent.role)})`)
    lines.push('')

    // Personality description
    const personality = describePersonality(agent)
    if (personality) {
      lines.push(personality)
      lines.push('')
    }

    // Traits
    if (agent.traits?.length) {
      lines.push(`**Traits:** ${agent.traits.join(', ')}`)
      lines.push('')
    }

    // Custom prompt
    if (agent.customPrompt?.trim()) {
      lines.push(`**Instructions:** ${agent.customPrompt.trim()}`)
      lines.push('')
    }

    lines.push('---')
    lines.push('')
  }

  lines.push('## How to Use This Team')
  lines.push('')
  lines.push('When working on a design task, adopt the personality and expertise of the most relevant agent.')
  lines.push('For complex projects, work through agents sequentially:')
  lines.push('')
  lines.push('1. Research and strategy first')
  lines.push('2. Copy and messaging second')
  lines.push('3. Visual design and layout third')
  lines.push('4. Implementation and review last')
  lines.push('')
  lines.push('Each agent has strong opinions. Let those opinions create productive friction.')
  lines.push('')
  lines.push(`View and edit this team: ${API_BASE}/team/${teamId}`)
  lines.push('')

  return lines.join('\n')
}

function formatRole(role) {
  return role.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function describePersonality(agent) {
  if (!agent.personality?.sliders) return ''

  const AXES = [
    { key: 'bold-subtle', left: 'bold', right: 'subtle' },
    { key: 'playful-serious', left: 'playful', right: 'serious' },
    { key: 'experimental-conventional', left: 'experimental', right: 'conventional' },
    { key: 'verbose-concise', left: 'verbose', right: 'concise' },
    { key: 'warm-corporate', left: 'warm', right: 'corporate' },
  ]

  const parts = []
  for (const axis of AXES) {
    const val = agent.personality.sliders[axis.key] ?? 0
    if (val === 0) continue
    const intensity = Math.abs(val) >= 3 ? 'very' : 'somewhat'
    const direction = val < 0 ? axis.left : axis.right
    parts.push(`${intensity} ${direction}`)
  }

  if (parts.length === 0) return 'Balanced personality — no strong biases in any direction.'
  return `**Personality:** ${parts.join(', ')}.`
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
