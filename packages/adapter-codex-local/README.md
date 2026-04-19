# @designteam/adapter-codex-local

[Design Team](https://designteam.app) adapter that dispatches each
task to the local OpenAI [`codex`](https://github.com/openai/codex)
CLI — mirror of `adapter-claude-cli`, built on the shared
`runSubprocess` helper from `@designteam/adapter-utils`.

Under 60 LOC of adapter code. The heavy lifting — prompt assembly,
process-group kill, signal+timeout plumbing — lives in adapter-utils
so every CLI-wrapping adapter stays thin.

See the monorepo root's `adapter-plugin.md` for the full adapter spec.

## Install

```sh
pnpm add @designteam/adapter-codex-local
```

You also need the `codex` CLI on your PATH. See OpenAI's install
instructions.

## Usage

```ts
import { registerAdapter } from '@designteam/adapter-utils'
import { createCodexCliAdapter } from '@designteam/adapter-codex-local'

registerAdapter(createCodexCliAdapter({
  codexPath: 'codex',             // default
  extraArgs: ['--full-auto'],     // optional — appended after `exec <prompt>`
  timeoutMs: 15 * 60 * 1000,      // default: 15 min
}))
```

Then dispatch:

```sh
designteam run <plan-id> <task-id> --adapter=@designteam/adapter-codex-local
```

## What the model sees

Same stitched prompt as `adapter-claude-cli` — agent identity +
personality + mood + per-agent memory + team memory + user profile +
task brief — via `buildAgentPrompt(ctx)` from adapter-utils. See
that package's README for the full rendered example.

## Outcome mapping

| Subprocess result | Adapter outcome | Host transition |
|---|---|---|
| exit 0 | `done` (first 800 chars of stdout) | `progress --done` |
| non-zero exit | `error` (stderr or "codex exited N") | release checkout, log |
| `ctx.signal.aborted` | `cancelled` reason `signal.aborted` | `progress --cancel` |
| exceeds `timeoutMs` | `cancelled` reason `timeout` | `progress --cancel` |

## Options

```ts
interface CodexCliAdapterOptions {
  codexPath?: string    // default 'codex'
  id?: string           // default '@designteam/adapter-codex-local'
  extraArgs?: string[]  // default [] — appended after `exec <prompt>`
  timeoutMs?: number    // default 15 minutes
}
```

## License

MIT
