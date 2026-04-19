/**
 * Project plan storage for Design Team CLI.
 *
 * Plans live in `.designteam/projects/<plan-id>.json`. Each plan is a
 * Haiku-generated task graph — agents + instructions + blockers +
 * success criteria — that the team works through sequentially.
 *
 * Plan schema:
 * {
 *   id: string,
 *   description: string,
 *   createdAt: string (ISO),
 *   status: 'planning' | 'running' | 'completed' | 'cancelled',
 *   tasks: Array<{
 *     id: string,
 *     agentRole: string,
 *     instruction: string,
 *     blockedByTaskIds: string[],   // "can't start until these finish"
 *     parentTaskId?: string,        // "this is a child of that task"
 *     successCriteria: string,
 *     why: string,
 *     status: TaskStatus,
 *     checkoutId?: string,
 *     updatedAt?: string
 *   }>
 * }
 *
 * Blockers vs parent/child (paperclip-inspired):
 *   - `blockedByTaskIds` is DEPENDENCY: "this task can't continue until
 *     those tasks reach a terminal state". Drives auto-unblock.
 *   - `parentTaskId` is STRUCTURE: "this task is a child of that task"
 *     — used for work breakdown and rollup. Never treat a parent as an
 *     implicit blocker; if a parent really is waiting on children,
 *     encode that as blockers.
 *
 * Legacy plans stored under the old `dependencies: string[]` field name
 * (pre-v0.13) are read as `blockedByTaskIds` transparently on load.
 *
 * Task lifecycle (paperclip-inspired, v0.13):
 *   todo → in_progress → in_review → done
 *                                ↘    ↗
 *                                 blocked (external dependency)
 *                                 ↘
 *                                  cancelled (terminal)
 *
 * Legacy plans that used `pending` are normalized to `todo` on read.
 */

import {
  readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync,
} from 'fs'
import { join } from 'path'
import { getStateDir } from './state.mjs'

const PROJECTS_DIR = 'projects'

export const TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'done', 'blocked', 'cancelled']
export const TERMINAL_TASK_STATUSES = new Set(['done', 'cancelled'])

/** Glyph used in CLI output to keep status visible at a glance. */
export const TASK_STATUS_GLYPH = {
  todo: '·',
  in_progress: '→',
  in_review: '?',
  done: '✓',
  blocked: '!',
  cancelled: '×',
}

/** Canonical status for a stored task, tolerating the older 'pending' value. */
export function normalizeStatus(status) {
  if (!status || status === 'pending') return 'todo'
  return TASK_STATUSES.includes(status) ? status : 'todo'
}

/**
 * Return the task IDs that block this task. Prefers the canonical
 * `blockedByTaskIds` field; falls back to legacy `dependencies` so
 * plans authored before v0.13 keep working. Empty array is the
 * safe default.
 */
export function getBlockers(task) {
  if (Array.isArray(task.blockedByTaskIds)) return task.blockedByTaskIds
  if (Array.isArray(task.dependencies)) return task.dependencies
  return []
}

function plansDir() {
  return join(getStateDir(), PROJECTS_DIR)
}

export function loadPlan(planId) {
  const path = join(plansDir(), `${planId}.json`)
  if (!existsSync(path)) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    // Normalize task statuses + blocker field on load so legacy plans
    // work with the new lifecycle and blockedByTaskIds naming.
    if (Array.isArray(raw.tasks)) {
      raw.tasks = raw.tasks.map((t) => {
        const normalized = { ...t, status: normalizeStatus(t.status) }
        if (!Array.isArray(normalized.blockedByTaskIds)) {
          normalized.blockedByTaskIds = Array.isArray(t.dependencies) ? t.dependencies : []
        }
        return normalized
      })
    }
    return raw
  } catch {
    return null
  }
}

export function savePlan(plan) {
  const dir = plansDir()
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${plan.id}.json`), JSON.stringify(plan, null, 2), 'utf8')
}

export function listPlans() {
  const dir = plansDir()
  if (!existsSync(dir)) return []
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => loadPlan(f.replace(/\.json$/, '')))
      .filter(Boolean)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  } catch {
    return []
  }
}

/**
 * Claim a task for a specific run. Atomic: succeeds only if the task is
 * currently unclaimed or already held by the same runId. Mirrors
 * paperclip's `checkoutRunId` concept — ownership lock separate from
 * status, so a task in `in_progress` always has a named owner and no
 * two runners can double-claim.
 *
 * Pass `force: true` to steal a stale claim (e.g. the original runner
 * crashed). Returns the updated task.
 */
export function checkoutTask(plan, taskId, runId, { force = false } = {}) {
  if (!runId || typeof runId !== 'string') {
    throw new Error('checkoutTask requires a runId string')
  }
  const task = plan.tasks.find((t) => t.id === taskId)
  if (!task) throw new Error(`Task ${taskId} not found in plan ${plan.id}`)
  if (TERMINAL_TASK_STATUSES.has(task.status)) {
    throw new Error(`Task ${taskId} is ${task.status} — can't check it out`)
  }
  if (task.checkoutId && task.checkoutId !== runId && !force) {
    throw new Error(`Task ${taskId} already held by run ${task.checkoutId} (pass --force to steal)`)
  }
  task.checkoutId = runId
  task.status = 'in_progress'
  task.updatedAt = new Date().toISOString()
  return task
}

/**
 * Release a task claim. No-op if not held by runId (callers shouldn't
 * release someone else's lock). Force-releases when `force: true`.
 */
export function releaseTask(plan, taskId, runId, { force = false } = {}) {
  const task = plan.tasks.find((t) => t.id === taskId)
  if (!task) throw new Error(`Task ${taskId} not found in plan ${plan.id}`)
  if (task.checkoutId && task.checkoutId !== runId && !force) {
    throw new Error(`Task ${taskId} held by ${task.checkoutId}, not ${runId}`)
  }
  task.checkoutId = null
  task.updatedAt = new Date().toISOString()
  return task
}

/**
 * Transition one task to a new status, updating `updatedAt` and — when a
 * task moves to `done` — auto-unblocking any downstream task that depended
 * on it and was sitting in `blocked`. This is the "deps resolve ⇒ wake
 * dependents" rule borrowed from paperclip's execution semantics.
 *
 * Terminal states (done/cancelled) also auto-release any active checkout
 * claim on the task — a terminated task has no owner.
 *
 * Returns { plan, task, unblocked[] } so the CLI can report what happened.
 */
export function setTaskStatus(plan, taskId, nextStatus) {
  const status = normalizeStatus(nextStatus)
  if (!TASK_STATUSES.includes(status)) {
    throw new Error(`Unknown status: ${nextStatus}`)
  }

  const task = plan.tasks.find((t) => t.id === taskId)
  if (!task) throw new Error(`Task ${taskId} not found in plan ${plan.id}`)

  task.status = status
  task.updatedAt = new Date().toISOString()

  // Terminal transitions auto-release any checkout claim. Keeps the
  // invariant: only non-terminal tasks can have a live checkoutId.
  if (TERMINAL_TASK_STATUSES.has(status) && task.checkoutId) {
    task.checkoutId = null
  }

  const unblocked = []
  if (status === 'done') {
    for (const other of plan.tasks) {
      if (other.status !== 'blocked') continue
      const blockers = getBlockers(other)
      const allResolved = blockers.every((blockerId) => {
        const blocker = plan.tasks.find((t) => t.id === blockerId)
        return blocker && TERMINAL_TASK_STATUSES.has(blocker.status)
      })
      if (allResolved) {
        other.status = 'todo'
        other.updatedAt = new Date().toISOString()
        unblocked.push(other)
      }
    }
  }

  // Bubble plan status up when all tasks reach a terminal state.
  const allTerminal = plan.tasks.every((t) => TERMINAL_TASK_STATUSES.has(t.status))
  if (allTerminal && plan.status !== 'completed' && plan.status !== 'cancelled') {
    plan.status = 'completed'
  }

  return { plan, task, unblocked }
}
