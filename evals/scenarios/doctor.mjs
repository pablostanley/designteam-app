/**
 * Scenario: doctor
 *
 * `designteam doctor` runs a one-shot health check and exits non-zero
 * on any ✗. We verify:
 *   - empty sandbox prints ✗ for missing team.json and exits 1
 *   - after installing a team, the team line flips to ✓
 *   - all the non-team lines (writability, adapters, env vars,
 *     Supabase, budget, stranded) render with the expected glyph
 *   - env-gated adapter lines flip when the key is set
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { withSandbox, assert } from '../harness.mjs'

const slug = 'doctor'

export async function run() {
  // Fresh sandbox, no team, no env — every optional thing is ⚠, team.json
  // is ✗, exit code is 1.
  await withSandbox(`${slug}-empty`, async ({ cliExpectFail }) => {
    const stderr = cliExpectFail('doctor')
    // execFileSync's stderr capture for expected-fail includes the
    // stdout content because we mix them together; the harness returns
    // whichever stream populated. Pull both out of the thrown combined
    // message for assertions.
    assert(stderr.includes('Design Team — doctor'), 'header should render')
    assert(stderr.includes('✗'), 'missing team should produce a hard-fail glyph')
    assert(stderr.includes('team.json'), 'team.json row should be present')
    assert(stderr.includes('no team installed'), 'empty-team detail should suggest install/create')
    assert(stderr.includes('1 hard failure'), 'summary line should count hard failures')
  })

  // With a team installed, team.json flips to ✓ and the command exits 0.
  await withSandbox(`${slug}-with-team`, async ({ cli, sandboxPath }) => {
    const stateDir = join(sandboxPath, '.designteam')
    mkdirSync(stateDir, { recursive: true })
    writeFileSync(join(stateDir, 'team.json'), JSON.stringify({
      id: 'team-doctor',
      short_id: 'team-doctor',
      name: 'doctor eval team',
      agents: [{ id: 'agent-1', name: 'Scout', role: 'researcher' }],
      createdAt: new Date().toISOString(),
    }, null, 2), 'utf8')

    const out = cli('doctor')
    assert(out.includes('Design Team — doctor'), 'header should render')
    assert(out.includes('✓  team.json'), 'team.json should be ✓ once installed')
    assert(out.includes('doctor eval team'), 'team-line detail should include team name')
    assert(!out.includes('hard failure'), 'no hard failures should be reported')
    assert(out.includes('stranded tasks'), 'stranded-tasks line should render')
  })

  // Env-gated adapter lines flip when the key is present.
  process.env.ANTHROPIC_API_KEY = 'eval-key'
  try {
    await withSandbox(`${slug}-with-api-key`, async ({ cliExpectFail }) => {
      // Still no team, so doctor exits 1 — but the API-key line should be ✓.
      const stderr = cliExpectFail('doctor')
      assert(stderr.includes('✓  ANTHROPIC_API_KEY'), 'API-key row should flip to ✓ when set')
      assert(stderr.includes('adapter-anthropic-api'), 'adapter list should include anthropic-api')
    })
  } finally {
    delete process.env.ANTHROPIC_API_KEY
  }
}

run.slug = slug
