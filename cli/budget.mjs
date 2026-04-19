/**
 * Budget ledger — append-only log of cost events + a simple monthly cap.
 *
 * Two files live in .designteam/:
 *   - budget.json   — the configured limit + period { usdCents, period }
 *   - budget.jsonl  — one row per spend event { at, usdCents, model, meta }
 *
 * Append-only (not a running total field) so we can always recompute from
 * events, which keeps the file debuggable by hand and resilient to partial
 * writes. Compaction is a later problem — 0.1 KB × a few hundred rows/month
 * is well under 1 MB.
 *
 * Default period is the current UTC calendar month — matches paperclip's
 * "monthly UTC window" model. `designteam budget reset` rolls it forward.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getStateDir } from './state.mjs'

const CONFIG_NAME = 'budget.json'
const LEDGER_NAME = 'budget.jsonl'

/** Fraction of the cap at which the runner starts nagging (but still runs). */
export const WARNING_THRESHOLD = 0.8

function configPath() { return join(getStateDir(), CONFIG_NAME) }
function ledgerPath() { return join(getStateDir(), LEDGER_NAME) }

/**
 * Load the current budget config, or a sensible default (no cap) if none.
 * `periodStart` is the ISO string marking when the current window began —
 * spend events before that date don't count against the cap.
 */
export function loadBudget() {
  const path = configPath()
  if (!existsSync(path)) {
    return { usdCents: null, periodStart: startOfUtcMonth(new Date()) }
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    return {
      usdCents: typeof raw.usdCents === 'number' ? raw.usdCents : null,
      periodStart: typeof raw.periodStart === 'string' ? raw.periodStart : startOfUtcMonth(new Date()),
    }
  } catch {
    return { usdCents: null, periodStart: startOfUtcMonth(new Date()) }
  }
}

function saveBudget(budget) {
  const dir = getStateDir()
  mkdirSync(dir, { recursive: true })
  writeFileSync(configPath(), JSON.stringify(budget, null, 2), 'utf8')
}

/** Set the USD cap for the current period. */
export function setLimit(usdCents) {
  if (!Number.isFinite(usdCents) || usdCents < 0) {
    throw new Error('setLimit expects a non-negative number of US cents')
  }
  const current = loadBudget()
  saveBudget({ ...current, usdCents: Math.round(usdCents) })
}

/** Clear the ledger and start a new period at the current UTC month. */
export function resetPeriod() {
  const current = loadBudget()
  saveBudget({ ...current, periodStart: startOfUtcMonth(new Date()) })
  try {
    writeFileSync(ledgerPath(), '', 'utf8')
  } catch { /* best-effort */ }
}

/**
 * Append one cost event. Silent on failure — same philosophy as the
 * activity log. A broken ledger must never block work; it just means
 * the budget check is stale until the next successful write.
 */
export function appendSpend(usdCents, meta = {}) {
  if (!Number.isFinite(usdCents) || usdCents < 0) return
  try {
    const dir = getStateDir()
    mkdirSync(dir, { recursive: true })
    const row = {
      at: new Date().toISOString(),
      usdCents: Math.round(usdCents),
      ...meta,
    }
    appendFileSync(ledgerPath(), JSON.stringify(row) + '\n', 'utf8')
  } catch {
    // swallow
  }
}

/**
 * Total spend since the period started, in US cents. Events before
 * `periodStart` are ignored so `resetPeriod()` wipes the window cleanly
 * without needing to delete the JSONL file (which we also do).
 */
export function getSpend() {
  const { periodStart } = loadBudget()
  const path = ledgerPath()
  if (!existsSync(path)) return 0
  try {
    const raw = readFileSync(path, 'utf8')
    const startMs = new Date(periodStart).getTime()
    let total = 0
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const row = JSON.parse(trimmed)
        if (!Number.isFinite(row.usdCents)) continue
        if (new Date(row.at).getTime() < startMs) continue
        total += row.usdCents
      } catch {
        // skip malformed line
      }
    }
    return total
  } catch {
    return 0
  }
}

/**
 * True when a cap is set and the period's spend meets or exceeds it.
 * No cap ⇒ always false (opt-in protection).
 */
export function isOverBudget() {
  const { usdCents } = loadBudget()
  if (usdCents === null || usdCents === undefined) return false
  return getSpend() >= usdCents
}

/**
 * Evaluate the current budget state: 'ok' | 'warn' | 'over' | 'unset'.
 * 'warn' kicks in at WARNING_THRESHOLD (80%) so the runner can nag
 * before it trips. 'unset' distinguishes "no cap" from "zero spend
 * against a cap" — the runner uses it to skip the warning entirely.
 */
export function getBudgetStatus() {
  const { usdCents } = loadBudget()
  const spent = getSpend()
  if (usdCents === null || usdCents === undefined) {
    return { state: 'unset', spent, limit: null, pctUsed: 0 }
  }
  const pctUsed = usdCents > 0 ? spent / usdCents : 0
  let state = 'ok'
  if (spent >= usdCents) state = 'over'
  else if (pctUsed >= WARNING_THRESHOLD) state = 'warn'
  return { state, spent, limit: usdCents, pctUsed }
}

function startOfUtcMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString()
}
