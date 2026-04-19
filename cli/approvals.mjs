/**
 * Approvals — human checkpoints on top of the existing `in_review`
 * task status.
 *
 * No new storage. The plan lifecycle already has `in_review` as the
 * "paused, waiting on reviewer" state. Adapters or agents flip a
 * task to `in_review` (via `designteam progress --review` or by
 * returning `{ outcome: 'in_review' }` from executeTask) when the
 * next move belongs to a human.
 *
 * This module just makes the queue of `in_review` tasks discoverable
 * and adds explicit approve/reject commands that:
 *   - move the task to the right next state (done vs todo vs blocked)
 *   - emit a distinct activity event with the reviewer's comment so
 *     the audit trail is richer than a bare status change
 */

import { listPlans } from './plans.mjs'

/**
 * Scan every plan in .designteam/projects/ and return every task
 * currently in `in_review`. Each entry carries enough context for a
 * reviewer to decide without opening the plan file.
 */
export function listPendingApprovals() {
  const plans = listPlans()
  const pending = []
  for (const plan of plans) {
    for (const task of plan.tasks ?? []) {
      if (task.status !== 'in_review') continue
      pending.push({
        planId: plan.id,
        planDescription: plan.description,
        taskId: task.id,
        agentRole: task.agentRole,
        instruction: task.instruction,
        successCriteria: task.successCriteria,
        why: task.why,
        updatedAt: task.updatedAt ?? null,
      })
    }
  }
  // Oldest first — oldest submissions have been waiting the longest.
  pending.sort((a, b) => {
    if (!a.updatedAt || !b.updatedAt) return 0
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  })
  return pending
}
