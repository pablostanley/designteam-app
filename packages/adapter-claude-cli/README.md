# @designteam/adapter-claude-cli

[Design Team](https://designteam.app) adapter that dispatches each task
to the local `claude` CLI. Zero prompt boilerplate for the caller — the
adapter stitches agent personality + team memory + user profile + task
brief into one `claude -p` invocation.

See the monorepo root's `adapter-plugin.md` for the full adapter spec.

## Install

```sh
pnpm add @designteam/adapter-claude-cli
```

Requires the `claude` CLI on your PATH
([installation](https://docs.claude.com/en/docs/claude-code)).

## Usage

```ts
import { registerAdapter } from '@designteam/adapter-utils'
import { createClaudeCliAdapter } from '@designteam/adapter-claude-cli'

registerAdapter(createClaudeCliAdapter({
  claudePath: 'claude',            // default
  extraArgs: ['--model', 'sonnet'],
  timeoutMs: 15 * 60 * 1000,
}))
```

## What the prompt looks like

For a researcher agent named Scout, working on a competitive-analysis
task, the prompt `claude -p` receives looks like:

```
You are Scout, a researcher on a design team.

<personality fragment — bold/playful/experimental sliders>

<current mood + design modifiers from emotions>

<recent agent memories (top 5 by salience)>

ABOUT THE USER
<user profile: business, industry, voice, style, ...>

TEAM KNOWLEDGE
<team memory top 10 by salience, grouped by category>

## Task

analyze three competing landing pages

Success criteria: three named competitors with differentiators
Why this matters: grounds the positioning work in reality
```

## Outcome mapping

| Subprocess | Adapter outcome | Host transition |
|---|---|---|
| `exit 0` with stdout | `done` with stdout as summary | `progress --done` |
| non-zero exit | `error` with stderr as message | release checkout, log |
| `ctx.signal.aborted` | `cancelled` reason `signal.aborted` | `progress --cancel` |
| exceeds `timeoutMs` | `cancelled` reason `timeout` | `progress --cancel` |

## Options

```ts
interface ClaudeCliAdapterOptions {
  claudePath?: string    // default 'claude'
  id?: string            // default '@designteam/adapter-claude-cli'
  extraArgs?: string[]   // appended after `-p <prompt>`
  timeoutMs?: number     // default 15 minutes
}
```

## License

MIT
