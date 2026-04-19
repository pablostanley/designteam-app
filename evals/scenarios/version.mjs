/**
 * Scenario: version
 *
 * `designteam --version` / `-v` must print the CLI's package.json
 * version and exit 0. Standard CLI convention; catches accidental
 * regressions from future dispatch-order changes.
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { withSandbox, assertEqual } from '../harness.mjs'

const slug = 'version'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT_PKG = JSON.parse(readFileSync(join(HERE, '..', '..', 'package.json'), 'utf8'))

export async function run() {
  await withSandbox(`${slug}-long-flag`, async ({ cli }) => {
    assertEqual(cli('--version'), ROOT_PKG.version, '--version should print package.json version')
  })
  await withSandbox(`${slug}-short-flag`, async ({ cli }) => {
    assertEqual(cli('-v'), ROOT_PKG.version, '-v should match --version')
  })
}

run.slug = slug
