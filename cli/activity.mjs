/**
 * Activity log — append-only JSONL feed of mutating actions.
 *
 * Every CLI action that changes durable state (hires, fires, reports,
 * memory adds, profile edits, plan creation, task transitions,
 * checkouts) emits one row here. Scope is intentionally broad:
 *
 * - UI consumers (Efecto Phase 2 "Team View") can tail it for a live
 *   activity feed instead of polling every entity.
 * - Debugging a weird autonomous run means reading one file in order,
 *   not reconstructing from agent_states + task_events + relationships.
 * - Cloud sync (follow-up) will mirror these rows to Supabase so the
 *   web team page gets the same feed.
 *
 * JSONL shape (one record per line):
 *   {
 *     "at": "2026-04-18T17:25:00.123Z",
 *     "actor": "cli",                    // who caused the event
 *     "action": "task.checkout",         // dotted category.verb
 *     "teamId": "plan-abc" | null,       // team scope when relevant
 *     "target": { planId, taskId, agentId, ... },   // what was acted on
 *     "meta": { runId, status, ... }     // anything else useful
 *   }
 *
 * Tail, don't rotate. 1 KB per row × 10 events/day × 100 days ≈ 1 MB.
 * If we ever need retention, add a compaction command — don't invent
 * it until someone notices.
 */

import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { getStateDir } from './state.mjs'

const LOG_NAME = 'activity.jsonl'

function logPath() {
  return join(getStateDir(), LOG_NAME)
}

/**
 * Append one event. Silent on failure so a broken log can't block a
 * user action (same philosophy as our cloud-write wrappers).
 */
export function emitActivity(event) {
  try {
    const row = {
      at: new Date().toISOString(),
      actor: 'cli',
      ...event,
    }
    const dir = getStateDir()
    mkdirSync(dir, { recursive: true })
    appendFileSync(logPath(), JSON.stringify(row) + '\n', 'utf8')
  } catch {
    // Never surface a log write failure to the user — activity is
    // observability, not correctness.
  }
}

/**
 * Read the last N events, newest first. Returns [] if no log yet.
 * Tolerates malformed lines by skipping them — append-only logs are
 * supposed to survive a partial write.
 */
export function readActivity(limit = 50) {
  const path = logPath()
  if (!existsSync(path)) return []
  try {
    const raw = readFileSync(path, 'utf8')
    const lines = raw.trim().split('\n')
    const events = []
    // Walk from the end so we only parse what we need for large logs.
    for (let i = lines.length - 1; i >= 0 && events.length < limit; i--) {
      const line = lines[i].trim()
      if (!line) continue
      try {
        events.push(JSON.parse(line))
      } catch {
        // Skip malformed lines rather than aborting.
      }
    }
    return events
  } catch {
    return []
  }
}
