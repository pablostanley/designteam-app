/**
 * Scenario: run-end-to-end
 *
 * Covers `designteam run <plan> <task> --command=...`, the full
 * checkout → adapter → status transition → activity-log loop.
 *
 *   - Successful exit-0 command → task done, plan completed (if sole
 *     task), activity log records both task.checkout and task.run
 *     with outcome=done.
 *   - Non-zero exit → outcome=error, checkout released, status stays
 *     in_progress so a human / retry can take over.
 *
 * Uses a tiny seed team so the runner has an agent to resolve by role.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { withSandbox, assert, assertEqual } from '../harness.mjs'

const slug = 'run-end-to-end'

function seed(sandboxPath) {
  const stateDir = join(sandboxPath, '.designteam')
  const projectsDir = join(stateDir, 'projects')
  mkdirSync(projectsDir, { recursive: true })

  // Minimal team with one agent that matches the researcher role.
  const team = {
    id: 'team-run',
    short_id: 'team-run',
    name: 'run eval team',
    agents: [
      { id: 'agent-1', name: 'Scout', role: 'researcher' },
    ],
    createdAt: new Date().toISOString(),
  }
  writeFileSync(join(stateDir, 'team.json'), JSON.stringify(team, null, 2), 'utf8')

  const plan = {
    id: 'plan-run',
    description: 'run end-to-end',
    createdAt: new Date().toISOString(),
    status: 'planning',
    tasks: [
      {
        id: 't1',
        agentRole: 'researcher',
        instruction: 'research a thing',
        blockedByTaskIds: [],
        successCriteria: '',
        why: '',
        status: 'todo',
      },
    ],
  }
  writeFileSync(join(projectsDir, 'plan-run.json'), JSON.stringify(plan, null, 2), 'utf8')
}

export async function run() {
  // Success path.
  await withSandbox(`${slug}-ok`, async ({ cli, readJson, readJsonl, sandboxPath }) => {
    seed(sandboxPath)

    const out = cli('run', 'plan-run', 't1', '--command=printf %s ran-ok')
    assert(out.includes('t1 [researcher] → done'), 'run should report done outcome')
    assert(out.includes('ran-ok'), 'stdout should surface in the summary')
    assert(out.includes('plan complete'), 'single-task plan should bubble to completed')

    const stored = readJson('projects/plan-run.json')
    assertEqual(stored.tasks[0].status, 'done', 'task status should be done after run')
    assertEqual(stored.tasks[0].checkoutId, null, 'checkout should auto-release on terminal transition')
    assertEqual(stored.status, 'completed', 'plan should be completed')

    // Activity log shows both the checkout and the run, newest first.
    const events = readJsonl('activity.jsonl')
    const actions = events.map((e) => e.action)
    assert(actions.includes('task.run'), 'activity should include task.run')
    assert(actions.includes('task.checkout'), 'activity should include task.checkout')
    const runEvent = events.find((e) => e.action === 'task.run')
    assertEqual(runEvent.meta.outcome, 'done', 'run event meta should mark outcome=done')
    assertEqual(runEvent.meta.adapter, '@designteam/adapter-local-script', 'run event should name the adapter')
  })

  // Error path.
  await withSandbox(`${slug}-err`, async ({ cli, readJson, readJsonl, sandboxPath }) => {
    seed(sandboxPath)

    // Shell exits non-zero; the CLI exits non-zero too because we surface
    // the error, so use cliExpectFail? No — the CLI prints + returns the
    // outcome without aborting. Only a runner-thrown error aborts.
    const out = cli('run', 'plan-run', 't1', '--command=bash -c "exit 3"')
    assert(out.includes('→ error'), 'non-zero exit should report error outcome')

    const stored = readJson('projects/plan-run.json')
    assertEqual(stored.tasks[0].status, 'in_progress', 'error leaves task in_progress so operator decides next step')
    assertEqual(stored.tasks[0].checkoutId, null, 'error releases the checkout lock so another run can try')

    const events = readJsonl('activity.jsonl')
    const runEvent = events.find((e) => e.action === 'task.run')
    assertEqual(runEvent.meta.outcome, 'error', 'run event meta should mark outcome=error')
    assert(runEvent.meta.error, 'run event should include the error message')
  })
}

run.slug = slug
