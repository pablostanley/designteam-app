/**
 * Task runner — glues the CLI to an adapter for one task execution.
 *
 * Flow (paperclip's execution loop, single-step version):
 *   1. Load plan + team + team memory + user profile + agent state
 *   2. Atomically check out the task (fail if held by someone else)
 *   3. Build a TaskContext matching the @designteam/adapter-utils shape
 *   4. Dispatch to the adapter's executeTask
 *   5. Map the returned TaskResult.outcome to a setTaskStatus transition
 *   6. Emit an activity event describing what happened
 *
 * This module is CLI-side only. Adapters live in workspace packages
 * (`@designteam/adapter-local-script` is the first) and get invoked by
 * id/config from `designteam run`.
 */

import { createDefaultLivingState, createEmptyTeamMemory, createEmptyUserProfile } from '@designteam/core'
import { createLocalScriptAdapter } from '@designteam/adapter-local-script'
import {
  loadPlan,
  savePlan,
  checkoutTask,
  releaseTask,
  setTaskStatus,
} from './plans.mjs'
import {
  loadTeam,
  loadAgentState,
  loadTeamMemory,
  loadUserProfile,
} from './state.mjs'
import { emitActivity } from './activity.mjs'

/**
 * Run one task end-to-end: checkout → adapter.executeTask → status transition.
 *
 * @param {Object} opts
 * @param {string} opts.planId
 * @param {string} opts.taskId
 * @param {string} [opts.runId]     override the auto-generated runId
 * @param {string} [opts.command]   shorthand: build an ephemeral
 *                                  @designteam/adapter-local-script on the fly
 * @param {Object} [opts.adapter]   bring-your-own pre-registered adapter
 * @param {number} [opts.timeoutMs] passed through to the adapter
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ task, result, transition }>}
 */
export async function runOneTask({ planId, taskId, runId, command, adapter, timeoutMs, signal }) {
  const plan = loadPlan(planId)
  if (!plan) throw new Error(`Plan "${planId}" not found`)

  const team = loadTeam()
  if (!team) throw new Error('No team installed — run `designteam install <id>` or `designteam create`')

  const task = plan.tasks.find((t) => t.id === taskId)
  if (!task) throw new Error(`Task "${taskId}" not in plan "${planId}"`)

  // Resolve the agent by role. Plans target roles; agents provide identity.
  const agent = team.agents.find((a) => a.role === task.agentRole)
  if (!agent) {
    throw new Error(`No agent with role "${task.agentRole}" on this team`)
  }

  // Resolve the adapter. Today two paths:
  //   - explicit opts.adapter (used in tests or when the caller wants BYO)
  //   - opts.command shortcut → ephemeral local-script adapter
  // Follow-up PR adds .designteam/adapters.json config-file resolution.
  const resolvedAdapter = adapter ?? (command ? createLocalScriptAdapter({ command, timeoutMs }) : null)
  if (!resolvedAdapter) {
    throw new Error('No adapter resolved. Pass --command=<cmd> for a local-script adapter, or register one programmatically.')
  }

  const effectiveRunId = runId || `local-${process.pid}-${Date.now().toString(36)}`
  const effectiveSignal = signal ?? new AbortController().signal

  // --- Atomic checkout ---
  checkoutTask(plan, taskId, effectiveRunId)
  savePlan(plan)
  emitActivity({
    action: 'task.checkout',
    teamId: team.id,
    target: { planId, taskId },
    meta: { runId: effectiveRunId, agentRole: task.agentRole, via: 'run' },
  })

  // --- Build adapter context ---
  const agentState = loadAgentState(agent.id) || createDefaultLivingState(agent.id)
  const teamMemory = loadTeamMemory() || createEmptyTeamMemory(team.id)
  const userProfile = loadUserProfile() || createEmptyUserProfile()

  const ctx = {
    plan,
    task,
    team,
    agent,
    agentState,
    teamMemory,
    userProfile,
    runId: effectiveRunId,
    signal: effectiveSignal,
  }

  // --- Dispatch ---
  let result
  try {
    result = await resolvedAdapter.executeTask(ctx)
  } catch (err) {
    // An adapter throwing is treated as an error outcome — the CLI
    // releases the lock and surfaces the message.
    result = {
      outcome: 'error',
      message: err instanceof Error ? err.message : String(err),
      cause: err,
    }
  }

  // --- Map outcome to status transition ---
  // Reload plan so auto-unblock semantics from setTaskStatus consider
  // any state written during executeTask. (The adapter shouldn't mutate
  // the plan but we're defensive.)
  const freshPlan = loadPlan(planId) ?? plan
  let transition
  try {
    if (result.outcome === 'done') {
      transition = setTaskStatus(freshPlan, taskId, 'done')
    } else if (result.outcome === 'in_review') {
      transition = setTaskStatus(freshPlan, taskId, 'in_review')
    } else if (result.outcome === 'blocked') {
      transition = setTaskStatus(freshPlan, taskId, 'blocked')
    } else if (result.outcome === 'cancelled') {
      transition = setTaskStatus(freshPlan, taskId, 'cancelled')
    } else {
      // outcome === 'error' — leave status in_progress, release the lock.
      releaseTask(freshPlan, taskId, effectiveRunId)
    }
  } finally {
    savePlan(freshPlan)
  }

  emitActivity({
    action: 'task.run',
    teamId: team.id,
    target: { planId, taskId, agentId: agent.id },
    meta: {
      runId: effectiveRunId,
      adapter: resolvedAdapter.id,
      outcome: result.outcome,
      status: transition?.task?.status,
      unblocked: transition?.unblocked?.map((t) => t.id),
      planCompleted: transition?.plan?.status === 'completed' || undefined,
      agentName: agent.name,
      agentRole: agent.role,
      ...(result.outcome === 'error' ? { error: result.message } : {}),
    },
  })

  return { task: freshPlan.tasks.find((t) => t.id === taskId), result, transition }
}
