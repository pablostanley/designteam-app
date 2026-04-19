# @designteam/adapter-efecto

[Design Team](https://designteam.app) adapter that runs each task
against [Efecto](https://efecto.app)'s design session API — the
**agency-shaped adapter**.

Given a `TaskContext` from the Design Team control plane, the adapter
creates an Efecto design session, attaches the agent's stitched brief
(personality + mood + memory + team memory + user profile + task
instruction), and returns the `designUrl` as the task artifact so
downstream hops (a human, or a future tool-use loop) can pick the
work up without re-context.

Why this adapter exists: v0.11 Phase 4 ("Design as a Service") and
the Efecto 7-phase product roadmap both require a bridge between
the control plane and real design work. This is that bridge.

See the monorepo root's `adapter-plugin.md` for the full adapter spec.

## Install

```sh
pnpm add @designteam/adapter-efecto
```

## Usage

```ts
import { registerAdapter } from '@designteam/adapter-utils'
import { createEfectoAdapter } from '@designteam/adapter-efecto'

registerAdapter(createEfectoAdapter({
  baseUrl: 'https://efecto.app',   // default
  apiKey: process.env.EFECTO_API_KEY,  // optional; reserved for v2 quota enforcement
}))
```

The Design Team CLI auto-registers this adapter when
`EFECTO_API_KEY` is set in the environment (or in preview / self-hosted
deployments when you opt in with `--adapter=@designteam/adapter-efecto`).

```sh
designteam run <plan-id> <task-id> --adapter=@designteam/adapter-efecto
```

## What the task sees

The adapter POSTs to `/api/v1/design/sessions` with
`{ "label": "<agent.name>: <task.id>" }` (or a custom label via the
`sessionLabel` option), then returns:

```ts
{
  outcome: 'done',
  summary: 'Session ready: https://efecto.app/design?session=… (expires …). Task: …',
  artifacts: [
    { label: 'Efecto design session', kind: 'efecto.session', uri: '…' },
    { label: 'Agent brief', kind: 'agent.prompt', content: '<full stitched prompt>' },
  ],
}
```

The `agent.prompt` artifact lets the next hop — whether human or an
LLM-driven tool-use loop — resume with the agent's full Design Team
context (personality + mood + memory etc.).

## Outcome mapping

| Efecto response | Adapter outcome | Notes |
|---|---|---|
| 2xx with `sessionId` + `designUrl` | `done` | Session ready for use |
| 2xx without the expected fields | `error` | Efecto returned malformed JSON |
| 429 (too many sessions) | `blocked` (`efecto.too_many_sessions`) | Retryable — prior session must close first |
| Other non-2xx | `error` (status + body in message) | |
| `ctx.signal.aborted` | `cancelled` reason `signal.aborted` | Host cancelled run |
| Exceeds `timeoutMs` | `cancelled` reason `timeout` | Default 30s |

## Options

```ts
interface EfectoAdapterOptions {
  baseUrl?: string             // default 'https://efecto.app' (env: EFECTO_BASE_URL)
  apiKey?: string              // default process.env.EFECTO_API_KEY
  sessionLabel?: (ctx) => string  // default `${ctx.agent.name}: ${ctx.task.id}`
  id?: string                  // default '@designteam/adapter-efecto'
  fetchImpl?: typeof fetch     // for tests / custom transports
  timeoutMs?: number           // default 30 seconds — session creation is fast
}
```

## Roadmap

V1 (this release): creates a session per task and returns the URL.
V2: LLM tool-use loop driving Efecto's 64-tool design surface
autonomously — end-to-end agentic design work with no human in the
middle.

## License

MIT
