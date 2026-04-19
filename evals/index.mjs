#!/usr/bin/env node

/**
 * Eval runner. Loads every scenario under scenarios/ and executes it.
 * Exits 0 when all pass, 1 otherwise. Pass a slug to run a single one:
 *
 *   node evals/index.mjs                 # all
 *   node evals/index.mjs plan-lifecycle  # just that one
 */

import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SCENARIOS_DIR = join(HERE, 'scenarios')

async function main() {
  const filter = process.argv[2] ?? null
  const files = readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith('.mjs')).sort()

  const scenarios = []
  for (const file of files) {
    const mod = await import(join(SCENARIOS_DIR, file))
    if (typeof mod.run !== 'function') {
      console.error(`  skip ${file}: no run() export`)
      continue
    }
    const slug = mod.run.slug ?? file.replace(/\.mjs$/, '')
    if (filter && filter !== slug) continue
    scenarios.push({ slug, run: mod.run })
  }

  if (scenarios.length === 0) {
    console.error(filter ? `No scenario named "${filter}".` : 'No scenarios found.')
    process.exit(1)
  }

  console.log()
  console.log(`  Running ${scenarios.length} eval${scenarios.length === 1 ? '' : 's'}...`)
  console.log()

  let failed = 0
  for (const { slug, run } of scenarios) {
    const started = Date.now()
    try {
      await run()
      const ms = Date.now() - started
      console.log(`  ✓ ${slug.padEnd(22)} ${ms}ms`)
    } catch (err) {
      failed++
      const ms = Date.now() - started
      console.log(`  ✗ ${slug.padEnd(22)} ${ms}ms`)
      console.log(`      ${err.message.replace(/\n/g, '\n      ')}`)
    }
  }

  console.log()
  if (failed > 0) {
    console.log(`  ${failed} eval${failed === 1 ? '' : 's'} failed.`)
    process.exit(1)
  }
  console.log(`  All evals passed.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
