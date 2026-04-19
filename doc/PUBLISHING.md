# Publishing

Two paths:

- **Automated (preferred):** push a version tag. `.github/workflows/publish.yml` builds every workspace package and runs `scripts/publish-if-changed.sh` for each in dependency order. See the _Tagging a release_ section below.
- **Manual (break-glass):** run the commands in the _Publish commands_ section from your own shell. Use this when the workflow is broken or you're iterating locally before bumping the tag.

**Prerequisite for automated publish:** the repo needs an `NPM_TOKEN` secret with "Automation" scope for the `@designteam` org. Without it, the workflow fails at the first `npm publish` step.

## What's publishable

| Package | Scope | Role |
|---|---|---|
| `@designteam/core` | `packages/core` | Engine — personality, emotions, memory, relationships. Every other package peer-depends on it. |
| `@designteam/adapter-utils` | `packages/adapter-utils` | Types + mutable registry every adapter implements. |
| `@designteam/adapter-local-script` | `packages/adapter-local-script` | Reference adapter. No LLM. Used as the `--command=` fast path. |
| `@designteam/adapter-claude-cli` | `packages/adapter-claude-cli` | LLM adapter. Wraps the local `claude` CLI. |
| `@designteam/adapter-codex-local` | `packages/adapter-codex-local` | LLM adapter. Wraps the local `codex` CLI. Template for community cursor/gemini wrappers. |
| `@designteam/adapter-anthropic-api` | `packages/adapter-anthropic-api` | LLM adapter. Calls the Anthropic API directly (needs `ANTHROPIC_API_KEY`). Reports token cost. |
| `@designteam/adapter-efecto` | `packages/adapter-efecto` | Agency-shaped adapter. Creates Efecto design sessions per task. |
| `designteam` | repo root | The CLI. Depends on all seven packages above. |

## Publish order matters

Because `designteam` and the adapter packages depend on `@designteam/core`
(and the adapter packages peer-depend on `@designteam/adapter-utils`),
publish the dependencies first. Same for version bumps — bump the leaf
first, let workspace re-resolution pick it up, then bump consumers.

**Safe order:**

1. `@designteam/core`
2. `@designteam/adapter-utils`
3. `@designteam/adapter-local-script`, `@designteam/adapter-claude-cli`, `@designteam/adapter-codex-local`, `@designteam/adapter-anthropic-api`, and `@designteam/adapter-efecto` (parallel; all peer-dep on adapter-utils)
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

pnpm --filter @designteam/adapter-codex-local run build
cd packages/adapter-codex-local && npm publish --access public && cd ../..

pnpm --filter @designteam/adapter-anthropic-api run build
cd packages/adapter-anthropic-api && npm publish --access public && cd ../..

pnpm --filter @designteam/adapter-efecto run build
cd packages/adapter-efecto && npm publish --access public && cd ../..

# CLI last (depends on everything above)
npm publish
```

`--access public` is required for scoped packages on the free npm plan;
omit it for the unscoped `designteam` CLI.

## Tagging a release

With the GitHub Actions workflow in place, the usual flow is:

1. Bump every package's `version` in `package.json`. Follow dependency order (core → adapter-utils → adapter-local-script / adapter-claude-cli → designteam CLI) so peer-deps can be pinned to the version you just bumped to.
2. Commit + push.
3. `git tag v0.13.0 && git push origin v0.13.0` (or whatever the new version is).
4. The workflow fires, builds everything, and publishes each package whose on-disk version doesn't match npm's latest. Re-triggering on failure is safe — already-published packages skip cleanly.
5. Update the _Current latest published versions_ table below.

## Dry-run verification (no npm auth needed)

Before setting `NPM_TOKEN` or tagging, you can confirm every tarball is
well-formed locally. `pnpm pack` runs `prepublishOnly` (which builds
`dist/`) and rewrites `workspace:*` to real versions without publishing:

```sh
# Pack every workspace package + the root CLI into /tmp
mkdir -p /tmp/designteam-pack
for pkg in packages/core packages/adapter-utils \
           packages/adapter-local-script packages/adapter-claude-cli \
           packages/adapter-anthropic-api packages/adapter-efecto; do
  (cd "$pkg" && pnpm pack --pack-destination /tmp/designteam-pack/)
done
pnpm pack --pack-destination /tmp/designteam-pack/

# Inspect each tarball's contents + verify workspace: was rewritten
for tgz in /tmp/designteam-pack/*.tgz; do
  echo "=== $(basename "$tgz") ==="
  tar -tzf "$tgz"                                             # files
  tar -xOzf "$tgz" 'package/package.json' | grep -E 'workspace:|"@designteam/'
done
```

**What to check:**

- **File list** — every tarball is `package/dist/*` + `package.json` + `README.md`, no `node_modules`, no `__tests__`, no stray config. Adapter tarballs are ~4–10 KB; `@designteam/core` is ~250 KB; CLI is 11 files.
- **`workspace:` residue** — the grep above should never print lines with `workspace:`. Every `@designteam/*` dep must resolve to a concrete semver (`"@designteam/core": "0.3.1"`, `"@designteam/adapter-utils": "0.1.0"`, etc.). `npm publish` ships `package.json` verbatim and would break consumers; `pnpm publish` (what the workflow uses) does this rewrite at pack time, which is why we use it.
- **Version alignment** — the version inside each tarball's `package.json` matches the one in the source tree. `publish-if-changed.sh` reads that version, not git tags.

This takes ~20 s and catches the vast majority of publish-time surprises.

## After publishing

- [ ] Update `ROADMAP.md` Notes section with the new latest versions.
- [ ] Spot-check the install: `npx designteam@latest --help` should render.
- [ ] If you're on a new machine, `npm cache verify` first; pnpm's lockfile can trip over stale npm cache entries after a version bump.

## Current latest published versions

Update this list after every publish. Grab the authoritative values from
`npm view <pkg> version`.

| Package | Latest |
|---|---|
| `@designteam/core` | `0.3.1` |
| `@designteam/adapter-utils` | `0.1.0` |
| `@designteam/adapter-local-script` | `0.1.0` |
| `@designteam/adapter-claude-cli` | `0.1.0` |
| `@designteam/adapter-codex-local` | `0.1.0` |
| `@designteam/adapter-anthropic-api` | `0.1.0` |
| `@designteam/adapter-efecto` | `0.1.0` |
| `designteam` | `0.5.1` |

First multi-package publish landed **2026-04-19** via tag `v0.13.0` (commit `eb434be`). See GH Actions run [24634092505](https://github.com/pablostanley/designteam-app/actions/runs/24634092505).
