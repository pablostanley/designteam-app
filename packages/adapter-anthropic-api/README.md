# @designteam/adapter-anthropic-api

[Design Team](https://designteam.app) adapter that dispatches tasks
directly to the Anthropic Messages API. The **autonomous-mode** adapter
— no Claude Code, no human in the loop. Runs in any Node process with
an API key.

Reports token usage via `reportCost()` so the CLI's budget hard-stop
can trip before you burn through your allowance.

See the monorepo root's `adapter-plugin.md` for the full adapter spec.

## Install

```sh
pnpm add @designteam/adapter-anthropic-api
```

## Usage

```ts
import { registerAdapter } from '@designteam/adapter-utils'
import { createAnthropicApiAdapter } from '@designteam/adapter-anthropic-api'

registerAdapter(createAnthropicApiAdapter({
  apiKey: process.env.ANTHROPIC_API_KEY,  // or omit — it's the default
  model: 'claude-sonnet-4-6',             // default
  maxTokens: 4096,                        // default
  temperature: 1.0,                       // default
}))
```

The Design Team CLI auto-registers this adapter when `ANTHROPIC_API_KEY`
is set in the environment. Run it via:

```sh
designteam run <plan-id> <task-id> --adapter=@designteam/adapter-anthropic-api
```

## What the model sees

Same prompt shape as `@designteam/adapter-claude-cli` — agent identity +
personality + mood + per-agent memory + team memory + user profile +
task brief. See that package's README for the full rendered example.

## Cost reporting

When the API response includes a `usage` block, `reportCost()` returns:

```ts
{
  model: 'anthropic:claude-sonnet-4-6',
  inputTokens: <count>,
  outputTokens: <count>,
  usdCents: <cents, rounded up>,
}
```

Default pricing covers Sonnet 4.6, Opus 4.7, and Haiku 4.5 at published
rates (April 2026). Override via the `pricing` option for contract rates
or newer models:

```ts
createAnthropicApiAdapter({
  pricing: {
    'claude-sonnet-4-6': { inputCentsPerMTok: 300, outputCentsPerMTok: 1500 },
    'claude-opus-4-7':   { inputCentsPerMTok: 1500, outputCentsPerMTok: 7500 },
  },
})
```

The Design Team CLI's runner calls `reportCost()` after each successful
task and appends to `.designteam/budget.jsonl`. Set a cap with
`designteam budget set --usd=N` and the next `designteam run` refuses
if the period's spend has hit it.

## Outcome mapping

| API response | Adapter outcome | Host transition |
|---|---|---|
| 2xx with `content[].text` | `done` (summary = first 800 chars of text) | `progress --done` |
| 2xx with empty content | `error` (`no text content`) | release checkout, log |
| non-2xx | `error` (message includes status + body) | release checkout, log |
| `ctx.signal.aborted` | `cancelled` reason `signal.aborted` | `progress --cancel` |
| exceeds `timeoutMs` | `cancelled` reason `timeout` | `progress --cancel` |

## Options

```ts
interface AnthropicApiAdapterOptions {
  apiKey?: string             // default process.env.ANTHROPIC_API_KEY
  model?: string              // default 'claude-sonnet-4-6'
  maxTokens?: number          // default 4096
  temperature?: number        // default 1.0
  id?: string                 // default '@designteam/adapter-anthropic-api'
  pricing?: Record<string, { inputCentsPerMTok; outputCentsPerMTok }>
  baseUrl?: string            // default 'https://api.anthropic.com'
  fetchImpl?: typeof fetch    // for tests / custom transports
  timeoutMs?: number          // default 15 minutes
}
```

## License

MIT
