/**
 * Eval harness — sandbox + assertion helpers shared across scenarios.
 *
 * Each scenario gets a fresh temp directory to own `.designteam/` state,
 * so one eval can't leak state into another. Scenarios call the CLI via
 * `execFileSync` with the sandbox as cwd.
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const CLI_PATH = join(HERE, '..', 'cli', 'index.mjs')

/**
 * Run a scenario inside a throwaway sandbox.
 *
 * Exposes a small API to the scenario:
 *   cli(...args)         run the CLI in the sandbox, returns trimmed stdout
 *   cliExpectFail(...args) run the CLI expecting non-zero exit, returns stderr
 *   readJson(rel)        parse a JSON file under .designteam/
 *   readJsonl(rel)       parse a JSONL file under .designteam/, newest-first
 *   sandboxPath          the absolute sandbox path (for debugging)
 *
 * Returns whatever the scenario function returns, but always cleans up.
 */
export async function withSandbox(scenarioName, fn) {
  const dir = mkdtempSync(join(tmpdir(), `dt-eval-${scenarioName}-`))
  const api = {
    sandboxPath: dir,
    cli(...args) {
      try {
        return execFileSync(process.execPath, [CLI_PATH, ...args], {
          cwd: dir,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }).trim()
      } catch (err) {
        const combined = [err.stdout, err.stderr].filter(Boolean).join('\n')
        throw new Error(`CLI failed (${args.join(' ')}):\n${combined}`)
      }
    },
    cliExpectFail(...args) {
      try {
        const out = execFileSync(process.execPath, [CLI_PATH, ...args], {
          cwd: dir,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        throw new Error(`expected CLI to fail but it succeeded:\n${out}`)
      } catch (err) {
        // execFileSync throws on non-zero exit — return stderr so the
        // scenario can assert on the message.
        if (err.status && err.status !== 0) {
          return (err.stderr ?? '').toString().trim()
        }
        throw err
      }
    },
    readJson(rel) {
      const path = join(dir, '.designteam', rel)
      if (!existsSync(path)) return null
      return JSON.parse(readFileSync(path, 'utf8'))
    },
    readJsonl(rel) {
      const path = join(dir, '.designteam', rel)
      if (!existsSync(path)) return []
      return readFileSync(path, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .reverse()
    },
  }

  try {
    return await fn(api)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* best-effort */ }
  }
}

export function assert(cond, message) {
  if (!cond) throw new Error(`assertion failed: ${message}`)
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`)
  }
}

export function assertIncludes(collection, value, message) {
  if (!collection.includes(value)) {
    throw new Error(`${message}\n  collection: ${JSON.stringify(collection)}\n  missing:    ${JSON.stringify(value)}`)
  }
}
