/**
 * Stranded-work recovery — the single-runner version of paperclip's
 * heartbeat + stranded-execution model.
 *
 * Paperclip runs a daemon that watches every agent's heartbeat and
 * auto-queues recovery wakes when one goes silent. We don't have a
 * daemon — we have a CLI invoked by a human, by Claude Code, or by
 * cron. `designteam recover <plan>` is the same idea, triggered on
 * demand:
 *
 *   - Scans every task in a plan.
 *   - For each task that's `in_progress` and whose `updatedAt` is
 *     older than a staleness threshold, it considers the task
 *     stranded: the runner that checked it out probably died.
 *   - Recovery action: release the checkout (clear `checkoutId`) and
 *     move the task back to `todo` so `designteam next` will hand it
 *     out again. An activity `task.recovered` event records what
 *     happened so the audit trail shows the reset.
 *
 * No `heartbeatAt` field was added — `updatedAt` (already stamped on
 * every status/checkout transition) is sufficient. If an adapter
 * needs finer-grained liveness it can call `designteam progress
 * --start` periodically to bump `updatedAt`.
 */

import { TERMINAL_TASK_STATUSES } from './plans.mjs'

const DEFAULT_STALE_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Find stranded tasks in a plan. A task is stranded when:
 *   - its status is `in_progress`
 *   - its `updatedAt` is older than `staleMs` (or missing)
 *
 * Returns an array of { task, ageMs } sorted oldest-first so the
 * reviewer sees the worst offenders at the top.
 */
export function findStrandedTasks(plan, { staleMs = DEFAULT_STALE_MS, now = Date.now() } = {}) {
  const stranded = []
  for (const task of plan.tasks ?? []) {
    if (task.status !== 'in_progress') continue
    const updatedAt = task.updatedAt ? new Date(task.updatedAt).getTime() : 0
    const ageMs = now - updatedAt
    if (!updatedAt || ageMs > staleMs) {
      stranded.push({ task, ageMs })
    }
  }
  stranded.sort((a, b) => b.ageMs - a.ageMs)
  return stranded
}

/**
 * Recover one stranded task. Releases the checkout lock and moves the
 * task back to `todo`. Returns the recovered task. Called by
 * `designteam recover` per stranded entry; also exposed so tests and
 * scripted runners can reset without CLI invocation.
 */
export function recoverTask(plan, taskId) {
  const task = plan.tasks.find((t) => t.id === taskId)
  if (!task) throw new Error(`Task ${taskId} not in plan ${plan.id}`)
  if (task.status !== 'in_progress') {
    throw new Error(`Task ${taskId} is ${task.status}, not in_progress — nothing to recover`)
  }
  if (TERMINAL_TASK_STATUSES.has(task.status)) {
    // Guard even though the status check above already covers terminal
    // states. Cheap belt-and-suspenders for a safety-adjacent path.
    throw new Error(`Task ${taskId} is terminal — can't recover`)
  }
  task.checkoutId = null
  task.status = 'todo'
  task.updatedAt = new Date().toISOString()
  return task
}
