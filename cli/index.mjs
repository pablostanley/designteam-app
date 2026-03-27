#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const API_BASE = 'https://designteam.app'

// ---------------------------------------------------------------------------
// Presets (mirrors team-presets.ts for CLI use)
// ---------------------------------------------------------------------------

const PRESETS = {
  'full-studio': {
    name: 'Full Studio',
    roles: ['researcher', 'copywriter', 'graphic-designer', 'ux-designer', 'ux-writer', 'editorial-designer', 'social-media-designer', 'creative-director', 'design-engineer', 'brand-strategist', 'marketing-strategist', 'print-designer', 'motion-designer', 'accessibility-specialist', 'content-strategist', 'seo-specialist'],
  },
  'landing-page-sprint': {
    name: 'Landing Page Sprint',
    roles: ['researcher', 'copywriter', 'graphic-designer', 'ux-designer'],
  },
  'brand-campaign': {
    name: 'Brand Campaign',
    roles: ['copywriter', 'graphic-designer', 'social-media-designer', 'creative-director'],
  },
  'content-machine': {
    name: 'Content Machine',
    roles: ['copywriter', 'editorial-designer', 'social-media-designer', 'ux-writer'],
  },
  'product-team': {
    name: 'Product Team',
    roles: ['ux-designer', 'ux-writer', 'graphic-designer', 'researcher'],
  },
  'full-stack-design': {
    name: 'Full Stack Design',
    roles: ['design-engineer', 'ux-designer', 'graphic-designer', 'brand-strategist', 'content-strategist'],
  },
  'marketing-blitz': {
    name: 'Marketing Blitz',
    roles: ['marketing-strategist', 'copywriter', 'social-media-designer', 'seo-specialist', 'graphic-designer'],
  },
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === '--help' || command === '-h') {
    console.log(`
Design Team CLI

Usage:
  npx designteam install <team-id>                  Install a team's skills into your project
  npx designteam install <url>                      Install from a designteam.app URL
  npx designteam create "project description"       Create a team with AI
  npx designteam create --preset=<name>             Create from a preset
  npx designteam create --roles=role1,role2          Create with specific roles
  npx designteam list                               List available preset teams

Presets:
  full-studio, landing-page-sprint, brand-campaign, content-machine,
  product-team, full-stack-design, marketing-blitz

Examples:
  npx designteam install abc123
  npx designteam install https://designteam.app/team/abc123
  npx designteam create "a landing page for a fintech startup"
  npx designteam create --preset=landing-page-sprint
  npx designteam create --roles=researcher,copywriter,graphic-designer
`)
    return
  }

  if (command === 'create') {
    const prompt = args.filter(a => !a.startsWith('--')).slice(1).join(' ')
    const presetFlag = args.find(a => a.startsWith('--preset='))?.split('=')[1]
    const rolesFlag = args.find(a => a.startsWith('--roles='))?.split('=')[1]

    if (presetFlag) {
      await createFromPreset(presetFlag)
    } else if (rolesFlag) {
      await createFromRoles(rolesFlag.split(','))
    } else if (prompt) {
      await createWithAI(prompt)
    } else {
      console.error('Usage: npx designteam create "project description"')
      console.error('       npx designteam create --preset=landing-page-sprint')
      console.error('       npx designteam create --roles=researcher,copywriter')
      process.exit(1)
    }
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

      installTeam({ name: teamName, agents }, team.short_id || teamId)

    } catch (err) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
    return
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
    return
  }

  console.error(`Unknown command: ${command}`)
  console.error('Run "npx designteam --help" for usage.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Create commands
// ---------------------------------------------------------------------------

async function createWithAI(prompt) {
  process.stdout.write('Building your team')

  let res
  try {
    res = await fetch(`${API_BASE}/api/ai/build-team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
  } catch (err) {
    console.error(`\nError: Could not connect to ${API_BASE}`)
    process.exit(1)
  }

  if (res.status === 503) {
    console.error('\nAI team builder is not configured on the server.')
    console.error('Use --preset or --roles instead, or build at designteam.app/build')
    process.exit(1)
  }

  if (!res.ok) {
    console.error(`\nError: ${res.status}`)
    process.exit(1)
  }

  // Read the stream
  let fullText = ''
  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    fullText += decoder.decode(value, { stream: true })
    process.stdout.write('.')
  }
  console.log()

  // Parse JSON from response
  const jsonMatch = fullText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('Error: Could not parse team from AI response')
    process.exit(1)
  }

  let teamData
  try {
    teamData = JSON.parse(jsonMatch[0])
  } catch {
    console.error('Error: Invalid JSON in AI response')
    process.exit(1)
  }

  // Build proper team object
  const team = {
    id: `cli-${Date.now()}`,
    name: teamData.name || 'AI Team',
    agents: (teamData.agents || []).map((a, i) => ({
      id: `cli-agent-${Date.now()}-${i}`,
      name: a.name || `Agent ${i + 1}`,
      role: a.role || 'creative-director',
      personality: {
        sliders: {
          'bold-subtle': clamp(a.personality?.sliders?.['bold-subtle'] ?? 0),
          'playful-serious': clamp(a.personality?.sliders?.['playful-serious'] ?? 0),
          'experimental-conventional': clamp(a.personality?.sliders?.['experimental-conventional'] ?? 0),
          'verbose-concise': clamp(a.personality?.sliders?.['verbose-concise'] ?? 0),
          'warm-corporate': clamp(a.personality?.sliders?.['warm-corporate'] ?? 0),
        },
      },
      traits: Array.isArray(a.traits) ? a.traits : [],
      customPrompt: a.customPrompt || '',
      skillFile: '',
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await saveAndInstall(team)
}

async function createFromPreset(presetName) {
  const preset = PRESETS[presetName]
  if (!preset) {
    console.error(`Unknown preset: ${presetName}`)
    console.error(`Available: ${Object.keys(PRESETS).join(', ')}`)
    process.exit(1)
  }
  await createFromRoles(preset.roles, preset.name)
}

async function createFromRoles(roles, name) {
  const teamName = name || `Team (${roles.length} agents)`
  const agents = roles.map((role, i) => ({
    id: `cli-${Date.now()}-${i}`,
    name: formatRole(role),
    role,
    personality: {
      sliders: {
        'bold-subtle': 0,
        'playful-serious': 0,
        'experimental-conventional': 0,
        'verbose-concise': 0,
        'warm-corporate': 0,
      },
    },
    traits: [],
    customPrompt: '',
    skillFile: '',
  }))

  const team = {
    id: `cli-${Date.now()}`,
    name: teamName,
    agents,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await saveAndInstall(team)
}

async function saveAndInstall(team) {
  // Save to API
  let shortId = null
  try {
    const saveRes = await fetch(`${API_BASE}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: team.name, team_data: team }),
    })

    if (saveRes.ok) {
      const saveData = await saveRes.json()
      shortId = saveData.team?.short_id
    }
  } catch {
    // Save failed silently — still install locally
  }

  const id = shortId || `local-${Date.now()}`
  installTeam(team, id)

  if (shortId) {
    console.log(`Preview: ${API_BASE}/team/${shortId}`)
  }
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------

function installTeam(team, teamId) {
  const teamName = team.name || 'My Team'
  const agents = team.agents || []

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
}

// ---------------------------------------------------------------------------
// Skill file generation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRole(role) {
  return role.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function clamp(n) {
  return Math.max(-5, Math.min(5, Math.round(Number(n) || 0)))
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
