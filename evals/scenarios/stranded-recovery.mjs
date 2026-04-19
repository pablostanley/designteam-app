/**
 * Scenario: stranded-recovery
 *
 * Covers `designteam recover <plan>`. Simulates a runner that died
 * mid-task (in_progress + old updatedAt + leftover checkoutId) and
 * verifies the recovery command:
 *   - Lists stranded tasks sorted oldest-first.
 *   - --dry-run is non-destructive (no plan mutation).
 *   - Real run releases checkouts, resets status to todo, emits
 *     task.recovered activity with the prior checkoutId + stale
 *     threshold in meta.
 *   - Fresh in_progress tasks (recent updatedAt) aren't touched.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { withSandbox, assert, assertEqual } from '../harness.mjs'

const slug = 'stranded-recovery'

function seed(sandboxPath, { stranded = true } = {}) {
  const projectsDir = join(sandboxPath, '.designteam', 'projects')
  mkdirSync(projectsDir, { recursive: true })

  const now = Date.now()
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString()
  const oneMinAgo = new Date(now - 60 * 1000).toISOString()

  const plan = {
    id: 'plan-rec',
    description: 'recovery eval',
    createdAt: new Date().toISOString(),
    status: 'planning',
    tasks: [
      {
        id: 't-dead',
        agentRole: 'researcher',
        instruction: 'abandoned task',
        blockedByTaskIds: [],
        successCriteria: '',
        why: '',
        status: 'in_progress',
        checkoutId: 'runner-that-died',
        updatedAt: stranded ? oneHourAgo : oneMinAgo,
      },
      {
        id: 't-fresh',
        agentRole: 'copywriter',
        instruction: 'recently claimed',
        blockedByTaskIds: [],
        successCriteria: '',
        why: '',
        status: 'in_progress',
        checkoutId: 'runner-still-going',
        updatedAt: oneMinAgo,
      },
    ],
  }
  writeFileSync(join(projectsDir, 'plan-rec.json'), JSON.stringify(plan, null, 2), 'utf8')
}

export async function run() {
  await withSandbox(slug, async ({ cli, readJson, readJsonl, sandboxPath }) => {
    seed(sandboxPath)

    // --- dry-run lists the stranded task without touching state
    const dryOut = cli('recover', 'plan-rec', '--stale-minutes=30', '--dry-run')
    assert(dryOut.includes('1 stranded task'), 'dry-run should identify the stranded task')
    assert(dryOut.includes('t-dead'), 'dry-run should name t-dead')
    assert(!dryOut.includes('t-fresh'), 'fresh task should not be flagged')
    assert(dryOut.includes('no changes written'), 'dry-run should advertise its non-destructiveness')

    const planBeforeLive = readJson('projects/plan-rec.json')
    assertEqual(planBeforeLive.tasks[0].status, 'in_progress', 'dry-run must not mutate state')
    assertEqual(planBeforeLive.tasks[0].checkoutId, 'runner-that-died', 'dry-run must not release the checkout')

    // --- real run resets t-dead, leaves t-fresh alone
    const realOut = cli('recover', 'plan-rec', '--stale-minutes=30')
    assert(realOut.includes('Reset 1 task'), 'real run should confirm reset count')

    const planAfter = readJson('projects/plan-rec.json')
    const dead = planAfter.tasks.find((t) => t.id === 't-dead')
    const fresh = planAfter.tasks.find((t) => t.id === 't-fresh')
    assertEqual(dead.status, 'todo', 'stranded task should be back to todo')
    assertEqual(dead.checkoutId, null, 'stranded task checkout should be released')
    assertEqual(fresh.status, 'in_progress', 'fresh task should be untouched')
    assertEqual(fresh.checkoutId, 'runner-still-going', 'fresh task lock should be preserved')

    // --- activity log captures the recovery
    const events = readJsonl('activity.jsonl')
    const recovered = events.find((e) => e.action === 'task.recovered')
    assert(recovered, 'activity should include task.recovered')
    assertEqual(recovered.target.taskId, 't-dead', 'recovery event should reference t-dead')
    assertEqual(recovered.meta.prevCheckoutId, 'runner-that-died', 'meta should preserve the prior checkoutId for forensics')
    assertEqual(recovered.meta.staleMinutes, 30, 'meta should record the threshold that tripped')

    // --- running again is a no-op (t-fresh is still fresh, t-dead is back to todo)
    const again = cli('recover', 'plan-rec', '--stale-minutes=30')
    assert(again.includes('No stranded tasks'), 'second run should find nothing stranded')
  })
}

run.slug = slug
