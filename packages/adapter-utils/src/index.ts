/**
 * @designteam/adapter-utils
 *
 * Shared types and registry helpers every Design Team adapter uses.
 * See `adapter-plugin.md` at the monorepo root for the full spec.
 *
 * This package is intentionally thin — its job is to be the **contract**
 * between the Design Team control plane and any runtime adapter
 * (claude-local, cursor-local, codex-local, gemini-local, efecto, ...).
 *
 * The package has no heavy runtime dependencies. Adapters bring their
 * own SDKs. That way a user who installs `@designteam/adapter-efecto`
 * doesn't pay the cost of pulling `@anthropic-ai/sdk` just because
 * another adapter uses it.
 */

import type {
  Agent,
  Team,
  TeamMemory,
  UserProfile,
} from '@designteam/core'

// ---------------------------------------------------------------------------
// Plan types the adapter receives at `executeTask`
// ---------------------------------------------------------------------------

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'done'
  | 'blocked'
  | 'cancelled'

/**
 * The shape of a single task inside a plan. Mirrors what lives on disk
 * at `.designteam/projects/<plan-id>.json`. Kept here (and not in core)
 * because plans are a control-plane concept, not a personality-engine one.
 */
export interface PlanTask {
  id: string
  agentRole: string
  instruction: string
  /** IDs of tasks that must reach a terminal state before this one can start. */
  blockedByTaskIds: string[]
  /** Optional structural parent — work breakdown only, never implicit blocker. */
  parentTaskId?: string
  successCriteria: string
  why: string
  status: TaskStatus
  /** Present while a run holds the atomic checkout lock. */
  checkoutId?: string | null
  updatedAt?: string
}

export interface Plan {
  id: string
  description: string
  createdAt: string
  status: 'planning' | 'running' | 'completed' | 'cancelled'
  tasks: PlanTask[]
}

// ---------------------------------------------------------------------------
// Adapter contract
// ---------------------------------------------------------------------------

/**
 * Everything an adapter needs to execute one task.
 *
 * The host fills this in before calling `executeTask`. Adapters should
 * treat every field as read-only — writes go back through the control
 * plane (`designteam progress` / `checkout` / `release`), not by mutating
 * this context.
 */
export interface TaskContext {
  plan: Plan
  task: PlanTask
  team: Team
  agent: Agent
  teamMemory: TeamMemory
  userProfile: UserProfile

  /** Unique ID for this run. Adapters must assume concurrent runs exist. */
  runId: string

  /** Aborted when the host wants the run to stop (cancelled / stranded). */
  signal: AbortSignal
}

export type TaskResult =
  | { outcome: 'done'; summary: string; artifacts?: TaskArtifact[] }
  | { outcome: 'in_review'; summary: string; artifacts?: TaskArtifact[]; reviewerHint?: string }
  | { outcome: 'blocked'; summary: string; blockerReason: string }
  | { outcome: 'cancelled'; summary: string; reason: string }
  | { outcome: 'error'; message: string; cause?: unknown }

export interface TaskArtifact {
  /** Short human-readable label for logs and UI. */
  label: string
  /** Arbitrary kind string — adapters agree on the vocabulary. */
  kind: string
  /** Inline payload for small results. Adapters with larger outputs should use `uri`. */
  content?: string
  /** URI to external storage (e.g. Supabase object bucket, Vercel Blob). */
  uri?: string
}

export interface CostReport {
  /** e.g. 'anthropic:claude-sonnet-4-6'. Lets the host roll up per provider/model. */
  model: string
  inputTokens: number
  outputTokens: number
  /** Dollar cost if the adapter can compute it; otherwise leave null and the host estimates. */
  usdCents?: number
}

/**
 * The single interface every Design Team adapter implements.
 *
 * An adapter is always invoked with a task the host has already checked
 * out — the `runId` in context matches `task.checkoutId`. Adapters
 * never move tasks between statuses directly; they return a `TaskResult`
 * and the host applies the transition.
 */
export interface TaskAdapter {
  /** Stable unique identifier. The npm package name is a good default. */
  id: string

  /** Human-readable name for UI and log output. */
  name: string

  /** Semver for the adapter itself, used for compatibility messaging. */
  version: string

  executeTask(ctx: TaskContext): Promise<TaskResult>

  /** Optional — report token/cost usage so budget enforcement can trip. */
  reportCost?(ctx: TaskContext, result: TaskResult): Promise<CostReport>

  /** Optional — called periodically to keep the heartbeat alive. No-op by default. */
  heartbeat?(ctx: TaskContext): void
}

// ---------------------------------------------------------------------------
// Registry — mutable, paperclip-style
// ---------------------------------------------------------------------------

/**
 * Adapter registry. Mutable so third-party packages can call
 * `registerAdapter(theirAdapter)` from their entrypoint and get picked
 * up without any shared-schema PR on the host repo.
 *
 * Host code should call `resolveAdapter(id)` when it needs to dispatch
 * a task. Listing for UI happens via `listAdapters()`.
 */
const REGISTRY = new Map<string, TaskAdapter>()

export function registerAdapter(adapter: TaskAdapter): void {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('registerAdapter requires a TaskAdapter object')
  }
  if (typeof adapter.id !== 'string' || !adapter.id) {
    throw new Error('Adapter.id must be a non-empty string')
  }
  if (typeof adapter.executeTask !== 'function') {
    throw new Error(`Adapter "${adapter.id}" must implement executeTask()`)
  }
  REGISTRY.set(adapter.id, adapter)
}

export function unregisterAdapter(id: string): void {
  REGISTRY.delete(id)
}

export function resolveAdapter(id: string): TaskAdapter | null {
  return REGISTRY.get(id) ?? null
}

export function listAdapters(): TaskAdapter[] {
  return [...REGISTRY.values()]
}

/** Convenience for tests + scenarios that need a clean slate. */
export function clearAdapters(): void {
  REGISTRY.clear()
}
