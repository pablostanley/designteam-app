# @designteam/adapter-local-script

Reference adapter for [Design Team](https://designteam.app). Executes each
plan task by shelling out to a configured command. Useful for:

- Testing the adapter contract end-to-end without an LLM dependency
- Workflows where "do this task" just means "run this command"

See the monorepo root's `adapter-plugin.md` for the full adapter spec.

## Install

```sh
pnpm add @designteam/adapter-local-script
```

## Usage

```ts
import { registerAdapter } from '@designteam/adapter-utils'
import { createLocalScriptAdapter } from '@designteam/adapter-local-script'

registerAdapter(createLocalScriptAdapter({
  command: 'bash scripts/run-task.sh',
  timeoutMs: 5 * 60 * 1000,
}))
```

## What the script receives

Task context is passed as environment variables, so the script can read
them without any wrapper:

| Env var | Value |
|---|---|
| `DT_TASK_ID` | `t1`, `t2`, … |
| `DT_TASK_ROLE` | `researcher`, `copywriter`, … |
| `DT_TASK_INSTRUCTION` | The task's instruction text |
| `DT_PLAN_ID` | The parent plan's id |
| `DT_AGENT_NAME` | The agent assigned to the task |
| `DT_AGENT_ROLE` | Same as `DT_TASK_ROLE` unless the plan overrode it |
| `DT_RUN_ID` | The run that holds the atomic checkout lock |

## Outcome mapping

| Script behavior | Adapter outcome | Control plane transition |
|---|---|---|
| `exit 0` | `done` with stdout as summary | `progress <plan> <task> --done` |
| non-zero exit | `error` with stderr as message | release checkout, log |
| `ctx.signal.aborted` | `cancelled` reason `signal.aborted` | `progress --cancel` |
| exceeds `timeoutMs` | `cancelled` reason `timeout` | `progress --cancel` |

## Options

```ts
interface LocalScriptAdapterOptions {
  command: string                       // required
  id?: string                           // default '@designteam/adapter-local-script'
  cwd?: string                          // default process.cwd()
  env?: Record<string, string>          // merged on top of DT_* vars
  timeoutMs?: number                    // default 10 minutes
}
```

## License

MIT
