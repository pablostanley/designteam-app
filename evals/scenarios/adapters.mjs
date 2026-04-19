/**
 * Scenario: adapters
 *
 * Covers `designteam adapters` — the "what can I dispatch to?" lookup.
 *
 * Baseline registration is unconditional for adapter-claude-cli (the
 * subprocess spawn will surface a clear error at run time if `claude`
 * isn't actually on PATH, so we don't gate on a `which claude` probe).
 *
 * API-key-gated adapters (anthropic-api, efecto) only appear in the
 * list when the corresponding env var is set — this matches the
 * runner's "register if we can build, else silently skip" behavior.
 */

import { withSandbox, assert } from '../harness.mjs'

const slug = 'adapters'

export async function run() {
  await withSandbox(`${slug}-baseline`, async ({ cli }) => {
    const out = cli('adapters')
    assert(out.includes('Adapters'), 'output should start with header')
    assert(out.includes('@designteam/adapter-claude-cli'), 'claude-cli registers unconditionally')
    assert(out.includes('Dispatch via'), 'footer should document how to use an id')
    assert(out.includes('--command='), 'footer should mention the ephemeral local-script path')
  })

  // With ANTHROPIC_API_KEY set the anthropic-api adapter self-registers.
  // withSandbox's cli() re-spawns node, so env mutations on this process
  // propagate into the child process automatically.
  process.env.ANTHROPIC_API_KEY = 'test-key-for-eval'
  try {
    await withSandbox(`${slug}-with-anthropic`, async ({ cli }) => {
      const out = cli('adapters')
      assert(out.includes('@designteam/adapter-anthropic-api'), 'anthropic registers when key is set')
    })
  } finally {
    delete process.env.ANTHROPIC_API_KEY
  }

  process.env.EFECTO_API_KEY = 'test-efecto-key'
  try {
    await withSandbox(`${slug}-with-efecto`, async ({ cli }) => {
      const out = cli('adapters')
      assert(out.includes('@designteam/adapter-efecto'), 'efecto registers when key is set')
    })
  } finally {
    delete process.env.EFECTO_API_KEY
  }
}

run.slug = slug
