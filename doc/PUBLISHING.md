# Publishing

How to publish each npm package in this workspace. Manual for now; a
GitHub Actions workflow that publishes on tag is still TODO (v0.12 auto-
publish bullet, blocked on \`NPM_TOKEN\` secret configuration).

## What's publishable

| Package | Scope | Role |
|---|---|---|
| `@designteam/core` | `packages/core` | Engine — personality, emotions, memory, relationships. Every other package peer-depends on it. |
| `@designteam/adapter-utils` | `packages/adapter-utils` | Types + mutable registry every adapter implements. |
| `@designteam/adapter-local-script` | `packages/adapter-local-script` | Reference adapter. No LLM. Used as the `--command=` fast path. |
| `@designteam/adapter-claude-cli` | `packages/adapter-claude-cli` | First LLM-backed adapter. Wraps the local `claude` CLI. |
| `designteam` | repo root | The CLI. Depends on all four packages above. |

## Publish order matters

Because `designteam` and the adapter packages depend on `@designteam/core`
(and the adapter packages peer-depend on `@designteam/adapter-utils`),
publish the dependencies first. Same for version bumps — bump the leaf
first, let workspace re-resolution pick it up, then bump consumers.

**Safe order:**

1. `@designteam/core`
2. `@designteam/adapter-utils`
3. `@designteam/adapter-local-script` and `@designteam/adapter-claude-cli` (parallel; both peer-dep on adapter-utils)
4. `designteam` (the CLI — depends on all of the above)

## Checklist per package

Before running `npm publish`:

- [ ] **Build is fresh.** Run `pnpm --filter <name> run build` so `dist/` is current.
- [ ] **Types clean.** `pnpm --filter <name> run lint` (which runs `tsc --noEmit`) exits 0.
- [ ] **Tests pass.** `pnpm test` exits 0 — the whole workspace shares the vitest run.
- [ ] **Version bumped.** Update `package.json` version; follow semver (patch for fixes, minor for new exports, major for breaking changes to exports or `TaskAdapter` contract).
- [ ] **Files whitelist in sync.** Each package ships `files: ["dist", "README.md"]`. `npm pack --dry-run` should list only those + `package.json`. Tarball under 100 KB for adapters, under 300 KB for core.
- [ ] **README exists and is current.** Every package has a root README that a user scanning npmjs.com could learn from.

## Publish commands

```sh
# From the repo root, package by package:
pnpm --filter @designteam/core run build
cd packages/core && npm publish --access public && cd ../..

pnpm --filter @designteam/adapter-utils run build
cd packages/adapter-utils && npm publish --access public && cd ../..

pnpm --filter @designteam/adapter-local-script run build
cd packages/adapter-local-script && npm publish --access public && cd ../..

pnpm --filter @designteam/adapter-claude-cli run build
cd packages/adapter-claude-cli && npm publish --access public && cd ../..

# CLI last (depends on everything above)
npm publish
```

`--access public` is required for scoped packages on the free npm plan;
omit it for the unscoped `designteam` CLI.

## After publishing

- [ ] Tag the release: `git tag v0.13.0 && git push origin v0.13.0`.
- [ ] Update `ROADMAP.md` Notes section with the new latest versions.
- [ ] Spot-check the install: `npx designteam@latest --help` should render.
- [ ] If you're on a new machine, `npm cache verify` first; pnpm's lockfile can trip over stale npm cache entries after a version bump.

## Current latest published versions

Update this list after every publish. Grab the authoritative values from
`npm view <pkg> version`.

| Package | Latest |
|---|---|
| `@designteam/core` | `0.3.1` |
| `@designteam/adapter-utils` | **not yet published** |
| `@designteam/adapter-local-script` | **not yet published** |
| `@designteam/adapter-claude-cli` | **not yet published** |
| `designteam` | `0.5.1` |
