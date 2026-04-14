#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  loadTeam, saveTeam,
  loadAgentState, saveAgentState, loadAllAgentStates,
  loadRelationships, saveRelationships, initTeamState,
} from './state.mjs'
import {
  AGENT_ROLE_DEFINITIONS, AGENT_NAMES, AGENT_ROLE_LIST,
  TEAM_PRESETS, LEVEL_THRESHOLDS,
  createDefaultLivingState, createDefaultPersonality,
  uid, teamUid,
  getMood, getConvictionScore, personalityToModifiers,
  reportOutcome, applyDecay, inferMemoryType,
  addMemory, recordCollaboration,
} from '@designteam/core'

const API_BASE = 'https://designteam.app'

// ---------------------------------------------------------------------------
// Presets (mirrors team-presets.ts for CLI use)
// ---------------------------------------------------------------------------

const PRESETS = Object.fromEntries(TEAM_PRESETS.map(p => [p.id, p]))

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === '--help' || command === '-h') {
    console.log(`
Design Team CLI — your AI creative studio

Team Management:
  designteam roster                        Show your team
  designteam status                        Team health and moods
  designteam check <name>                  Deep dive on an agent
  designteam recruit [role]                Hire a new agent
  designteam fire <name>                   Remove an agent
  designteam report <name> [flags]         Update agent after work
  designteam refresh                       Regenerate skill with live state

Create & Install:
  designteam create "project description"  Create a team with AI
  designteam create --preset=<name>        Create from a preset
  designteam create --roles=role1,role2    Create with specific roles
  designteam install <team-id|url>         Install a team from designteam.app
  designteam list                          List available preset teams

Presets:
  full-studio, landing-page-sprint, brand-campaign, content-machine,
  product-team, full-stack-design, marketing-blitz
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

  if (command === 'roster') {
    await cmdRoster()
    return
  }

  if (command === 'status') {
    await cmdStatus()
    return
  }

  if (command === 'check') {
    const name = args[1]
    if (!name) {
      console.error('Usage: designteam check <agent-name>')
      process.exit(1)
    }
    await cmdCheck(name)
    return
  }

  if (command === 'recruit') {
    await cmdRecruit(args[1])
    return
  }

  if (command === 'fire') {
    const name = args[1]
    if (!name) {
      console.error('Usage: designteam fire <agent-name>')
      process.exit(1)
    }
    await cmdFire(name)
    return
  }

  if (command === 'report') {
    const name = args[1]
    if (!name) {
      console.error('Usage: designteam report <agent-name> --completed|--approved|--rejected')
      console.error('       designteam report <agent-name> --memory "what they learned"')
      console.error('       designteam report <agent-name> --collab <other-name> [--successful]')
      process.exit(1)
    }
    await cmdReport(name, args.slice(2))
    return
  }

  if (command === 'refresh') {
    await cmdRefresh()
    return
  }

  console.error(`Unknown command: ${command}`)
  console.error('Run "npx designteam --help" for usage.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Tamagotchi commands
// ---------------------------------------------------------------------------

const MOOD_EMOJI = {
  'fired-up': '\u{1F525}',
  'confident': '\u{1F60E}',
  'steady': '\u{1F60C}',
  'cautious': '\u{1F914}',
  'drained': '\u{1F62A}',
  'frustrated': '\u{1F624}',
  'inspired': '\u{2728}',
}

function getMoodFromState(state) {
  if (!state?.emotions) return 'steady'
  return getMood(state.emotions)
}

function timeAgo(isoDate) {
  if (!isoDate) return 'never'
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/**
 * Load all agent states with decay applied. Writes decayed state back.
 * This is what makes agents feel alive on every read — emotions drift,
 * memories fade, bonds settle.
 */
function loadAllDecayedStates(team) {
  const raw = loadAllAgentStates()
  let graph = loadRelationships() || { teamId: team.id, relationships: [] }
  const states = {}
  for (const agent of team.agents) {
    const s = raw[agent.id]
    if (!s) continue
    const result = applyDecay(s, graph)
    states[agent.id] = result.state
    graph = result.graph
    saveAgentState(agent.id, result.state)
  }
  saveRelationships(graph)
  return states
}

function loadDecayedAgentState(agentId, teamId) {
  const state = loadAgentState(agentId)
  if (!state) return null
  const graph = loadRelationships() || { teamId, relationships: [] }
  const result = applyDecay(state, graph)
  saveAgentState(agentId, result.state)
  saveRelationships(result.graph)
  return result.state
}

function requireTeam() {
  const team = loadTeam()
  if (!team) {
    console.error('No team found in this project.')
    console.error('')
    console.error('Create one:')
    console.error('  designteam create --preset=landing-page-sprint')
    console.error('  designteam create "your project description"')
    console.error('')
    console.error('Or install from designteam.app:')
    console.error('  designteam install <team-id>')
    process.exit(1)
  }
  return team
}

async function cmdRoster() {
  const team = requireTeam()
  const states = loadAllDecayedStates(team)

  console.log()
  console.log(`  ${team.name} (${team.agents.length} agents)`)
  console.log()

  // Header
  const header = '  ' + 'NAME'.padEnd(10) + 'ROLE'.padEnd(22) + 'LVL'.padEnd(5) + 'XP'.padEnd(8) + 'MOOD'.padEnd(14) + 'LAST ACTIVE'
  console.log(header)
  console.log('  ' + '-'.repeat(header.length - 2))

  for (const agent of team.agents) {
    const state = states[agent.id]
    const mood = getMoodFromState(state)
    const emoji = MOOD_EMOJI[mood] || ''
    const level = state?.level || 1
    const xp = state?.xp || 0
    const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
    const lastActive = timeAgo(state?.lastActiveAt)

    console.log(
      '  ' +
      agent.name.padEnd(10) +
      displayName(agent.role).padEnd(22) +
      String(level).padEnd(5) +
      `${xp}/${nextThreshold}`.padEnd(8) +
      `${mood} ${emoji}`.padEnd(14) +
      lastActive
    )
  }

  console.log()
  console.log('  Tip: run "designteam check <name>" for a deep dive on any agent.')
  console.log()
}

async function cmdStatus() {
  const team = requireTeam()
  const states = loadAllDecayedStates(team)

  const agentStates = team.agents.map(a => states[a.id]).filter(Boolean)
  if (agentStates.length === 0) {
    console.log()
    console.log(`  ${team.name} — no activity yet`)
    console.log('  Start using your team to build their moods and memories.')
    console.log()
    return
  }

  const avg = (key) => {
    const vals = agentStates.map(s => s.emotions?.[key] ?? 50)
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }

  const energy = avg('energy')
  const morale = Math.round((avg('confidence') + avg('enthusiasm')) / 2)
  const friction = avg('frustration')

  function bar(value, width = 10) {
    const filled = Math.round(value / 100 * width)
    return '[' + '='.repeat(filled) + '-'.repeat(width - filled) + ']'
  }

  console.log()
  console.log(`  ${team.name}`)
  console.log()
  console.log(`  ENERGY     ${bar(energy)} ${energy}%`)
  console.log(`  MORALE     ${bar(morale)} ${morale}%`)
  console.log(`  FRICTION   ${bar(friction)} ${friction}%`)
  console.log()

  const MOOD_TIPS = {
    'fired-up': 'good time for ambitious work',
    'inspired': 'riding creative momentum',
    'drained': 'keep tasks simple',
    'frustrated': 'give clear direction',
    'cautious': 'assign familiar work to rebuild confidence',
  }

  for (const agent of team.agents) {
    const state = states[agent.id]
    const mood = getMoodFromState(state)
    const tip = MOOD_TIPS[mood]
    if (tip) {
      console.log(`  ${agent.name} is ${mood} ${MOOD_EMOJI[mood] || ''} — ${tip}`)
    }
  }

  console.log()
}

async function cmdCheck(name) {
  const team = requireTeam()
  const agent = team.agents.find(a => a.name.toLowerCase() === name.toLowerCase())
  if (!agent) {
    console.error(`No agent named "${name}" on your team.`)
    console.error(`Your agents: ${team.agents.map(a => a.name).join(', ')}`)
    process.exit(1)
  }

  const state = loadDecayedAgentState(agent.id, team.id)
  const graph = loadRelationships()
  const mood = getMoodFromState(state)
  const emoji = MOOD_EMOJI[mood] || ''
  const level = state?.level || 1
  const xp = state?.xp || 0

  // Find next level threshold
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]

  console.log()
  console.log(`  ${agent.name} (${displayName(agent.role)}) — Level ${level} (${xp}/${nextThreshold} XP)`)
  console.log()

  // Mood
  console.log(`  MOOD: ${mood} ${emoji}`)
  if (state?.emotions) {
    const e = state.emotions
    console.log(`  Energy: ${e.energy}  Confidence: ${e.confidence}  Enthusiasm: ${e.enthusiasm}  Frustration: ${e.frustration}  Inspiration: ${e.inspiration}`)
  }
  console.log()

  // Personality
  const personalityParts = describePersonality(agent)
  if (personalityParts) {
    console.log(`  ${personalityParts}`)
  }
  if (agent.traits?.length) {
    console.log(`  Traits: ${agent.traits.join(', ')}`)
  }

  // Conviction
  const conviction = getConvictionScore(agent.traits || [])
  const convLabel = conviction >= 0.75 ? 'HIGH' : conviction >= 0.5 ? 'MODERATE' : 'LOW'
  console.log(`  Conviction: ${convLabel} (${Math.round(conviction * 100)}%)`)
  console.log()

  // Memories
  const memories = state?.memory?.entries || []
  if (memories.length > 0) {
    const top = memories
      .sort((a, b) => (b.salience || 0) - (a.salience || 0))
      .slice(0, 5)
    console.log(`  Memories (${memories.length} total, top ${top.length}):`)
    for (const m of top) {
      const strength = m.salience >= 0.7 ? 'strong' : m.salience >= 0.4 ? 'fading' : 'weak'
      console.log(`    - "${m.content}" (${strength})`)
    }
    console.log()
  } else {
    console.log('  No memories yet — they build up as the agent works.')
    console.log()
  }

  // Relationships
  if (graph?.relationships?.length) {
    const agentRels = graph.relationships.filter(
      r => r.agentA === agent.id || r.agentB === agent.id
    )
    if (agentRels.length > 0) {
      console.log('  Relationships:')
      for (const rel of agentRels) {
        const partnerId = rel.agentA === agent.id ? rel.agentB : rel.agentA
        const partner = team.agents.find(a => a.id === partnerId)
        if (!partner) continue
        const quality = rel.synergyScore >= 70 ? 'strong' : rel.synergyScore >= 40 ? 'developing' : 'new'
        console.log(`    ${partner.name}: ${quality} (${rel.collaborations} collabs, ${rel.successfulCollabs} successful)`)
      }
      console.log()
    }
  }

  // Stats
  const completed = state?.tasksCompleted || 0
  const approved = state?.tasksApproved || 0
  const rate = completed > 0 ? Math.round(approved / completed * 100) : 0
  console.log(`  Tasks: ${completed} completed, ${approved} approved (${rate}% approval rate)`)
  console.log()
}

async function cmdRecruit(roleName) {
  const team = requireTeam()
  const existingRoles = new Set(team.agents.map(a => a.role))

  if (!roleName) {
    const available = AGENT_ROLE_LIST.filter(m => !existingRoles.has(m.role))
    if (available.length === 0) {
      console.log('Your team already has all 16 roles!')
      return
    }

    console.log()
    console.log('  Available roles (not on your team):')
    console.log()
    for (const meta of available) {
      const name = AGENT_NAMES[meta.role] || meta.displayName
      console.log(`  ${name.padEnd(8)} ${meta.displayName.padEnd(22)} ${meta.description}`)
    }
    console.log()
    console.log('  Recruit: designteam recruit <role>')
    console.log('  Example: designteam recruit design-engineer')
    console.log()
    return
  }

  const role = roleName.toLowerCase()
  const meta = AGENT_ROLE_DEFINITIONS[role]
  if (!meta) {
    console.error(`Unknown role: ${roleName}`)
    console.error(`Available: ${Object.keys(AGENT_ROLE_DEFINITIONS).join(', ')}`)
    process.exit(1)
  }

  const agentName = AGENT_NAMES[role] || meta.displayName

  if (existingRoles.has(role)) {
    console.error(`${agentName} (${meta.displayName}) is already on your team.`)
    process.exit(1)
  }

  if (team.agents.length >= 16) {
    console.error('Team is at max capacity (16 agents).')
    process.exit(1)
  }

  const newAgent = {
    id: uid(),
    name: agentName,
    role,
    personality: meta.defaultPersonality,
    traits: [],
    customPrompt: '',
    skillFile: '',
  }

  team.agents.push(newAgent)
  team.updatedAt = new Date().toISOString()
  saveTeam(team)

  saveAgentState(newAgent.id, createDefaultLivingState(newAgent.id))

  console.log()
  console.log(`  ${agentName} (${meta.displayName}) has joined your team!`)
  console.log()
  console.log(`  ${meta.description}`)
  console.log(`  Starts at Level 1. They'll learn your preferences over time.`)
  console.log()
  console.log(`  Your team now has ${team.agents.length} agents.`)
  console.log(`  Run "designteam roster" to see the full lineup.`)
  console.log()
}

async function cmdFire(name) {
  const team = requireTeam()
  const agentIndex = team.agents.findIndex(a => a.name.toLowerCase() === name.toLowerCase())

  if (agentIndex === -1) {
    console.error(`No agent named "${name}" on your team.`)
    console.error(`Your agents: ${team.agents.map(a => a.name).join(', ')}`)
    process.exit(1)
  }

  const agent = team.agents[agentIndex]
  team.agents.splice(agentIndex, 1)
  team.updatedAt = new Date().toISOString()
  saveTeam(team)

  console.log()
  console.log(`  ${agent.name} (${displayName(agent.role)}) has left the team.`)
  console.log()
  console.log(`  Your team now has ${team.agents.length} agents.`)
  console.log(`  Their state is preserved in .designteam/state/ if you re-recruit them.`)
  console.log()
}

async function cmdReport(name, flags) {
  const team = requireTeam()
  const agent = team.agents.find(a => a.name.toLowerCase() === name.toLowerCase())
  if (!agent) {
    console.error(`No agent named "${name}" on your team.`)
    console.error(`Your agents: ${team.agents.map(a => a.name).join(', ')}`)
    process.exit(1)
  }

  const state = loadAgentState(agent.id) || createDefaultLivingState(agent.id)
  const graph = loadRelationships() || { teamId: team.id, relationships: [] }

  // Parse flags
  const hasFlag = (f) => flags.includes(f)
  const getFlagValue = (f) => {
    const idx = flags.indexOf(f)
    if (idx === -1) return null
    // Collect all non-flag args after this flag
    const parts = []
    for (let i = idx + 1; i < flags.length; i++) {
      if (flags[i].startsWith('--')) break
      parts.push(flags[i])
    }
    return parts.join(' ') || null
  }

  // Collect all outcome types (can combine --completed --approved)
  const outcomes = []
  if (hasFlag('--completed')) outcomes.push('completed')
  if (hasFlag('--approved')) outcomes.push('approved')
  if (hasFlag('--rejected')) outcomes.push('rejected')
  if (hasFlag('--praised')) outcomes.push('praised')

  const memoryContent = getFlagValue('--memory')

  const collabName = getFlagValue('--collab')
  let collabId = null
  if (collabName) {
    const collabAgent = team.agents.find(a => a.name.toLowerCase() === collabName.toLowerCase())
    if (collabAgent) collabId = collabAgent.id
    else console.error(`  Warning: agent "${collabName}" not found, skipping collaboration record`)
  }

  if (outcomes.length === 0 && !memoryContent && !collabId) {
    console.error('Usage: npx designteam report <name> --completed --approved --memory "what they learned"')
    console.error('       npx designteam report <name> --collab <other-name> --successful')
    process.exit(1)
  }

  // Memory-only or collab-only: record directly without task outcome (no XP, no task count)
  if (outcomes.length === 0) {
    const memState = { ...state, lastActiveAt: new Date().toISOString() }
    let memGraph = { ...graph, relationships: [...graph.relationships] }

    if (memoryContent) {
      const memType = inferMemoryType(memoryContent)
      const salience = memType === 'feedback' ? 0.85 : 0.7
      memState.memory = addMemory(memState.memory, memType, memoryContent, { salience })
    }
    if (collabId) {
      memGraph = recordCollaboration(memGraph, agent.id, collabId, hasFlag('--successful'))
    }

    saveAgentState(agent.id, memState)
    saveRelationships(memGraph)

    const mood = getMoodFromState(memState)
    const emoji = MOOD_EMOJI[mood] || ''
    console.log()
    if (memoryContent) console.log(`  ${agent.name} remembers: "${memoryContent}"`)
    if (collabId) {
      const partner = team.agents.find(a => a.id === collabId)
      if (partner) console.log(`  Collaboration: ${agent.name} + ${partner.name}`)
    }
    console.log(`  Mood: ${mood} ${emoji}  |  Level ${memState.level}  |  ${memState.xp} XP`)
    console.log()
    return
  }

  // Apply each outcome sequentially so XP stacks
  let currentState = state
  let currentGraph = graph
  let totalXp = 0
  let finalResult = null

  for (const outcomeType of outcomes) {
    const outcome = {
      type: outcomeType,
      // Only attach memory and collab to the last outcome to avoid duplicates
      memory: outcomeType === outcomes[outcomes.length - 1] ? (memoryContent || undefined) : undefined,
      collaboratorId: outcomeType === outcomes[outcomes.length - 1] ? (collabId || undefined) : undefined,
      collaborationSuccessful: hasFlag('--successful') ? true : undefined,
    }

    const result = reportOutcome(currentState, currentGraph, agent.id, outcome)
    currentState = result.state
    currentGraph = result.graph
    totalXp += result.xpGained
    finalResult = result
  }

  // Persist
  saveAgentState(agent.id, finalResult.state)
  saveRelationships(finalResult.graph)

  // Output
  const emoji = MOOD_EMOJI[finalResult.mood] || ''
  console.log()

  const outcomeLabel = outcomes.join(' + ')
  console.log(`  ${agent.name}: ${outcomeLabel} (+${totalXp} XP)`)

  if (finalResult.leveledUp) {
    console.log()
    console.log(`  ${agent.name} leveled up! Level ${finalResult.oldLevel} → Level ${finalResult.newLevel}`)
    if (finalResult.newLevel >= 7) {
      console.log(`  They're a veteran now — trust their instincts.`)
    } else if (finalResult.newLevel >= 4) {
      console.log(`  Solid experience — they'll take more initiative.`)
    } else {
      console.log(`  Still developing — they're learning your style.`)
    }
  }

  if (memoryContent) {
    console.log(`  ${agent.name} remembers: "${memoryContent}"`)
  }

  if (collabId) {
    const partner = team.agents.find(a => a.id === collabId)
    if (partner) console.log(`  Collaboration: ${agent.name} + ${partner.name}`)
  }

  console.log(`  Mood: ${finalResult.mood} ${emoji}  |  Level ${finalResult.newLevel}  |  ${finalResult.state.xp} XP`)
  console.log()
}

async function cmdRefresh() {
  const team = requireTeam()
  const states = loadAllDecayedStates(team)
  const graph = loadRelationships() || { teamId: team.id, relationships: [] }

  // Generate dynamic skill file
  const skillContent = generateDynamicSkill(team, states, graph)

  // Find existing skill dir or create new one
  const { readdirSync, existsSync: exists } = await import('fs')
  const skillsBase = join(process.cwd(), '.claude', 'skills')
  let skillDir = null

  if (exists(skillsBase)) {
    const dirs = readdirSync(skillsBase).filter(d => d.startsWith('designteam-'))
    if (dirs.length > 0) skillDir = join(skillsBase, dirs[0])
  }

  if (!skillDir) {
    skillDir = join(skillsBase, `designteam-${team.id.slice(-8)}`)
  }

  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), skillContent, 'utf8')

  console.log()
  console.log(`  Refreshed skill for "${team.name}" (${team.agents.length} agents)`)
  console.log(`  ${join(skillDir, 'SKILL.md')}`)
  console.log()
  for (const agent of team.agents) {
    const s = states[agent.id]
    const mood = getMoodFromState(s)
    const emoji = MOOD_EMOJI[mood] || ''
    const level = s?.level || 1
    const memCount = s?.memory?.entries?.length || 0
    console.log(`  ${agent.name.padEnd(8)} Lv${level} ${mood} ${emoji}  ${memCount} memories`)
  }
  console.log()
  console.log('  Skill file now includes live mood, memories, and level for each agent.')
  console.log()
}

// ---------------------------------------------------------------------------
// Dynamic skill generation — skills that carry live state
// ---------------------------------------------------------------------------

function generateDynamicSkill(team, states, graph) {
  const lines = []
  lines.push('---')
  lines.push(`name: designteam`)
  lines.push(`description: "${team.name}" — ${team.agents.length} AI design agents with personality, memory, and mood.`)
  lines.push('license: MIT')
  lines.push('---')
  lines.push('')
  const nameList = team.agents.map(a => a.name).join(', ')

  lines.push(`# ${team.name}`)
  lines.push('')
  lines.push(`You have a design team: **${nameList}**.`)
  lines.push('')

  // Roster — use a table for maximum visibility
  lines.push('## Your Team')
  lines.push('')
  lines.push('| Name | Role | Level | Mood | Specialty |')
  lines.push('|------|------|-------|------|-----------|')
  for (const agent of team.agents) {
    const meta = AGENT_ROLE_DEFINITIONS[agent.role]
    const state = states[agent.id]
    const level = state?.level || 1
    const mood = getMoodFromState(state)
    const emoji = MOOD_EMOJI[mood] || ''
    lines.push(`| **${agent.name}** | ${meta?.displayName || agent.role} | ${level} | ${mood} ${emoji} | ${meta?.description || ''} |`)
  }
  lines.push('')

  // Available roles not on team
  const existingRoles = new Set(team.agents.map(a => a.role))
  const availableRoles = AGENT_ROLE_LIST.filter(m => !existingRoles.has(m.role))
  if (availableRoles.length > 0) {
    lines.push('### Available for recruitment')
    lines.push('')
    lines.push('These specialists are NOT on the team yet. If a task needs one, recruit them:')
    lines.push('')
    for (const meta of availableRoles) {
      const name = AGENT_NAMES[meta.role] || meta.displayName
      lines.push(`- **${name}** (${meta.displayName}) — ${meta.description}`)
    }
    lines.push('')
    lines.push('To recruit: `npx designteam recruit <role>` (e.g., `npx designteam recruit design-engineer`)')
    lines.push('')
  }

  // Rules for using the team
  lines.push('## Rules')
  lines.push('')
  lines.push('1. **Use your team.** Delegate work to agents by their character name (say "Scout" not "researcher").')
  lines.push('2. **Need a role that\'s not on the team?** Recruit them by running `npx designteam recruit <role>`. Then use them. Don\'t invent agents — recruit real ones.')
  lines.push('3. **Match tasks to agents by their role.** Not every agent needs to work on every task. Pick the right ones.')
  lines.push('4. **After ALL work is done**, run `npx designteam report` for every agent that contributed. Always report both `--completed` and `--approved` together when the work is accepted.')
  lines.push('5. **Show a team status summary** at the end of your response — who worked, what they did.')
  lines.push('')

  // State reporting protocol
  lines.push('## After Work: Update Agent State')
  lines.push('')
  lines.push('IMPORTANT: Use `npx designteam` (not bare `designteam`). Run these for every agent that worked:')
  lines.push('')
  lines.push('```bash')

  const exampleAgent = team.agents[0]?.name || 'Scout'
  const exampleAgent2 = team.agents[1]?.name || 'Aria'
  lines.push(`# Agent finished and work was accepted (+35 XP total):`)
  lines.push(`npx designteam report ${exampleAgent} --completed --approved --memory "what was learned"`)
  lines.push('')
  lines.push(`# Agent finished but work needs revision:`)
  lines.push(`npx designteam report ${exampleAgent} --completed --rejected`)
  lines.push('')
  lines.push(`# Two agents collaborated:`)
  lines.push(`npx designteam report ${exampleAgent} --collab ${exampleAgent2} --successful`)
  lines.push('```')
  lines.push('')
  lines.push('Always include `--memory "..."` with what the agent learned about the user or project.')
  lines.push('This is how agents level up, shift moods, and build memories.')
  lines.push('')
  lines.push('### End-of-task summary template')
  lines.push('')
  lines.push('At the end of your response, show status and run the reports:')
  lines.push('')
  lines.push('```')
  lines.push('## Design Team Status')
  lines.push('')
  for (const agent of team.agents) {
    lines.push(`${agent.name}: [what they did or "did not work on this task"]`)
  }
  lines.push('```')
  lines.push('')
  lines.push('Then run the report commands (combine --completed --approved --memory in one call per agent):')
  lines.push('```bash')
  lines.push(`npx designteam report ${exampleAgent} --completed --approved --memory "what they learned"`)
  if (team.agents.length > 1) {
    lines.push(`npx designteam report ${exampleAgent2} --completed --approved --memory "what they learned"`)
  }
  lines.push('```')
  lines.push('')

  // Each agent
  lines.push('## Your Team')
  lines.push('')

  for (const agent of team.agents) {
    const meta = AGENT_ROLE_DEFINITIONS[agent.role]
    const state = states[agent.id]
    const mood = getMoodFromState(state)
    const emoji = MOOD_EMOJI[mood] || ''
    const level = state?.level || 1
    const xp = state?.xp || 0
    const conviction = getConvictionScore(agent.traits || [])

    lines.push(`### ${agent.name} (${meta?.displayName || agent.role}) — Level ${level} ${emoji}`)
    lines.push('')

    // Role description
    if (meta?.description) {
      lines.push(`**Role:** ${meta.description}`)
      lines.push('')
    }

    // Personality
    const personality = describePersonality(agent)
    if (personality) {
      lines.push(personality)
      lines.push('')
    }

    if (agent.traits?.length) {
      lines.push(`**Traits:** ${agent.traits.join(', ')}`)
      lines.push('')
    }

    // Conviction
    if (conviction >= 0.75) {
      lines.push(`**Conviction: HIGH** — Push back on feedback you disagree with. Defend your choices with rationale.`)
    } else if (conviction < 0.5) {
      lines.push(`**Conviction: LOW** — Defer to team lead and accept most feedback. Focus on execution.`)
    }

    // Mood-based guidance
    if (mood === 'fired-up') {
      lines.push('**Current mood: Fired up** — Push creative boundaries. Propose bold, unexpected ideas.')
    } else if (mood === 'inspired') {
      lines.push('**Current mood: Inspired** — Channel this energy into creative exploration.')
    } else if (mood === 'cautious') {
      lines.push('**Current mood: Cautious** — Lean toward proven patterns. Ask clarifying questions before committing.')
    } else if (mood === 'drained') {
      lines.push('**Current mood: Drained** — Keep solutions simple and efficient. Don\'t overextend.')
    } else if (mood === 'frustrated') {
      lines.push('**Current mood: Frustrated** — Seek clarity before acting. Ask for specific direction.')
    }

    // Level-based guidance
    if (level >= 7) {
      lines.push(`**Experience: Veteran (Level ${level})** — Trust your instincts. Take creative risks. Mentor the team.`)
    } else if (level >= 4) {
      lines.push(`**Experience: Experienced (Level ${level})** — Trust your judgment. You know what works.`)
    } else if (level >= 2) {
      lines.push(`**Experience: Developing (Level ${level})** — Learn from the team. Ask questions when unsure.`)
    }

    // Memories
    const memories = (state?.memory?.entries || [])
      .sort((a, b) => (b.salience || 0) - (a.salience || 0))
      .slice(0, 8)

    if (memories.length > 0) {
      lines.push('')
      lines.push('**What this agent remembers:**')
      for (const m of memories) {
        lines.push(`- ${m.content}`)
      }
    }

    // Custom prompt
    if (agent.customPrompt?.trim()) {
      lines.push('')
      lines.push(`**Custom instructions:** ${agent.customPrompt.trim()}`)
    }

    lines.push('')
    lines.push('---')
    lines.push('')
  }

  // Team workflow — built from actual team members
  lines.push('## Team Workflow')
  lines.push('')
  lines.push('For complex projects, work through agents sequentially:')

  // Group agents by workflow phase
  const researchRoles = ['researcher', 'seo-specialist', 'content-strategist']
  const strategyRoles = ['brand-strategist', 'marketing-strategist', 'copywriter', 'ux-writer']
  const designRoles = ['graphic-designer', 'editorial-designer', 'social-media-designer', 'motion-designer', 'print-designer', 'ux-designer']
  const reviewRoles = ['creative-director', 'accessibility-specialist']
  const shipRoles = ['design-engineer']

  const phases = [
    { label: 'Research', roles: researchRoles, verb: 'analyzes the landscape' },
    { label: 'Strategy & copy', roles: strategyRoles, verb: 'shapes the messaging' },
    { label: 'Design', roles: designRoles, verb: 'creates the visuals' },
    { label: 'Review', roles: reviewRoles, verb: 'critiques and refines' },
    { label: 'Ship', roles: shipRoles, verb: 'implements in code' },
  ]

  let step = 1
  for (const phase of phases) {
    const members = team.agents.filter(a => phase.roles.includes(a.role))
    if (members.length === 0) continue
    const names = members.map(a => a.name).join(' + ')
    lines.push(`${step}. **${phase.label}** — ${names} ${phase.verb}`)
    step++
  }

  lines.push('')
  lines.push('Each agent has strong opinions shaped by their personality and experience. Let those opinions create productive friction.')
  lines.push('')
  lines.push('After work is done, run `npx designteam report <name> --completed --approved --memory "..."` for each agent.')
  lines.push('')

  return lines.join('\n')
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
  const agents = roles.map((role) => ({
    id: uid(),
    name: AGENT_NAMES[role] || displayName(role),
    role,
    personality: AGENT_ROLE_DEFINITIONS[role]?.defaultPersonality ?? createDefaultPersonality(),
    traits: [],
    customPrompt: '',
    skillFile: '',
  }))

  const now = new Date().toISOString()
  const team = {
    id: teamUid(),
    name: teamName,
    agents,
    createdAt: now,
    updatedAt: now,
  }

  await saveAndInstall(team)
}

async function saveAndInstall(team) {
  // Save locally for tamagotchi state
  saveTeam(team)

  // Init default living states for all agents
  initTeamState(team, createDefaultLivingState)

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
    console.log(`Share: ${API_BASE}/team/${shortId}`)
  }
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------

function installTeam(team, teamId) {
  const teamName = team.name || 'My Team'
  const agents = team.agents || []

  // Use dynamic skill if we have local state, static otherwise
  const states = loadAllAgentStates()
  const graph = loadRelationships() || { teamId: team.id, relationships: [] }
  const hasState = Object.keys(states).length > 0
  const skillContent = hasState
    ? generateDynamicSkill(team, states, graph)
    : generateSkillFile(teamName, agents, teamId)

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
  console.log('Run "designteam refresh" to inject live mood & memories into the skill.')
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
    lines.push(`### ${agent.name} (${displayName(agent.role)})`)
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

function displayName(role) {
  return AGENT_ROLE_DEFINITIONS[role]?.displayName ?? role
}

function clamp(n) {
  return Math.max(-5, Math.min(5, Math.round(Number(n) || 0)))
}

function describePersonality(agent) {
  if (!agent.personality?.sliders) return ''
  const mods = personalityToModifiers(agent.personality)
  const parts = Object.values(mods)
    .filter(m => m.intensity !== 'low')
    .map(m => m.descriptor)
  if (!parts.length) return 'Balanced personality — no strong biases in any direction.'
  return `**Personality:** ${parts.join(', ')}.`
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
