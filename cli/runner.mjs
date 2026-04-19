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
import { resolveAdapter } from '@designteam/adapter-utils'
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
import { appendSpend, getBudgetStatus, WARNING_THRESHOLD } from './budget.mjs'
import { registerBuiltinAdapters } from './builtin-adapters.mjs'

/**
 * Run one task end-to-end: checkout → adapter.executeTask → status transition.
 *
 * @param {Object} opts
 * @param {string} opts.planId
 * @param {string} opts.taskId
 * @param {string} [opts.runId]     override the auto-generated runId
 * @param {string} [opts.command]   shorthand: build an ephemeral
 *                                  @designteam/adapter-local-script on the fly
 * @param {string} [opts.adapterId] resolve a registered adapter by id (e.g.
 *                                  '@designteam/adapter-claude-cli')
 * @param {Object} [opts.adapter]   bring-your-own pre-constructed adapter
 *                                  (takes precedence over adapterId + command)
 * @param {number} [opts.timeoutMs] passed through to the adapter
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ task, result, transition }>}
 */
export async function runOneTask({ planId, taskId, runId, command, adapter, adapterId, timeoutMs, signal }) {
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

  // Resolve the adapter. Priority order:
  //   1. explicit opts.adapter — tests / BYO
  //   2. --adapter=<id> — lookup in the registry (built-ins auto-registered)
  //   3. --command=<cmd> — ephemeral local-script adapter
  // Follow-up PR adds .designteam/adapters.json config-file resolution.
  registerBuiltinAdapters()
  let resolvedAdapter = adapter
  if (!resolvedAdapter && adapterId) {
    resolvedAdapter = resolveAdapter(adapterId)
    if (!resolvedAdapter) {
      throw new Error(
        `Unknown adapter "${adapterId}". Run \`designteam adapters\` to see which ids are registered. ` +
        'Third-party adapters register themselves via `registerAdapter()`.',
      )
    }
  }
  if (!resolvedAdapter && command) {
    resolvedAdapter = createLocalScriptAdapter({ command, timeoutMs })
  }
  if (!resolvedAdapter) {
    throw new Error('No adapter resolved. Pass --adapter=<id> or --command=<cmd>.')
  }

  const effectiveRunId = runId || `local-${process.pid}-${Date.now().toString(36)}`
  const effectiveSignal = signal ?? new AbortController().signal

  // --- Budget hard-stop + soft warning ---
  // Refuse to dispatch if the operator set a cap and the current period
  // has reached it. Checking BEFORE checkout so we never strand a task
  // in_progress because the cap tripped mid-flight. Users can opt out by
  // not setting a cap. At WARNING_THRESHOLD we still dispatch but nag
  // via stderr + activity so the operator sees the runway shrinking.
  const budgetStatus = getBudgetStatus()
  if (budgetStatus.state === 'over') {
    throw new Error(
      `Budget cap reached: spent $${(budgetStatus.spent / 100).toFixed(2)} of $${(budgetStatus.limit / 100).toFixed(2)} this period. ` +
      'Raise the cap with `designteam budget set --usd=<amount>` or reset the period with `designteam budget reset`.',
    )
  }
  if (budgetStatus.state === 'warn') {
    const pct = Math.round(budgetStatus.pctUsed * 100)
    const spentUsd = (budgetStatus.spent / 100).toFixed(2)
    const capUsd = (budgetStatus.limit / 100).toFixed(2)
    process.stderr.write(
      `⚠️  Budget at ${pct}%: spent $${spentUsd} of $${capUsd}. Raise the cap or reset before it trips.\n`,
    )
    emitActivity({
      action: 'budget.warning',
      teamId: team.id,
      target: { planId, taskId },
      meta: {
        spentCents: budgetStatus.spent,
        limitCents: budgetStatus.limit,
        pctUsed: budgetStatus.pctUsed,
        threshold: WARNING_THRESHOLD,
      },
    })
  }

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

  // --- Cost accounting (best-effort) ---
  // If the adapter reports cost, append it to the budget ledger so the
  // next run's pre-flight check sees the updated spend. Errors here
  // are swallowed — budget is observability, not correctness.
  if (typeof resolvedAdapter.reportCost === 'function' && result.outcome !== 'error') {
    try {
      const costReport = await resolvedAdapter.reportCost(ctx, result)
      if (costReport && Number.isFinite(costReport.usdCents)) {
        appendSpend(costReport.usdCents, {
          model: costReport.model,
          adapter: resolvedAdapter.id,
          runId: effectiveRunId,
          planId,
          taskId,
          inputTokens: costReport.inputTokens,
          outputTokens: costReport.outputTokens,
        })
      }
    } catch {
      // best-effort
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
