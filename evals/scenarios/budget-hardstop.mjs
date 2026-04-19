/**
 * Scenario: budget-hardstop
 *
 * Covers the `designteam budget` subcommand + the runner's pre-flight
 * check. When a cap is set and the period's spend meets it, `designteam
 * run` must refuse to dispatch (no checkout, no execution) and the
 * error message must name the cap + current spend.
 *
 * Also verifies the happy paths:
 *   - show defaults to "no cap" on a fresh sandbox
 *   - set --usd=5 then show echoes the cap
 *   - reset wipes the ledger so a previously tripped cap un-trips
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { withSandbox, assert, assertEqual } from '../harness.mjs'

const slug = 'budget-hardstop'

function seed(sandboxPath) {
  const stateDir = join(sandboxPath, '.designteam')
  const projectsDir = join(stateDir, 'projects')
  mkdirSync(projectsDir, { recursive: true })

  const team = {
    id: 'team-budget',
    short_id: 'team-budget',
    name: 'budget eval team',
    agents: [
      { id: 'agent-1', name: 'Scout', role: 'researcher' },
    ],
    createdAt: new Date().toISOString(),
  }
  writeFileSync(join(stateDir, 'team.json'), JSON.stringify(team, null, 2), 'utf8')

  const plan = {
    id: 'plan-budget',
    description: 'budget test',
    createdAt: new Date().toISOString(),
    status: 'planning',
    tasks: [
      {
        id: 't1',
        agentRole: 'researcher',
        instruction: 'r',
        blockedByTaskIds: [],
        successCriteria: '',
        why: '',
        status: 'todo',
      },
    ],
  }
  writeFileSync(join(projectsDir, 'plan-budget.json'), JSON.stringify(plan, null, 2), 'utf8')
}

export async function run() {
  await withSandbox(slug, async ({ cli, cliExpectFail, readJson, sandboxPath }) => {
    seed(sandboxPath)

    // --- show defaults to "No cap set"
    const initial = cli('budget', 'show')
    assert(initial.includes('No cap set'), 'fresh sandbox should report no cap')

    // --- set a cap
    const set = cli('budget', 'set', '--usd=1')
    assert(set.includes('$1.00'), 'set should echo the new cap')

    // --- show after set reports the cap + 0% spent
    const afterSet = cli('budget', 'show')
    assert(afterSet.includes('Cap:    $1.00'), 'show should display the cap')
    assert(afterSet.includes('Spent:  $0.00'), 'spent should start at zero')
    assert(afterSet.includes('Status: OK'), 'status should be OK with zero spend')

    // --- manually seed a ledger entry over the cap to simulate prior spend.
    // Simpler than running an adapter that reports cost for this eval.
    const ledgerPath = join(sandboxPath, '.designteam', 'budget.jsonl')
    writeFileSync(
      ledgerPath,
      JSON.stringify({ at: new Date().toISOString(), usdCents: 150 }) + '\n',
      'utf8',
    )

    const afterSpend = cli('budget', 'show')
    assert(afterSpend.includes('Status: OVER'), 'status should flip to OVER when ledger > cap')

    // --- run should now refuse
    const stderr = cliExpectFail('run', 'plan-budget', 't1', '--command=echo nope')
    assert(stderr.includes('Budget cap reached'), 'runner should refuse with the budget message')
    assert(stderr.includes('$1.00'), 'error message should name the cap')
    assert(stderr.includes('$1.50'), 'error message should name the current spend')

    // --- verify the task stayed in todo (no checkout happened)
    const stored = readJson('projects/plan-budget.json')
    assertEqual(stored.tasks[0].status, 'todo', 'pre-flight check must not mutate task state')
    assertEqual(stored.tasks[0].checkoutId ?? null, null, 'no checkout should have been claimed')

    // --- reset clears the ledger and un-trips the cap
    cli('budget', 'reset')
    const afterReset = cli('budget', 'show')
    assert(afterReset.includes('Status: OK'), 'reset should clear spend and restore OK status')
  })
}

run.slug = slug
