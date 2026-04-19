/**
 * Scenario: next-task
 *
 * Covers `designteam next <plan>` — the primitive Phase 2 execution
 * (skill template / adapter runner) uses to pick the next ready task.
 *
 *   - Returns the first `todo` task with no unresolved blockers.
 *   - Skips `in_progress` tasks (someone's on it).
 *   - Skips tasks whose blockers aren't all terminal.
 *   - Skips tasks with a live checkoutId (atomic lock held).
 *   - --id-only prints just the id, nothing else.
 *   - When no task is ready, --id-only exits 1 (so shell loops break cleanly).
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { withSandbox, assertEqual, assert } from '../harness.mjs'

const slug = 'next-task'

export async function run() {
  return withSandbox(slug, async ({ cli, cliExpectFail, sandboxPath }) => {
    const projectsDir = join(sandboxPath, '.designteam', 'projects')
    mkdirSync(projectsDir, { recursive: true })

    // Four tasks:
    //   t1 — in_progress (held), should be skipped
    //   t2 — todo, no blockers → this is next
    //   t3 — blocked by t1 (not terminal) → skipped
    //   t4 — todo but someone already holds the checkout → skipped
    const plan = {
      id: 'plan-next',
      description: 'next-task eval',
      createdAt: new Date().toISOString(),
      status: 'planning',
      tasks: [
        { id: 't1', agentRole: 'r', instruction: 'a', blockedByTaskIds: [], successCriteria: '', why: '', status: 'in_progress' },
        { id: 't2', agentRole: 'c', instruction: 'b', blockedByTaskIds: [], successCriteria: '', why: '', status: 'todo' },
        { id: 't3', agentRole: 'd', instruction: 'c', blockedByTaskIds: ['t1'], successCriteria: '', why: '', status: 'blocked' },
        { id: 't4', agentRole: 'e', instruction: 'd', blockedByTaskIds: [], successCriteria: '', why: '', status: 'todo', checkoutId: 'someone-else' },
      ],
    }
    writeFileSync(join(projectsDir, 'plan-next.json'), JSON.stringify(plan, null, 2), 'utf8')

    // --id-only path: should print exactly t2.
    const id = cli('next', 'plan-next', '--id-only')
    assertEqual(id, 't2', 'next ready task should be t2 (only unblocked + unclaimed todo)')

    // Default (human-readable) output: should include the task id + agent role.
    const out = cli('next', 'plan-next')
    assert(out.includes('t2'), 'human output should reference t2')
    assert(out.includes('[c]'), 'human output should reference the agent role')
    assert(out.includes('Claim:'), 'human output should hint at the checkout command')

    // Flip every task to done so nothing's ready, then --id-only must exit 1.
    const finished = { ...plan,
      tasks: plan.tasks.map((t) => ({ ...t, status: 'done', checkoutId: null })),
    }
    writeFileSync(join(projectsDir, 'plan-next.json'), JSON.stringify(finished, null, 2), 'utf8')

    const stderr = cliExpectFail('next', 'plan-next', '--id-only')
    assertEqual(stderr, '', '--id-only should exit 1 with no stderr when nothing is ready')

    // Default output should still be informative even with nothing ready.
    const emptyOut = cli('next', 'plan-next')
    assert(emptyOut.includes('No ready tasks'), 'default output should explain the empty state')
  })
}

run.slug = slug
