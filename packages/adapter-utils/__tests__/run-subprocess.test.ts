import { describe, expect, it } from 'vitest'
import { runSubprocess } from '../src/index'

/**
 * Direct coverage for runSubprocess. The adapter-local-script and
 * adapter-claude-cli suites exercise this transitively via their own
 * spawn paths; this file pins the shared helper's contract:
 *   - exit-0 success → exitCode 0, stdout captured, timedOut false
 *   - non-zero exit  → exitCode preserved, stderr captured
 *   - ctx.signal.abort → process killed, timedOut false, settles quickly
 *   - timeout        → process killed, timedOut true
 *   - unknown command → exitCode null, stderr has spawn error
 *   - shell: true    → shell expansion works (piping, &&, …)
 *
 * No LLM or third-party binary — only portable POSIX commands.
 */

describe('runSubprocess', () => {
  it('captures stdout and reports exitCode 0 on a successful command', async () => {
    const result = await runSubprocess({
      command: 'node',
      args: ['-e', 'process.stdout.write("hello")'],
      signal: new AbortController().signal,
      timeoutMs: 5_000,
    })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('hello')
    expect(result.stderr).toBe('')
    expect(result.timedOut).toBe(false)
  })

  it('preserves non-zero exit codes and captures stderr', async () => {
    const result = await runSubprocess({
      command: 'node',
      args: ['-e', 'process.stderr.write("boom"); process.exit(3)'],
      signal: new AbortController().signal,
      timeoutMs: 5_000,
    })
    expect(result.exitCode).toBe(3)
    expect(result.stderr).toBe('boom')
    expect(result.timedOut).toBe(false)
  })

  it('honors shell: true so `sh -c`-style strings work', async () => {
    const result = await runSubprocess({
      command: 'echo hello | tr a-z A-Z',
      shell: true,
      signal: new AbortController().signal,
      timeoutMs: 5_000,
    })
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe('HELLO')
  })

  it('kills the process when ctx.signal aborts mid-run', async () => {
    const controller = new AbortController()
    // Start a long-running sleep so the abort has something to kill.
    const promise = runSubprocess({
      command: 'node',
      args: ['-e', 'setTimeout(() => process.stdout.write("never"), 30000)'],
      signal: controller.signal,
      timeoutMs: 60_000,
    })
    // Give spawn a tick to attach listeners, then abort.
    setTimeout(() => controller.abort(), 50)
    const result = await promise
    expect(result.timedOut).toBe(false)
    expect(result.stdout).not.toContain('never')
    // exitCode is null when the process is killed by a signal.
    expect(result.exitCode === null || result.exitCode !== 0).toBe(true)
  })

  it('sets timedOut=true and kills the process when timeoutMs elapses', async () => {
    const result = await runSubprocess({
      command: 'node',
      args: ['-e', 'setTimeout(() => {}, 30000)'],
      signal: new AbortController().signal,
      timeoutMs: 100,
    })
    expect(result.timedOut).toBe(true)
    expect(result.exitCode === null || result.exitCode !== 0).toBe(true)
  })

  it('surfaces spawn errors as exitCode null with stderr populated', async () => {
    const result = await runSubprocess({
      command: '/does/not/exist/executable-that-is-not-real',
      signal: new AbortController().signal,
      timeoutMs: 5_000,
    })
    expect(result.exitCode).toBe(null)
    expect(result.stderr.length).toBeGreaterThan(0)
  })

  it('passes env to the child process', async () => {
    const result = await runSubprocess({
      command: 'node',
      args: ['-e', 'process.stdout.write(process.env.DT_TEST || "missing")'],
      env: { ...process.env, DT_TEST: 'from-env' },
      signal: new AbortController().signal,
      timeoutMs: 5_000,
    })
    expect(result.stdout).toBe('from-env')
  })
})
