/**
 * Scenario: plan-lifecycle
 *
 * Covers:
 *  - Seeding a plan on disk (Haiku bypass — we want to test the runner,
 *    not the AI call).
 *  - Atomic checkout: first claim wins, second from a different run fails.
 *  - Progress to `done` auto-unblocks downstream tasks whose deps are now
 *    terminal.
 *  - All tasks terminal → plan.status bubbles to `completed`.
 *  - Activity log captures the full sequence (plan skipped — no plan.created
 *    since we seeded by hand — but task.checkout + task.status_change land).
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { withSandbox, assert, assertEqual, assertIncludes } from '../harness.mjs'

const slug = 'plan-lifecycle'

export async function run() {
  return withSandbox(slug, async ({ cli, cliExpectFail, readJson, readJsonl, sandboxPath }) => {
    // Seed: a minimal two-task plan with t2 blocked on t1. Status is
    // `blocked` on t2 from the start so we can verify auto-unblock fires.
    const projectsDir = join(sandboxPath, '.designteam', 'projects')
    mkdirSync(projectsDir, { recursive: true })
    const plan = {
      id: 'plan-lx',
      description: 'plan-lifecycle eval',
      createdAt: new Date().toISOString(),
      status: 'planning',
      tasks: [
        { id: 't1', agentRole: 'researcher', instruction: 'r', dependencies: [], successCriteria: '', why: '', status: 'todo' },
        { id: 't2', agentRole: 'copywriter', instruction: 'c', dependencies: ['t1'], successCriteria: '', why: '', status: 'blocked' },
      ],
    }
    writeFileSync(join(projectsDir, 'plan-lx.json'), JSON.stringify(plan, null, 2), 'utf8')

    // Atomic checkout — first claim wins.
    cli('checkout', 'plan-lx', 't1', '--run=runA')
    let saved = readJson('projects/plan-lx.json')
    assertEqual(saved.tasks[0].status, 'in_progress', 't1 should be in_progress after checkout')
    assertEqual(saved.tasks[0].checkoutId, 'runA', 't1 should be held by runA')

    // Second checkout from a different runner must fail cleanly.
    const stderr = cliExpectFail('checkout', 'plan-lx', 't1', '--run=runB')
    assert(stderr.includes('already held by run runA'), 'should report the holder')

    // Finish t1 — t2 should auto-unblock.
    cli('progress', 'plan-lx', 't1', '--done')
    saved = readJson('projects/plan-lx.json')
    assertEqual(saved.tasks[0].status, 'done', 't1 should be done')
    assertEqual(saved.tasks[0].checkoutId, null, 'terminal transition should release the checkout')
    assertEqual(saved.tasks[1].status, 'todo', 't2 should auto-unblock to todo')

    // Finish t2 — plan bubbles to completed.
    cli('progress', 'plan-lx', 't2', '--done')
    saved = readJson('projects/plan-lx.json')
    assertEqual(saved.status, 'completed', 'plan should be completed when all tasks terminal')

    // Activity log captures every mutation.
    const events = readJsonl('activity.jsonl')
    const actions = events.map((e) => e.action)
    assertIncludes(actions, 'task.checkout', 'activity should include checkout')
    assertIncludes(actions, 'task.status_change', 'activity should include status change')
    // Newest-first ordering: the final status_change (t2 → done, plan-complete)
    // should be index 0 in the reversed log.
    const newest = events[0]
    assertEqual(newest.action, 'task.status_change', 'newest event should be t2 transition')
    assertEqual(newest.target.taskId, 't2', 'newest event should reference t2')
    assertEqual(newest.meta.planCompleted, true, 'newest event should flag plan-complete')
  })
}

run.slug = slug
