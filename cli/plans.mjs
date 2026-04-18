/**
 * Project plan storage for Design Team CLI.
 *
 * Plans live in `.designteam/projects/<plan-id>.json`. Each plan is a
 * Haiku-generated task graph — agents + instructions + dependencies +
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
 *     dependencies: string[],
 *     successCriteria: string,
 *     why: string,
 *     status: TaskStatus,
 *     updatedAt?: string
 *   }>
 * }
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

function plansDir() {
  return join(getStateDir(), PROJECTS_DIR)
}

export function loadPlan(planId) {
  const path = join(plansDir(), `${planId}.json`)
  if (!existsSync(path)) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    // Normalize task statuses on load so legacy plans work with the new lifecycle.
    if (Array.isArray(raw.tasks)) {
      raw.tasks = raw.tasks.map((t) => ({ ...t, status: normalizeStatus(t.status) }))
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
 * Transition one task to a new status, updating `updatedAt` and — when a
 * task moves to `done` — auto-unblocking any downstream task that depended
 * on it and was sitting in `blocked`. This is the "deps resolve ⇒ wake
 * dependents" rule borrowed from paperclip's execution semantics.
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

  const unblocked = []
  if (status === 'done') {
    for (const other of plan.tasks) {
      if (other.status !== 'blocked') continue
      const deps = other.dependencies ?? []
      const allResolved = deps.every((depId) => {
        const dep = plan.tasks.find((t) => t.id === depId)
        return dep && TERMINAL_TASK_STATUSES.has(dep.status)
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
