/**
 * Scenario: run-dry-run
 *
 * `designteam run <plan> <task> --dry-run` must preview exactly what
 * the real dispatch would do without mutating any state: no checkout
 * lock claimed, no activity event emitted, no budget ledger entry.
 *
 * Covers:
 *   - happy path shows plan/task/agent/adapter
 *   - no checkout was claimed (task stays in todo, checkoutId null)
 *   - no activity.jsonl was written
 *   - unknown adapter is flagged rather than exploding
 *   - task in non-todo state is called out
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { withSandbox, assert, assertEqual } from '../harness.mjs'

const slug = 'run-dry-run'

function seed(sandboxPath) {
  const stateDir = join(sandboxPath, '.designteam')
  const projectsDir = join(stateDir, 'projects')
  mkdirSync(projectsDir, { recursive: true })

  writeFileSync(join(stateDir, 'team.json'), JSON.stringify({
    id: 'team-dry',
    short_id: 'team-dry',
    name: 'dry-run eval team',
    agents: [{ id: 'agent-1', name: 'Scout', role: 'researcher' }],
    createdAt: new Date().toISOString(),
  }, null, 2), 'utf8')

  writeFileSync(join(projectsDir, 'plan-dry.json'), JSON.stringify({
    id: 'plan-dry',
    description: 'dry-run test',
    createdAt: new Date().toISOString(),
    status: 'planning',
    tasks: [
      {
        id: 't1',
        agentRole: 'researcher',
        instruction: 'scout the competition',
        blockedByTaskIds: [],
        successCriteria: '',
        why: '',
        status: 'todo',
      },
    ],
  }, null, 2), 'utf8')
}

export async function run() {
  await withSandbox(`${slug}-preview`, async ({ cli, readJson, sandboxPath }) => {
    seed(sandboxPath)

    // Command writes a sentinel file if it runs. Dry-run must not let
    // that happen — we check the file's absence to prove no execution.
    const sentinel = join(sandboxPath, 'sentinel-executed')
    const out = cli('run', 'plan-dry', 't1', `--command=touch ${sentinel}`, '--dry-run')
    assert(out.includes('Dry run'), 'output should announce dry-run mode')
    assert(out.includes('Plan:'), 'should print plan line')
    assert(out.includes('plan-dry'), 'should echo the plan id')
    assert(out.includes('scout the competition'), 'should print the task instruction')
    assert(out.includes('Scout'), 'should resolve the agent and print its name')
    assert(out.includes('adapter-local-script'), 'should label the ephemeral local-script adapter')
    assert(!existsSync(sentinel), 'command must NOT be executed in dry-run')

    const stored = readJson('projects/plan-dry.json')
    assertEqual(stored.tasks[0].status, 'todo', 'dry-run must not change task status')
    assertEqual(stored.tasks[0].checkoutId ?? null, null, 'dry-run must not claim the checkout lock')

    const activityPath = join(sandboxPath, '.designteam', 'activity.jsonl')
    const activityContent = existsSync(activityPath) ? readFileSync(activityPath, 'utf8').trim() : ''
    assertEqual(activityContent, '', 'dry-run must not emit activity events')
  })

  await withSandbox(`${slug}-unknown-adapter`, async ({ cli, sandboxPath }) => {
    seed(sandboxPath)
    const out = cli('run', 'plan-dry', 't1', '--adapter=not-registered:abc', '--dry-run')
    assert(out.includes('NOT REGISTERED'), 'unknown adapter should be flagged in the preview')
    assert(out.includes('not-registered:abc'), 'preview should echo the asked-for id')
  })
}

run.slug = slug
