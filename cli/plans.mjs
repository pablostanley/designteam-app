/**
 * Project plan storage for Design Team CLI.
 *
 * Plans live in `.designteam/projects/<plan-id>.json`. Each plan is a
 * Haiku-generated task graph — agents + instructions + dependencies +
 * success criteria — that the team works through sequentially.
 *
 * Plan schema (kept tiny so Haiku can reliably produce it):
 * {
 *   id: string,
 *   description: string,
 *   createdAt: string (ISO),
 *   status: 'planning' | 'running' | 'completed',
 *   tasks: Array<{
 *     id: string,
 *     agentRole: string,
 *     instruction: string,
 *     dependencies: string[],
 *     successCriteria: string,
 *     why: string,
 *     status: 'pending' | 'in_progress' | 'done' | 'blocked'
 *   }>
 * }
 */

import {
  readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync,
} from 'fs'
import { join } from 'path'
import { getStateDir } from './state.mjs'

const PROJECTS_DIR = 'projects'

function plansDir() {
  return join(getStateDir(), PROJECTS_DIR)
}

export function loadPlan(planId) {
  const path = join(plansDir(), `${planId}.json`)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
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
      .map((f) => {
        try {
          return JSON.parse(readFileSync(join(dir, f), 'utf8'))
        } catch {
          return null
        }
      })
      .filter(Boolean)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  } catch {
    return []
  }
}
