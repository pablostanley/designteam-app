#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  loadTeam, saveTeam,
  loadAgentState, saveAgentState, loadAllAgentStates,
  loadRelationships, saveRelationships, initTeamState,
  loadTeamMemory, saveTeamMemory,
  loadUserProfile, saveUserProfile,
} from './state.mjs'
import {
  loadPlan, savePlan, listPlans,
  setTaskStatus, normalizeStatus,
  checkoutTask, releaseTask,
  getBlockers, nextReadyTask,
  TASK_STATUSES, TASK_STATUS_GLYPH,
} from './plans.mjs'
import { emitActivity, readActivity } from './activity.mjs'
import { loadBudget, setLimit, resetPeriod, getBudgetStatus } from './budget.mjs'
import { listPendingApprovals } from './approvals.mjs'
import { findStrandedTasks, recoverTask } from './recovery.mjs'
import {
  AGENT_ROLE_DEFINITIONS, AGENT_NAMES, AGENT_ROLE_LIST,
  TEAM_PRESETS, LEVEL_THRESHOLDS,
  createDefaultLivingState, createDefaultPersonality,
  uid, teamUid,
  getMood, getConvictionScore, personalityToModifiers,
  reportOutcome, applyDecay, inferMemoryType,
  addMemory, recordCollaboration,
  createEmptyTeamMemory, addTeamMemory, searchTeamMemories, getTopTeamMemories,
  teamMemoryToPromptFragment,
  createEmptyUserProfile, updateUserProfile, userProfileToPromptFragment,
  extractMemoriesWithAI, categorizeHeuristic,
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

Memory:
  designteam remember <category> "content" Add team memory (brand/project/user/decision/fact)
  designteam recall [query]                Search team memory
  designteam memory                        Show all team memory
  designteam profile [get|set key val]     View or edit user profile

Cloud Sync:
  designteam sync                          Push local state to cloud
  designteam pull                          Pull cloud state to local

Planning (v0.11):
  designteam plan "<description>"          Generate a task graph with Haiku
  designteam plans                         List all saved plans
  designteam show <plan-id>                View a plan's tasks + status
  designteam progress <plan-id> <task-id> [flags]
                                           Advance a task's lifecycle.
                                           Flags: --start --review --done
                                                  --blocked --cancel --todo
                                                  --status=<status>
                                           Finishing a task auto-unblocks
                                           dependents.
  designteam checkout <plan-id> <task-id> [--run=<id>] [--force]
                                           Atomically claim a task for a
                                           run. Moves it to in_progress.
                                           Fails if held by a different run.
  designteam release <plan-id> <task-id> [--run=<id>] [--force]
                                           Release a claim you hold.
  designteam activity [--tail=N]           Show the last N activity events
                                           (default 25). Tails
                                           .designteam/activity.jsonl.
  designteam next <plan-id> [--id-only]    Print the next ready task in the
                                           plan (todo status, no live
                                           checkout, all blockers
                                           terminal). --id-only prints
                                           just the task ID, so it's
                                           shell-scriptable.
  designteam run <plan-id> <task-id> (--adapter=<id> | --command="<shell>")
                                           Execute one task end-to-end:
                                           atomic checkout → adapter →
                                           status transition → activity
                                           log.
                                           --adapter: resolve a registered
                                             adapter by id. Built-in:
                                             @designteam/adapter-claude-cli.
                                           --command: ephemeral local-script
                                             adapter (shell-out per task).
                                           Optional: --run=<id>
                                           --timeout-ms=<n>
                                           --dry-run (preview without
                                             dispatch, no state mutation).
  designteam budget [show|set|reset] [--usd=N]
                                           Manage the monthly spend cap.
                                           set --usd=5  → cap at \$5.
                                           show (default)  → spent vs cap.
                                           reset  → wipe period, start new.
  designteam approvals                     List every task currently in
                                           in_review across all plans
                                           (oldest first).
  designteam approve <plan-id> <task-id> [--comment="..."]
                                           Approve a task: in_review → done,
                                           auto-unblock dependents, log the
                                           reviewer's comment.
  designteam reject <plan-id> <task-id> [--reason="..."] [--block]
                                           Reject a task: in_review → todo
                                           (default, for re-work) or
                                           --block → blocked (external).
  designteam recover <plan-id> [--stale-minutes=N] [--dry-run]
                                           Find in_progress tasks whose
                                           last update is older than N
                                           minutes (default 30) and reset
                                           them to todo. Use --dry-run
                                           to preview without writing.
  designteam adapters                      List every adapter the CLI can
                                           resolve via --adapter=<id>.
                                           Shows built-ins + whatever
                                           third-party adapters have
                                           self-registered.

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

  if (command === 'remember') {
    const category = args[1]
    const content = args.slice(2).join(' ')
    if (!category || !content) {
      console.error('Usage: designteam remember <brand|project|user|decision|fact> "content"')
      process.exit(1)
    }
    await cmdRemember(category, content)
    return
  }

  if (command === 'recall') {
    const query = args.slice(1).join(' ')
    await cmdRecall(query)
    return
  }

  if (command === 'memory') {
    await cmdMemory()
    return
  }

  if (command === 'profile') {
    await cmdProfile(args.slice(1))
    return
  }

  if (command === 'sync') {
    await cmdSync()
    return
  }

  if (command === 'pull') {
    await cmdPull()
    return
  }

  if (command === 'plan') {
    const description = args.slice(1).join(' ')
    if (!description) {
      console.error('Usage: npx designteam plan "design a landing page for a coffee app"')
      process.exit(1)
    }
    await cmdPlan(description)
    return
  }

  if (command === 'plans') {
    await cmdPlans()
    return
  }

  if (command === 'show') {
    const planId = args[1]
    if (!planId) {
      console.error('Usage: npx designteam show <plan-id>')
      process.exit(1)
    }
    await cmdShow(planId)
    return
  }

  if (command === 'progress') {
    const planId = args[1]
    const taskId = args[2]
    if (!planId || !taskId) {
      console.error('Usage: npx designteam progress <plan-id> <task-id> --done|--start|--review|--blocked|--cancel|--todo')
      process.exit(1)
    }
    await cmdProgress(planId, taskId, args.slice(3))
    return
  }

  if (command === 'checkout') {
    const planId = args[1]
    const taskId = args[2]
    if (!planId || !taskId) {
      console.error('Usage: npx designteam checkout <plan-id> <task-id> [--run=<id>] [--force]')
      process.exit(1)
    }
    await cmdCheckout(planId, taskId, args.slice(3))
    return
  }

  if (command === 'release') {
    const planId = args[1]
    const taskId = args[2]
    if (!planId || !taskId) {
      console.error('Usage: npx designteam release <plan-id> <task-id> [--run=<id>] [--force]')
      process.exit(1)
    }
    await cmdRelease(planId, taskId, args.slice(3))
    return
  }

  if (command === 'activity') {
    const limitFlag = args.find((a) => a.startsWith('--tail='))?.split('=')[1]
    const limit = limitFlag ? Math.max(1, parseInt(limitFlag, 10) || 50) : 25
    await cmdActivity(limit)
    return
  }

  if (command === 'next') {
    const planId = args[1]
    if (!planId) {
      console.error('Usage: npx designteam next <plan-id>')
      process.exit(1)
    }
    await cmdNext(planId, args.slice(2))
    return
  }

  if (command === 'run') {
    const planId = args[1]
    const taskId = args[2]
    if (!planId || !taskId) {
      console.error('Usage: npx designteam run <plan-id> <task-id> --command="<shell command>"')
      console.error('       Optional: --run=<id> --timeout-ms=<n>')
      process.exit(1)
    }
    await cmdRun(planId, taskId, args.slice(3))
    return
  }

  if (command === 'budget') {
    await cmdBudget(args.slice(1))
    return
  }

  if (command === 'approvals') {
    await cmdApprovals()
    return
  }

  if (command === 'approve') {
    const planId = args[1]
    const taskId = args[2]
    if (!planId || !taskId) {
      console.error('Usage: npx designteam approve <plan-id> <task-id> [--comment="..."]')
      process.exit(1)
    }
    await cmdApprove(planId, taskId, args.slice(3))
    return
  }

  if (command === 'reject') {
    const planId = args[1]
    const taskId = args[2]
    if (!planId || !taskId) {
      console.error('Usage: npx designteam reject <plan-id> <task-id> [--reason="..."] [--block]')
      process.exit(1)
    }
    await cmdReject(planId, taskId, args.slice(3))
    return
  }

  if (command === 'recover') {
    const planId = args[1]
    if (!planId) {
      console.error('Usage: npx designteam recover <plan-id> [--stale-minutes=N] [--dry-run]')
      process.exit(1)
    }
    await cmdRecover(planId, args.slice(2))
    return
  }

  if (command === 'adapters') {
    await cmdAdapters()
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

function findAgent(team, name) {
  const agent = team.agents.find(a => a.name.toLowerCase() === name.toLowerCase())
  if (!agent) {
    console.error(`No agent named "${name}" on your team.`)
    console.error(`Your agents: ${team.agents.map(a => a.name).join(', ')}`)
    process.exit(1)
  }
  return agent
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
  const agent = findAgent(team, name)

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

  emitActivity({
    action: 'team.recruit',
    teamId: team.id,
    target: { agentId: newAgent.id },
    meta: { agentName, role, teamSize: team.agents.length },
  })

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
  const agent = findAgent(team, name)
  team.agents = team.agents.filter(a => a.id !== agent.id)
  team.updatedAt = new Date().toISOString()
  saveTeam(team)

  emitActivity({
    action: 'team.fire',
    teamId: team.id,
    target: { agentId: agent.id },
    meta: { agentName: agent.name, role: agent.role, teamSize: team.agents.length },
  })

  console.log()
  console.log(`  ${agent.name} (${displayName(agent.role)}) has left the team.`)
  console.log()
  console.log(`  Your team now has ${team.agents.length} agents.`)
  console.log(`  Their state is preserved in .designteam/state/ if you re-recruit them.`)
  console.log()
}

/**
 * Route a memory into agent-scope or team-scope buckets.
 * Uses AI extraction when ANTHROPIC_API_KEY is set, heuristic otherwise.
 * @returns {Promise<Array>} Extracted memories (1 from heuristic, up to 3 from AI)
 */
async function routeMemoryToBucket(content, agent, { outcome } = {}) {
  let extracted = []

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      extracted = await extractMemoriesWithAI({
        agentName: agent.name,
        agentRole: agent.role,
        userInput: content,
        outcome,
      })
    } catch (err) {
      console.error(`  (AI extraction failed: ${err.message} — falling back to heuristic)`)
    }
  }

  if (extracted.length === 0) {
    extracted = [categorizeHeuristic(content)]
  }

  return extracted
}

/** Apply a list of extracted memories to agent state and team memory */
function applyExtractedMemories(extracted, agent, agentState, teamMemory) {
  let newAgentState = agentState
  let newTeamMemory = teamMemory
  const applied = []

  for (const mem of extracted) {
    if (mem.scope === 'agent') {
      newAgentState = {
        ...newAgentState,
        memory: addMemory(newAgentState.memory, mem.agentType || 'design_preference', mem.content, { salience: mem.salience }),
      }
      applied.push({ scope: 'agent', content: mem.content, type: mem.agentType })
    } else {
      newTeamMemory = addTeamMemory(newTeamMemory, mem.teamCategory || 'fact', mem.content, {
        salience: mem.salience,
        source: agent.name,
      })
      applied.push({ scope: 'team', content: mem.content, category: mem.teamCategory })
    }
  }

  return { agentState: newAgentState, teamMemory: newTeamMemory, applied }
}

async function cmdReport(name, flags) {
  const team = requireTeam()
  const agent = findAgent(team, name)

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
    let memState = { ...state, lastActiveAt: new Date().toISOString() }
    let memGraph = graph
    let memApplied = []

    if (memoryContent) {
      const teamMem = loadTeamMemory() || createEmptyTeamMemory(team.id)
      const extracted = await routeMemoryToBucket(memoryContent, agent)
      const result = applyExtractedMemories(extracted, agent, memState, teamMem)
      memState = result.agentState
      saveTeamMemory(result.teamMemory)
      memApplied = result.applied
    }
    if (collabId) {
      memGraph = recordCollaboration(memGraph, agent.id, collabId, hasFlag('--successful'))
    }

    saveAgentState(agent.id, memState)
    saveRelationships(memGraph)

    emitActivity({
      action: 'agent.memory',
      teamId: team.id,
      target: { agentId: agent.id },
      meta: {
        agentName: agent.name,
        memoriesApplied: memApplied.length,
        collabId: collabId || undefined,
      },
    })

    const mood = getMoodFromState(memState)
    const emoji = MOOD_EMOJI[mood] || ''
    console.log()
    for (const m of memApplied) {
      if (m.scope === 'agent') {
        console.log(`  ${agent.name} remembers: "${m.content}"`)
      } else {
        console.log(`  Team remembers [${m.category}]: "${m.content}"`)
      }
    }
    if (collabId) {
      const partner = team.agents.find(a => a.id === collabId)
      if (partner) console.log(`  Collaboration: ${agent.name} + ${partner.name}`)
    }
    console.log(`  Mood: ${mood} ${emoji}  |  Level ${memState.level}  |  ${memState.xp} XP`)
    console.log()
    return
  }

  // Apply each outcome sequentially so XP stacks
  // Don't pass memory through reportOutcome — we route it via auto-extractor after
  let currentState = state
  let currentGraph = graph
  let totalXp = 0
  let finalResult = null

  for (const outcomeType of outcomes) {
    const outcome = {
      type: outcomeType,
      collaboratorId: outcomeType === outcomes[outcomes.length - 1] ? (collabId || undefined) : undefined,
      collaborationSuccessful: hasFlag('--successful') ? true : undefined,
    }

    const result = reportOutcome(currentState, currentGraph, agent.id, outcome)
    currentState = result.state
    currentGraph = result.graph
    totalXp += result.xpGained
    finalResult = result
  }

  // Auto-extract and route memory
  let applied = []
  if (memoryContent) {
    const teamMem = loadTeamMemory() || createEmptyTeamMemory(team.id)
    const extracted = await routeMemoryToBucket(memoryContent, agent, {
      outcome: outcomes.join(' + '),
    })
    const routed = applyExtractedMemories(extracted, agent, finalResult.state, teamMem)
    finalResult.state = routed.agentState
    saveTeamMemory(routed.teamMemory)
    applied = routed.applied
  }

  // Persist
  saveAgentState(agent.id, finalResult.state)
  saveRelationships(finalResult.graph)

  // Cloud log — one row per outcome so the timeline shows every XP event,
  // not a combined "completed + approved" lump. Fire-and-forget; if the
  // team is local-only (no remoteId) or the network is down, we skip.
  const remoteId = team.remoteId || team.short_id
  if (remoteId) {
    for (const outcomeType of outcomes) {
      void fetch(`${API_BASE}/api/teams/${remoteId}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agent.id,
          agent_name: agent.name,
          outcome: outcomeType,
          content: memoryContent || null,
        }),
      }).catch(() => { /* best-effort */ })
    }
  }

  emitActivity({
    action: 'agent.report',
    teamId: team.id,
    target: { agentId: agent.id },
    meta: {
      agentName: agent.name,
      outcomes,
      xpGained: totalXp,
      leveledUp: finalResult.leveledUp || undefined,
      newLevel: finalResult.newLevel,
      mood: finalResult.mood,
      memoriesApplied: applied.length || undefined,
      collabId: collabId || undefined,
    },
  })

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

  for (const m of applied) {
    if (m.scope === 'agent') {
      console.log(`  ${agent.name} remembers: "${m.content}"`)
    } else {
      console.log(`  Team remembers [${m.category}]: "${m.content}"`)
    }
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

  // Generate dynamic skill file
  const skillContent = generateDynamicSkill(team, states)

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

function generateDynamicSkill(team, states) {
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

  // Inject user profile (who the user is)
  const profile = loadUserProfile()
  if (profile) {
    const profileFragment = userProfileToPromptFragment(profile)
    if (profileFragment) {
      lines.push(profileFragment)
      lines.push('')
    }
  }

  // Inject team memory (shared knowledge)
  const teamMemory = loadTeamMemory()
  if (teamMemory && teamMemory.entries.length > 0) {
    const memoryFragment = teamMemoryToPromptFragment(teamMemory, 30)
    if (memoryFragment) {
      lines.push(memoryFragment)
      lines.push('')
    }
  }

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
  lines.push('### Team knowledge (shared across all agents)')
  lines.push('')
  lines.push('When you learn something the WHOLE TEAM should know (not just one agent), save it as team memory:')
  lines.push('')
  lines.push('```bash')
  lines.push('# Brand facts (colors, voice, typography):')
  lines.push('npx designteam remember brand "warm earth-tone palette, no purple"')
  lines.push('')
  lines.push('# Project context (constraints, audience):')
  lines.push('npx designteam remember project "targeting indie devs, ship in 2 weeks"')
  lines.push('')
  lines.push('# User preferences (style, taste):')
  lines.push('npx designteam remember user "prefers asymmetric layouts"')
  lines.push('')
  lines.push('# Team decisions (tried and rejected):')
  lines.push('npx designteam remember decision "tried dark mode, user rejected it"')
  lines.push('```')
  lines.push('')
  lines.push('Use agent memory (`report --memory`) for what THAT AGENT learned.')
  lines.push('Use team memory (`remember`) for what THE WHOLE TEAM should know.')
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
  lines.push('## Agent Profiles')
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
// Memory commands — team memory and user profile
// ---------------------------------------------------------------------------

const VALID_MEMORY_CATEGORIES = ['brand', 'project', 'user', 'decision', 'fact']

async function cmdRemember(category, content) {
  const team = requireTeam()
  const cat = category.toLowerCase()

  if (!VALID_MEMORY_CATEGORIES.includes(cat)) {
    console.error(`Invalid category: ${category}`)
    console.error(`Valid: ${VALID_MEMORY_CATEGORIES.join(', ')}`)
    process.exit(1)
  }

  const memory = loadTeamMemory() || createEmptyTeamMemory(team.id)
  const updated = addTeamMemory(memory, cat, content, { source: 'user', salience: 0.8 })
  saveTeamMemory(updated)

  emitActivity({
    action: 'memory.add',
    teamId: team.id,
    target: {},
    meta: { category: cat, entries: updated.entries.length, source: 'user' },
  })

  console.log()
  console.log(`  Team remembers [${cat}]: "${content}"`)
  console.log(`  Total team memories: ${updated.entries.length}`)
  console.log()
}

async function cmdRecall(query) {
  requireTeam()
  const memory = loadTeamMemory()

  if (!memory || memory.entries.length === 0) {
    console.log()
    console.log('  No team memories yet.')
    console.log('  Add one: designteam remember <category> "content"')
    console.log()
    return
  }

  const results = query
    ? searchTeamMemories(memory, query, 10)
    : getTopTeamMemories(memory, 10)

  console.log()
  if (query) {
    console.log(`  Matching "${query}" (${results.length} found):`)
  } else {
    console.log(`  Top ${results.length} team memories:`)
  }
  console.log()

  if (results.length === 0) {
    console.log(`  No matches.`)
  } else {
    for (const entry of results) {
      const tag = `[${entry.category}]`.padEnd(11)
      const source = entry.source ? ` (${entry.source})` : ''
      console.log(`  ${tag} ${entry.content}${source}`)
    }
  }
  console.log()
}

async function cmdMemory() {
  const team = requireTeam()
  const memory = loadTeamMemory()

  console.log()
  console.log(`  ${team.name} — Team Memory`)
  console.log()

  if (!memory || memory.entries.length === 0) {
    console.log('  No team memories yet.')
    console.log()
    console.log('  Add brand facts, project context, user preferences:')
    console.log('    designteam remember brand "warm earth-tone palette"')
    console.log('    designteam remember user "prefers minimal layouts"')
    console.log('    designteam remember decision "tried dark mode, user rejected it"')
    console.log()
    return
  }

  const grouped = {}
  for (const cat of VALID_MEMORY_CATEGORIES) grouped[cat] = []
  for (const entry of memory.entries) {
    (grouped[entry.category] || grouped.fact).push(entry)
  }

  const labels = {
    brand: 'Brand',
    project: 'Project',
    user: 'About the user',
    decision: 'Decisions',
    fact: 'Facts',
  }

  for (const cat of VALID_MEMORY_CATEGORIES) {
    const entries = grouped[cat]
    if (entries.length === 0) continue
    entries.sort((a, b) => b.salience - a.salience)
    console.log(`  ${labels[cat]}:`)
    for (const e of entries) {
      const strength = e.salience >= 0.7 ? 'strong' : e.salience >= 0.4 ? 'fading' : 'weak'
      console.log(`    - ${e.content} (${strength})`)
    }
    console.log()
  }

  console.log(`  Total: ${memory.entries.length} memories`)
  console.log()
}

async function cmdProfile(args) {
  const sub = args[0]
  const profile = loadUserProfile() || createEmptyUserProfile()

  // Show profile
  if (!sub || sub === 'get') {
    console.log()
    console.log('  Your Profile')
    console.log()
    const keys = Object.keys(profile).filter(k => k !== 'updatedAt')
    if (keys.length === 0) {
      console.log('  Empty — tell your team about you:')
      console.log('    designteam profile set business "Acme Co"')
      console.log('    designteam profile set industry "B2B SaaS for developers"')
      console.log('    designteam profile set audience "indie devs and startups"')
      console.log('    designteam profile set voice "direct, punchy, no fluff"')
      console.log()
      return
    }
    for (const key of keys) {
      const val = profile[key]
      if (Array.isArray(val)) {
        console.log(`  ${key}: ${val.join(', ')}`)
      } else if (val) {
        console.log(`  ${key}: ${val}`)
      }
    }
    console.log()
    return
  }

  // Set profile field
  if (sub === 'set') {
    const key = args[1]
    const value = args.slice(2).join(' ')
    if (!key || !value) {
      console.error('Usage: designteam profile set <key> "value"')
      console.error('Keys: name, business, businessDescription, industry, audience, goals, voice, style, brandColors, notes')
      process.exit(1)
    }
    // Arrays: goals, brandColors — comma-separated
    const arrayKeys = ['goals', 'brandColors']
    const parsedValue = arrayKeys.includes(key)
      ? value.split(',').map(s => s.trim()).filter(Boolean)
      : value
    const updated = updateUserProfile(profile, { [key]: parsedValue })
    saveUserProfile(updated)
    emitActivity({
      action: 'profile.update',
      teamId: loadTeam()?.id ?? null,
      target: {},
      meta: { key },
    })
    console.log()
    console.log(`  Profile updated: ${key} = ${Array.isArray(parsedValue) ? parsedValue.join(', ') : parsedValue}`)
    console.log()
    return
  }

  // Clear field
  if (sub === 'unset') {
    const key = args[1]
    if (!key) {
      console.error('Usage: designteam profile unset <key>')
      process.exit(1)
    }
    const updated = { ...profile }
    delete updated[key]
    updated.updatedAt = new Date().toISOString()
    saveUserProfile(updated)
    console.log()
    console.log(`  Profile cleared: ${key}`)
    console.log()
    return
  }

  console.error('Usage: designteam profile [get|set|unset]')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Cloud sync commands
// ---------------------------------------------------------------------------

async function cmdSync() {
  const team = requireTeam()
  const states = loadAllAgentStates()
  const graph = loadRelationships() || { teamId: team.id, relationships: [] }

  // Find the remote team ID (from the saved team or from Supabase short_id)
  const remoteId = team.remoteId || team.short_id || team.id
  if (!remoteId) {
    console.error('No remote team ID found. Create the team first with "designteam create".')
    process.exit(1)
  }

  console.log()
  console.log(`  Syncing ${team.name} to cloud...`)

  // Build state payload
  const agentPayload = team.agents.map(agent => {
    const state = states[agent.id]
    if (!state) return null
    return {
      agent_id: agent.id,
      role: agent.role,
      emotions: state.emotions,
      memories: state.memory?.entries || [],
      xp: state.xp || 0,
      level: state.level || 1,
      tasks_completed: state.tasksCompleted || 0,
      tasks_approved: state.tasksApproved || 0,
      last_active_at: state.lastActiveAt || null,
    }
  }).filter(Boolean)

  try {
    const res = await fetch(`${API_BASE}/api/teams/${remoteId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_states: agentPayload,
        relationships: graph.relationships,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error(`  Error: ${err.error || res.status}`)
      process.exit(1)
    }

    const result = await res.json()
    emitActivity({
      action: 'cloud.sync',
      teamId: team.id,
      target: {},
      meta: {
        agentsSynced: result.agents_synced,
        relationshipsSynced: result.relationships_synced || undefined,
      },
    })
    console.log(`  Synced ${result.agents_synced} agents to cloud.`)
    if (result.relationships_synced) {
      console.log(`  Relationships synced.`)
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`)
    process.exit(1)
  }

  console.log()
}

async function cmdPull() {
  const team = requireTeam()

  const remoteId = team.remoteId || team.short_id || team.id
  if (!remoteId) {
    console.error('No remote team ID found.')
    process.exit(1)
  }

  console.log()
  console.log(`  Pulling state for ${team.name} from cloud...`)

  try {
    const res = await fetch(`${API_BASE}/api/teams/${remoteId}/state`)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error(`  Error: ${err.error || res.status}`)
      process.exit(1)
    }

    const data = await res.json()
    const remoteStates = data.agent_states || []
    const remoteRels = data.relationships || []

    let updated = 0

    for (const remote of remoteStates) {
      // Find matching local agent
      const agent = team.agents.find(a => a.id === remote.agent_id)
      if (!agent) continue

      const local = loadAgentState(agent.id)
      const localUpdated = local?.lastActiveAt ? new Date(local.lastActiveAt).getTime() : 0
      const remoteUpdated = remote.last_active_at ? new Date(remote.last_active_at).getTime() : 0

      // Latest wins
      if (remoteUpdated > localUpdated) {
        saveAgentState(agent.id, {
          emotions: remote.emotions || { energy: 80, confidence: 60, enthusiasm: 70, frustration: 10, inspiration: 50 },
          memory: { agentId: agent.id, entries: remote.memories || [], maxEntries: 100 },
          mailbox: local?.mailbox || { agentId: agent.id, inbox: [], maxMessages: 50 },
          tasksCompleted: remote.tasks_completed || 0,
          tasksApproved: remote.tasks_approved || 0,
          xp: remote.xp || 0,
          level: remote.level || 1,
          lastActiveAt: remote.last_active_at || new Date().toISOString(),
        })
        updated++
      }
    }

    // Pull relationships if cloud is newer
    if (remoteRels.length > 0) {
      saveRelationships({ teamId: team.id, relationships: remoteRels })
    }

    console.log(`  Pulled ${updated} agent states from cloud.`)
    if (remoteRels.length > 0) {
      console.log(`  Relationships pulled.`)
    }
    if (updated === 0 && remoteRels.length === 0) {
      console.log(`  Local state is already up to date.`)
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`)
    process.exit(1)
  }

  console.log()
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

  // Save remote ID so sync/pull can find the team
  if (shortId) {
    team.short_id = shortId
    saveTeam(team)
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
  const hasState = Object.keys(states).length > 0
  const skillContent = hasState
    ? generateDynamicSkill(team, states)
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

// ---------------------------------------------------------------------------
// Plans — Haiku-generated task graphs (v0.11 Phase 1)
// ---------------------------------------------------------------------------

async function cmdPlan(description) {
  const team = requireTeam()
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set.')
    console.error('Planning calls Haiku to generate a task graph — get a key at https://console.anthropic.com')
    process.exit(1)
  }

  const profile = loadUserProfile() || createEmptyUserProfile()
  const teamMem = loadTeamMemory() || createEmptyTeamMemory(team.id)

  const roster = team.agents
    .map((a) => `  - ${a.name} (${a.role}): ${AGENT_ROLE_DEFINITIONS[a.role]?.displayName ?? a.role}`)
    .join('\n')

  const profileFragment = userProfileToPromptFragment(profile)
  const memoryFragment = teamMemoryToPromptFragment(teamMem, 10)

  const prompt = `You are the Creative Director for this team. Generate a task graph that completes the project below.

${profileFragment || ''}
${memoryFragment || ''}

Team roster:
${roster}

Project:
${description}

Return ONLY valid JSON, no prose. Each task must name an agent by ROLE (not by name), list the task IDs that block it from starting in \`blockedByTaskIds\`, and include a one-sentence success criterion + a one-sentence "why" explaining how it serves the project.

Use 3-8 tasks. Assign the research/strategy tasks first, design tasks whose blockers are those, then a final review task (assigned to the creative-director role) that is blocked by everything else. Use \`parentTaskId\` only when one task is a literal subtask of another — default to leaving it unset.

{"tasks":[{"id":"t1","agentRole":"researcher","instruction":"...","blockedByTaskIds":[],"successCriteria":"...","why":"..."}]}`

  console.log()
  console.log(`  Planning "${description}"...`)

  let res
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } catch (err) {
    console.error(`  Network error: ${err.message}`)
    process.exit(1)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`  Anthropic API ${res.status}: ${body.slice(0, 200)}`)
    process.exit(1)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text
  if (typeof text !== 'string') {
    console.error('  Unexpected response shape from Anthropic API')
    process.exit(1)
  }

  // Tolerate light formatting variance — pull the first JSON object out.
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    console.error('  Haiku did not return valid JSON:')
    console.error(text.slice(0, 300))
    process.exit(1)
  }

  let parsed
  try {
    parsed = JSON.parse(match[0])
  } catch {
    console.error('  Could not parse task graph JSON')
    process.exit(1)
  }

  if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
    console.error('  Haiku returned no tasks')
    process.exit(1)
  }

  const plan = {
    id: `plan-${uid()}`,
    description,
    createdAt: new Date().toISOString(),
    status: 'planning',
    tasks: parsed.tasks.map((t, i) => {
      // Accept both the canonical `blockedByTaskIds` and the legacy
      // `dependencies` field name — Haiku sometimes falls back to the
      // older vocabulary even with the updated prompt.
      const blockers = Array.isArray(t.blockedByTaskIds)
        ? t.blockedByTaskIds
        : Array.isArray(t.dependencies) ? t.dependencies : []
      return {
        id: t.id || `t${i + 1}`,
        agentRole: t.agentRole || 'creative-director',
        instruction: t.instruction || '',
        blockedByTaskIds: blockers,
        ...(typeof t.parentTaskId === 'string' ? { parentTaskId: t.parentTaskId } : {}),
        successCriteria: t.successCriteria || '',
        why: t.why || '',
        status: 'todo',
      }
    }),
  }

  savePlan(plan)

  emitActivity({
    action: 'plan.created',
    teamId: team.id,
    target: { planId: plan.id },
    meta: {
      description,
      taskCount: plan.tasks.length,
      roles: [...new Set(plan.tasks.map((t) => t.agentRole))],
    },
  })

  console.log()
  console.log(`  Plan saved: ${plan.id}`)
  console.log(`  ${plan.tasks.length} tasks across ${new Set(plan.tasks.map((t) => t.agentRole)).size} roles.`)
  console.log()
  for (const task of plan.tasks) {
    const blockers = getBlockers(task)
    const deps = blockers.length > 0 ? ` (after ${blockers.join(', ')})` : ''
    console.log(`  ${task.id} [${task.agentRole}] ${task.instruction}${deps}`)
  }
  console.log()
  console.log(`  View: npx designteam show ${plan.id}`)
  console.log(`  List: npx designteam plans`)
  console.log()
}

async function cmdPlans() {
  const plans = listPlans()
  console.log()
  if (plans.length === 0) {
    console.log('  No plans yet.')
    console.log('  Create one: npx designteam plan "design a landing page"')
    console.log()
    return
  }
  console.log(`  ${plans.length} plan${plans.length === 1 ? '' : 's'}:`)
  console.log()
  for (const plan of plans) {
    const taskCount = plan.tasks?.length ?? 0
    const done = plan.tasks?.filter((t) => t.status === 'done').length ?? 0
    const age = relativeAge(plan.createdAt)
    console.log(`  ${plan.id}  ${plan.description}`)
    console.log(`    ${done}/${taskCount} tasks done · ${plan.status} · ${age}`)
  }
  console.log()
}

async function cmdShow(planId) {
  const plan = loadPlan(planId)
  if (!plan) {
    console.error(`Plan "${planId}" not found.`)
    console.error('Run "npx designteam plans" to see what exists.')
    process.exit(1)
  }

  console.log()
  console.log(`  ${plan.description}`)
  console.log(`  ${plan.id} · ${plan.status} · created ${relativeAge(plan.createdAt)}`)
  console.log()
  for (const task of plan.tasks) {
    const glyph = TASK_STATUS_GLYPH[task.status] ?? '·'
    const blockers = getBlockers(task)
    const deps = blockers.length > 0 ? ` (after ${blockers.join(', ')})` : ''
    const parent = task.parentTaskId ? ` · child of ${task.parentTaskId}` : ''
    const held = task.checkoutId ? ` · held by ${task.checkoutId}` : ''
    console.log(`  ${glyph} ${task.id} [${task.agentRole}] ${task.instruction}${deps}${parent}${held}`)
    if (task.successCriteria) console.log(`      success: ${task.successCriteria}`)
    if (task.why) console.log(`      why: ${task.why}`)
  }
  console.log()
}

async function cmdProgress(planId, taskId, flags) {
  const plan = loadPlan(planId)
  if (!plan) {
    console.error(`Plan "${planId}" not found.`)
    process.exit(1)
  }

  // Shortcut flags map to the paperclip-style status vocabulary.
  // --status=X beats the shortcut flags if both are passed.
  const explicitStatus = flags.find((f) => f.startsWith('--status='))?.split('=')[1]
  let nextStatus = explicitStatus
  if (!nextStatus) {
    if (flags.includes('--start')) nextStatus = 'in_progress'
    else if (flags.includes('--review')) nextStatus = 'in_review'
    else if (flags.includes('--done')) nextStatus = 'done'
    else if (flags.includes('--blocked')) nextStatus = 'blocked'
    else if (flags.includes('--cancel')) nextStatus = 'cancelled'
    else if (flags.includes('--todo')) nextStatus = 'todo'
  }

  if (!nextStatus) {
    console.error('Usage: npx designteam progress <plan-id> <task-id> --done|--start|--review|--blocked|--cancel|--todo')
    console.error('       npx designteam progress <plan-id> <task-id> --status=<status>')
    console.error(`       statuses: ${TASK_STATUSES.join(', ')}`)
    process.exit(1)
  }

  let result
  try {
    result = setTaskStatus(plan, taskId, normalizeStatus(nextStatus))
  } catch (err) {
    console.error(`  ${err.message}`)
    process.exit(1)
  }

  savePlan(result.plan)

  emitActivity({
    action: 'task.status_change',
    teamId: loadTeam()?.id ?? null,
    target: { planId, taskId: result.task.id },
    meta: {
      status: result.task.status,
      agentRole: result.task.agentRole,
      unblocked: result.unblocked.map((t) => t.id),
      planCompleted: result.plan.status === 'completed' || undefined,
    },
  })

  console.log()
  console.log(`  ${result.task.id} → ${result.task.status}  (${result.task.agentRole})`)
  if (result.unblocked.length > 0) {
    console.log(`  ${result.unblocked.length} downstream task${result.unblocked.length === 1 ? '' : 's'} unblocked:`)
    for (const t of result.unblocked) {
      console.log(`    ${t.id} [${t.agentRole}] ${t.instruction}`)
    }
  }
  if (result.plan.status === 'completed') {
    console.log()
    console.log(`  Plan "${result.plan.description}" is complete.`)
  }
  console.log()
}

async function cmdCheckout(planId, taskId, flags) {
  const plan = loadPlan(planId)
  if (!plan) {
    console.error(`Plan "${planId}" not found.`)
    process.exit(1)
  }

  // Default runId = hostname:pid:timestamp-short. Stable enough per invocation,
  // unique enough across parallel runs. Callers can override with --run=X.
  const runIdFlag = flags.find((f) => f.startsWith('--run='))?.split('=')[1]
  const runId = runIdFlag || `local-${process.pid}-${Date.now().toString(36)}`
  const force = flags.includes('--force')

  let task
  try {
    task = checkoutTask(plan, taskId, runId, { force })
  } catch (err) {
    console.error(`  ${err.message}`)
    process.exit(1)
  }
  savePlan(plan)

  emitActivity({
    action: 'task.checkout',
    teamId: loadTeam()?.id ?? null,
    target: { planId, taskId: task.id },
    meta: { runId, agentRole: task.agentRole, forced: force || undefined },
  })

  console.log()
  console.log(`  Claimed ${task.id} [${task.agentRole}] ${task.instruction}`)
  console.log(`  run: ${runId}`)
  console.log(`  Use "npx designteam progress ${planId} ${taskId} --done" when finished.`)
  console.log()
}

async function cmdRelease(planId, taskId, flags) {
  const plan = loadPlan(planId)
  if (!plan) {
    console.error(`Plan "${planId}" not found.`)
    process.exit(1)
  }

  const runIdFlag = flags.find((f) => f.startsWith('--run='))?.split('=')[1]
  const runId = runIdFlag || 'local'
  const force = flags.includes('--force')

  let task
  try {
    task = releaseTask(plan, taskId, runId, { force })
  } catch (err) {
    console.error(`  ${err.message}`)
    process.exit(1)
  }
  savePlan(plan)

  emitActivity({
    action: 'task.release',
    teamId: loadTeam()?.id ?? null,
    target: { planId, taskId: task.id },
    meta: { runId, forced: force || undefined },
  })

  console.log()
  console.log(`  Released ${task.id} [${task.agentRole}] ${task.instruction}`)
  console.log()
}

async function cmdRecover(planId, flags) {
  const plan = loadPlan(planId)
  if (!plan) {
    console.error(`Plan "${planId}" not found.`)
    process.exit(1)
  }

  const minutesFlag = flags.find((f) => f.startsWith('--stale-minutes='))?.split('=')[1]
  const staleMinutes = minutesFlag ? Math.max(1, parseInt(minutesFlag, 10) || 30) : 30
  const dryRun = flags.includes('--dry-run')
  const staleMs = staleMinutes * 60 * 1000

  const stranded = findStrandedTasks(plan, { staleMs })

  console.log()
  if (stranded.length === 0) {
    console.log(`  No stranded tasks in "${plan.description}" (${staleMinutes}m threshold).`)
    console.log()
    return
  }

  console.log(`  ${stranded.length} stranded task${stranded.length === 1 ? '' : 's'} (older than ${staleMinutes}m):`)
  console.log()
  for (const { task, ageMs } of stranded) {
    const age = relativeAge(task.updatedAt ?? new Date(Date.now() - ageMs).toISOString())
    const holder = task.checkoutId ? ` (held by ${task.checkoutId})` : ''
    console.log(`  ${task.id} [${task.agentRole}] ${task.instruction} · last update ${age}${holder}`)
  }
  console.log()

  if (dryRun) {
    console.log('  --dry-run: no changes written. Re-run without --dry-run to reset.')
    console.log()
    return
  }

  for (const { task } of stranded) {
    const prevCheckout = task.checkoutId ?? null
    recoverTask(plan, task.id)
    emitActivity({
      action: 'task.recovered',
      teamId: loadTeam()?.id ?? null,
      target: { planId, taskId: task.id },
      meta: {
        agentRole: task.agentRole,
        prevCheckoutId: prevCheckout || undefined,
        staleMinutes,
      },
    })
  }
  savePlan(plan)

  console.log(`  Reset ${stranded.length} task${stranded.length === 1 ? '' : 's'} back to todo. Run \`designteam next ${plan.id}\` to pick one up.`)
  console.log()
}

async function cmdAdapters() {
  // Load built-ins the same way `designteam run` does, so the list here
  // reflects what an actual dispatch would resolve. Third-party adapters
  // that call registerAdapter() from their own entrypoint won't appear
  // here unless they're imported — that's intentional; the list is about
  // "what the CLI knows about", not "what npm could offer you".
  const { registerBuiltinAdapters } = await import('./builtin-adapters.mjs')
  const { listAdapters } = await import('@designteam/adapter-utils')
  registerBuiltinAdapters()
  const adapters = listAdapters()

  console.log()
  console.log('  Adapters')
  console.log()

  if (adapters.length === 0) {
    console.log('  No adapters registered. Local-script is available via --command=<shell>.')
    console.log()
    return
  }

  for (const a of adapters) {
    console.log(`  • ${a.id}`)
    console.log(`    ${a.name} · v${a.version}`)
  }
  console.log()
  console.log('  Dispatch via: `designteam run <plan> <task> --adapter=<id>`')
  console.log('  Ephemeral local-script also available: --command="<shell>"')
  console.log()
}

async function cmdApprovals() {
  const pending = listPendingApprovals()
  console.log()
  if (pending.length === 0) {
    console.log('  No pending approvals.')
    console.log('  Tasks appear here when they move to in_review (via `progress --review`).')
    console.log()
    return
  }
  console.log(`  ${pending.length} pending approval${pending.length === 1 ? '' : 's'} (oldest first):`)
  console.log()
  for (const p of pending) {
    const age = p.updatedAt ? ` · waiting ${relativeAge(p.updatedAt)}` : ''
    console.log(`  ${p.planId}  ${p.taskId} [${p.agentRole}]${age}`)
    console.log(`    ${p.instruction}`)
    if (p.successCriteria) console.log(`    success: ${p.successCriteria}`)
    console.log(`    approve: npx designteam approve ${p.planId} ${p.taskId}`)
    console.log(`    reject:  npx designteam reject ${p.planId} ${p.taskId} --reason="..."`)
    console.log()
  }
}

async function cmdApprove(planId, taskId, flags) {
  const plan = loadPlan(planId)
  if (!plan) {
    console.error(`Plan "${planId}" not found.`)
    process.exit(1)
  }
  const task = plan.tasks.find((t) => t.id === taskId)
  if (!task) {
    console.error(`Task ${taskId} not in plan ${planId}.`)
    process.exit(1)
  }
  if (task.status !== 'in_review') {
    console.error(`Task ${taskId} is ${task.status}, not in_review — nothing to approve.`)
    process.exit(1)
  }

  const comment = flags.find((f) => f.startsWith('--comment='))?.split('=')[1] ?? null

  let result
  try {
    result = setTaskStatus(plan, taskId, 'done')
  } catch (err) {
    console.error(`  ${err.message}`)
    process.exit(1)
  }
  savePlan(result.plan)

  emitActivity({
    action: 'task.approved',
    teamId: loadTeam()?.id ?? null,
    target: { planId, taskId },
    meta: {
      agentRole: result.task.agentRole,
      comment: comment || undefined,
      unblocked: result.unblocked.map((t) => t.id),
      planCompleted: result.plan.status === 'completed' || undefined,
    },
  })

  console.log()
  console.log(`  ✓ ${result.task.id} approved  (${result.task.agentRole})`)
  if (comment) console.log(`      comment: ${comment}`)
  if (result.unblocked.length > 0) {
    console.log(`      unblocked: ${result.unblocked.map((t) => t.id).join(', ')}`)
  }
  if (result.plan.status === 'completed') {
    console.log(`      plan complete: "${result.plan.description}"`)
  }
  console.log()
}

async function cmdReject(planId, taskId, flags) {
  const plan = loadPlan(planId)
  if (!plan) {
    console.error(`Plan "${planId}" not found.`)
    process.exit(1)
  }
  const task = plan.tasks.find((t) => t.id === taskId)
  if (!task) {
    console.error(`Task ${taskId} not in plan ${planId}.`)
    process.exit(1)
  }
  if (task.status !== 'in_review') {
    console.error(`Task ${taskId} is ${task.status}, not in_review — nothing to reject.`)
    process.exit(1)
  }

  const reason = flags.find((f) => f.startsWith('--reason='))?.split('=')[1] ?? null
  const goesToBlocked = flags.includes('--block')
  const nextStatus = goesToBlocked ? 'blocked' : 'todo'

  let result
  try {
    result = setTaskStatus(plan, taskId, nextStatus)
  } catch (err) {
    console.error(`  ${err.message}`)
    process.exit(1)
  }
  savePlan(result.plan)

  emitActivity({
    action: 'task.rejected',
    teamId: loadTeam()?.id ?? null,
    target: { planId, taskId },
    meta: {
      agentRole: result.task.agentRole,
      reason: reason || undefined,
      nextStatus,
    },
  })

  console.log()
  console.log(`  × ${result.task.id} rejected → ${nextStatus}  (${result.task.agentRole})`)
  if (reason) console.log(`      reason: ${reason}`)
  console.log()
}

async function cmdBudget(args) {
  const sub = args[0] || 'show'

  if (sub === 'show') {
    const { periodStart } = loadBudget()
    const status = getBudgetStatus()
    console.log()
    console.log('  Budget')
    console.log()
    if (status.state === 'unset') {
      console.log('  No cap set. `designteam budget set --usd=5` to enable hard-stop at $5.')
    } else {
      const spentUsd = (status.spent / 100).toFixed(2)
      const capUsd = (status.limit / 100).toFixed(2)
      const pct = Math.round(status.pctUsed * 100)
      console.log(`  Cap:    $${capUsd}`)
      console.log(`  Spent:  $${spentUsd}  (${pct}%)`)
      if (status.state === 'over') {
        console.log('  Status: OVER — designteam run will refuse until raised or reset.')
      } else if (status.state === 'warn') {
        const remaining = ((status.limit - status.spent) / 100).toFixed(2)
        console.log(`  Status: ⚠️  WARN — only $${remaining} remaining this period.`)
      } else {
        console.log(`  Status: OK — $${((status.limit - status.spent) / 100).toFixed(2)} remaining this period.`)
      }
    }
    console.log(`  Period start: ${periodStart}`)
    console.log()
    return
  }

  if (sub === 'set') {
    const usdFlag = args.find((a) => a.startsWith('--usd='))?.split('=')[1]
    if (!usdFlag) {
      console.error('Usage: designteam budget set --usd=<amount>')
      process.exit(1)
    }
    const usd = parseFloat(usdFlag)
    if (!Number.isFinite(usd) || usd < 0) {
      console.error('--usd must be a non-negative number')
      process.exit(1)
    }
    setLimit(Math.round(usd * 100))
    console.log()
    console.log(`  Budget cap set to $${usd.toFixed(2)}/period.`)
    console.log()
    return
  }

  if (sub === 'reset') {
    resetPeriod()
    console.log()
    console.log('  Budget period reset. Ledger cleared.')
    console.log()
    return
  }

  console.error('Usage: designteam budget [show|set --usd=<n>|reset]')
  process.exit(1)
}

async function cmdRun(planId, taskId, flags) {
  const { runOneTask } = await import('./runner.mjs')

  const getFlag = (prefix) => {
    const match = flags.find((f) => f.startsWith(prefix))
    return match ? match.slice(prefix.length) : null
  }

  const command = getFlag('--command=')
  const adapterId = getFlag('--adapter=')
  const runId = getFlag('--run=') ?? undefined
  const timeoutMsRaw = getFlag('--timeout-ms=')
  const timeoutMs = timeoutMsRaw ? parseInt(timeoutMsRaw, 10) : undefined
  const dryRun = flags.includes('--dry-run')

  if (!command && !adapterId) {
    console.error('Usage: npx designteam run <plan-id> <task-id> --adapter=<id>')
    console.error('  Or:  npx designteam run <plan-id> <task-id> --command="<shell command>"')
    console.error('')
    console.error('Built-in adapters:')
    console.error('  @designteam/adapter-claude-cli       — wraps the local `claude` CLI')
    console.error('  @designteam/adapter-anthropic-api    — calls the API directly (needs ANTHROPIC_API_KEY)')
    console.error('  (local-script available via --command=)')
    process.exit(1)
  }

  if (dryRun) {
    await cmdRunDryRun({ planId, taskId, command, adapterId, timeoutMs })
    return
  }

  let outcome
  try {
    outcome = await runOneTask({ planId, taskId, runId, command, adapterId, timeoutMs })
  } catch (err) {
    console.error(`  ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }

  const { task, result } = outcome
  console.log()
  console.log(`  ${task.id} [${task.agentRole}] → ${result.outcome}`)
  if (result.outcome === 'done' && result.summary) {
    console.log(`      summary: ${result.summary.split('\n')[0].slice(0, 200)}`)
  }
  if (result.outcome === 'error' && result.message) {
    console.log(`      error: ${result.message.split('\n')[0].slice(0, 200)}`)
  }
  if (outcome.transition?.unblocked?.length) {
    console.log(`      unblocked: ${outcome.transition.unblocked.map((t) => t.id).join(', ')}`)
  }
  if (outcome.transition?.plan?.status === 'completed') {
    console.log(`      plan complete: "${outcome.transition.plan.description}"`)
  }
  console.log()
}

async function cmdRunDryRun({ planId, taskId, command, adapterId, timeoutMs }) {
  // Dry-run preview: resolve everything the real run would resolve, but
  // stop short of checkout + dispatch + activity mutation. The operator
  // sees the plan / task / agent / adapter / budget state the real run
  // would hit, without leaving debris in .designteam/.
  const plan = loadPlan(planId)
  if (!plan) {
    console.error(`  Plan "${planId}" not found.`)
    process.exit(1)
  }
  const team = loadTeam()
  if (!team) {
    console.error('  No team installed — run `designteam install <id>` or `designteam create`.')
    process.exit(1)
  }
  const task = plan.tasks.find((t) => t.id === taskId)
  if (!task) {
    console.error(`  Task "${taskId}" not in plan "${planId}".`)
    process.exit(1)
  }
  const agent = team.agents.find((a) => a.role === task.agentRole)
  if (!agent) {
    console.error(`  No agent with role "${task.agentRole}" on this team.`)
    process.exit(1)
  }

  let adapterLabel
  if (adapterId) {
    const { registerBuiltinAdapters } = await import('./builtin-adapters.mjs')
    const { resolveAdapter } = await import('@designteam/adapter-utils')
    registerBuiltinAdapters()
    const adapter = resolveAdapter(adapterId)
    adapterLabel = adapter
      ? `${adapter.id} (${adapter.name} v${adapter.version})`
      : `${adapterId} — NOT REGISTERED (the real run would refuse)`
  } else if (command) {
    adapterLabel = `ephemeral @designteam/adapter-local-script · command="${command}"`
  }

  const budget = getBudgetStatus()

  console.log()
  console.log('  Dry run — no checkout, no dispatch, no state mutation.')
  console.log()
  console.log(`  Plan:     ${plan.id}  "${plan.description}"`)
  console.log(`  Task:     ${task.id}  [${task.agentRole}]  ${task.instruction}`)
  console.log(`            status=${task.status}` + (task.checkoutId ? ` · held by ${task.checkoutId}` : ''))
  if (task.blockedByTaskIds?.length) {
    console.log(`            blockedBy: ${task.blockedByTaskIds.join(', ')}`)
  }
  console.log(`  Agent:    ${agent.name} (${agent.role})  id=${agent.id}`)
  console.log(`  Adapter:  ${adapterLabel}`)
  if (timeoutMs) console.log(`  Timeout:  ${timeoutMs}ms`)

  if (budget.state !== 'unset') {
    const spentUsd = (budget.spent / 100).toFixed(2)
    const capUsd = (budget.limit / 100).toFixed(2)
    const pct = Math.round(budget.pctUsed * 100)
    const flag = budget.state === 'over' ? '[OVER — real run would refuse]'
      : budget.state === 'warn' ? '[WARN — real run would nag + dispatch]'
      : '[OK]'
    console.log(`  Budget:   $${spentUsd} / $${capUsd} (${pct}%) ${flag}`)
  }

  if (task.status !== 'todo' && task.status !== 'blocked') {
    console.log()
    console.log(`  Note: task is in "${task.status}" — a real run would fail the atomic checkout guard.`)
  }

  console.log()
}

async function cmdNext(planId, flags) {
  const plan = loadPlan(planId)
  if (!plan) {
    console.error(`Plan "${planId}" not found.`)
    process.exit(1)
  }

  const task = nextReadyTask(plan)
  const idOnly = flags.includes('--id-only')

  if (!task) {
    if (idOnly) {
      // --id-only is meant for scripts. Exit 1 with no stdout so a
      // loop like `while id=$(designteam next $plan --id-only); do ...`
      // terminates cleanly.
      process.exit(1)
    }
    console.log()
    console.log(`  No ready tasks in "${plan.description}".`)
    // Help the caller understand why — are things blocked, or just done?
    const remaining = plan.tasks.filter((t) => !TERMINAL_IN_PLAN.has(t.status))
    if (remaining.length === 0) {
      console.log('  Everything is done or cancelled.')
    } else {
      const byStatus = remaining.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] ?? 0) + 1
        return acc
      }, {})
      const summary = Object.entries(byStatus).map(([s, n]) => `${n} ${s}`).join(', ')
      console.log(`  Still open: ${summary}.`)
    }
    console.log()
    return
  }

  if (idOnly) {
    console.log(task.id)
    return
  }

  const glyph = TASK_STATUS_GLYPH[task.status] ?? '·'
  const blockers = getBlockers(task)
  const deps = blockers.length > 0 ? ` (was blocked by ${blockers.join(', ')})` : ''
  console.log()
  console.log(`  Next: ${glyph} ${task.id} [${task.agentRole}] ${task.instruction}${deps}`)
  if (task.successCriteria) console.log(`      success: ${task.successCriteria}`)
  if (task.why) console.log(`      why: ${task.why}`)
  console.log()
  console.log(`  Claim: npx designteam checkout ${plan.id} ${task.id}`)
  console.log()
}

const TERMINAL_IN_PLAN = new Set(['done', 'cancelled'])

async function cmdActivity(limit) {
  const events = readActivity(limit)
  console.log()
  if (events.length === 0) {
    console.log('  No activity yet.')
    console.log('  Run a command (checkout/progress/plan/...) and it will show up here.')
    console.log()
    return
  }
  console.log(`  Last ${events.length} event${events.length === 1 ? '' : 's'} (newest first):`)
  console.log()
  for (const ev of events) {
    const age = relativeAge(ev.at)
    const target = formatActivityTarget(ev)
    console.log(`  ${age.padEnd(8)} ${ev.action.padEnd(22)} ${target}`)
  }
  console.log()
}

/** One-line summary of what an activity event acted on. */
function formatActivityTarget(ev) {
  const t = ev.target ?? {}
  const parts = []
  if (t.planId) parts.push(t.planId)
  if (t.taskId) parts.push(t.taskId)
  // Prefer the human-readable agentName meta over the raw ID when both exist.
  if (t.agentId) parts.push(ev.meta?.agentName ?? t.agentId)
  const meta = ev.meta ?? {}
  const extras = []
  if (meta.category) extras.push(meta.category)
  if (meta.key) extras.push(meta.key)
  if (meta.status) extras.push(meta.status)
  if (Array.isArray(meta.outcomes) && meta.outcomes.length > 0) {
    extras.push(meta.outcomes.join('+'))
  }
  if (meta.role) extras.push(meta.role)
  if (meta.agentRole && !t.agentId) extras.push(meta.agentRole)
  if (meta.runId) extras.push(`run=${meta.runId}`)
  if (Array.isArray(meta.unblocked) && meta.unblocked.length > 0) {
    extras.push(`unblocked=${meta.unblocked.join(',')}`)
  }
  if (typeof meta.xpGained === 'number' && meta.xpGained > 0) extras.push(`+${meta.xpGained} XP`)
  if (meta.leveledUp) extras.push(`lv${meta.newLevel}`)
  if (typeof meta.memoriesApplied === 'number' && meta.memoriesApplied > 0) {
    extras.push(`${meta.memoriesApplied} mem`)
  }
  if (typeof meta.teamSize === 'number') extras.push(`team=${meta.teamSize}`)
  if (meta.planCompleted) extras.push('plan-complete')
  const base = parts.join(' · ')
  return extras.length > 0 ? `${base}  (${extras.join(', ')})` : base
}

function relativeAge(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
