/**
 * Scenario: approval-gates
 *
 * Covers the human-checkpoint surface on top of the existing
 * in_review task state:
 *   - `designteam approvals` lists pending in_review tasks across
 *     every plan, oldest first.
 *   - `designteam approve <plan> <task> --comment="..."` flips
 *     in_review → done, auto-unblocks dependents, logs a distinct
 *     task.approved activity event with the comment.
 *   - `designteam reject <plan> <task> --reason="..."` flips
 *     in_review → todo by default (for re-work), logs task.rejected
 *     with the reason.
 *   - `--block` variant sends rejection to `blocked` instead.
 *   - Commands refuse when the task isn't in_review in the first place.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { withSandbox, assert, assertEqual } from '../harness.mjs'

const slug = 'approval-gates'

function seed(sandboxPath) {
  const stateDir = join(sandboxPath, '.designteam')
  const projectsDir = join(stateDir, 'projects')
  mkdirSync(projectsDir, { recursive: true })

  // Two plans so we can test cross-plan listing. Each with one task in
  // in_review so `approvals` should find both.
  const plans = [
    {
      id: 'plan-a',
      description: 'plan a',
      createdAt: new Date().toISOString(),
      status: 'planning',
      tasks: [
        {
          id: 't1',
          agentRole: 'researcher',
          instruction: 'draft competitive analysis',
          blockedByTaskIds: [],
          successCriteria: 'three named competitors with differentiators',
          why: '',
          status: 'in_review',
          updatedAt: '2026-04-18T00:00:00Z',
        },
      ],
    },
    {
      id: 'plan-b',
      description: 'plan b',
      createdAt: new Date().toISOString(),
      status: 'planning',
      tasks: [
        {
          id: 't1',
          agentRole: 'copywriter',
          instruction: 'land-page headline drafts',
          blockedByTaskIds: [],
          successCriteria: '',
          why: '',
          status: 'in_review',
          updatedAt: '2026-04-18T01:00:00Z',
        },
        {
          id: 't2',
          agentRole: 'researcher',
          instruction: 'post-headline audience test',
          blockedByTaskIds: ['t1'],
          successCriteria: '',
          why: '',
          status: 'blocked',
        },
      ],
    },
  ]
  for (const plan of plans) {
    writeFileSync(join(projectsDir, `${plan.id}.json`), JSON.stringify(plan, null, 2), 'utf8')
  }
}

export async function run() {
  await withSandbox(slug, async ({ cli, cliExpectFail, readJson, readJsonl, sandboxPath }) => {
    seed(sandboxPath)

    // --- List surfaces both plans, oldest first (plan-a's updatedAt is earlier)
    const list = cli('approvals')
    assert(list.includes('2 pending approval'), 'should count both in_review tasks')
    const planAIdx = list.indexOf('plan-a')
    const planBIdx = list.indexOf('plan-b')
    assert(planAIdx > -1 && planBIdx > -1, 'both plans should appear')
    assert(planAIdx < planBIdx, 'oldest (plan-a) should appear before plan-b')

    // --- Approve with a comment. Task should flip to done + activity event logged.
    const approveOut = cli('approve', 'plan-a', 't1', '--comment=ship it')
    assert(approveOut.includes('approved'), 'approve output should confirm')
    assert(approveOut.includes('ship it'), 'approve output should echo the comment')

    const planA = readJson('projects/plan-a.json')
    assertEqual(planA.tasks[0].status, 'done', 'approval should flip task to done')
    assertEqual(planA.status, 'completed', 'sole-task plan should bubble to completed')

    const events1 = readJsonl('activity.jsonl')
    const approvedEv = events1.find((e) => e.action === 'task.approved')
    assert(approvedEv, 'activity should include task.approved')
    assertEqual(approvedEv.meta.comment, 'ship it', 'activity should carry the comment')

    // --- Reject plan-b t1 with a reason. Default behavior: send back to todo.
    const rejectOut = cli('reject', 'plan-b', 't1', '--reason=headlines too long')
    assert(rejectOut.includes('rejected → todo'), 'reject default goes to todo for re-work')

    const planB = readJson('projects/plan-b.json')
    assertEqual(planB.tasks[0].status, 'todo', 'rejected task defaults to todo')
    // t2 was blocked on t1 and t1 is no longer terminal, so t2 stays blocked.
    assertEqual(planB.tasks[1].status, 'blocked', 't2 should stay blocked since t1 is not terminal')

    const events2 = readJsonl('activity.jsonl')
    const rejectedEv = events2.find((e) => e.action === 'task.rejected')
    assert(rejectedEv, 'activity should include task.rejected')
    assertEqual(rejectedEv.meta.reason, 'headlines too long', 'activity should carry the reason')
    assertEqual(rejectedEv.meta.nextStatus, 'todo', 'activity should record the next status')

    // --- Now list should be empty (both approvals resolved)
    const emptyList = cli('approvals')
    assert(emptyList.includes('No pending approvals'), 'list should be empty after resolve')

    // --- Approve/reject refuse when task isn't in_review
    const notInReview = cliExpectFail('approve', 'plan-a', 't1')
    assert(notInReview.includes('not in_review'), 'approve should refuse on non-in_review tasks')
  })
}

run.slug = slug
