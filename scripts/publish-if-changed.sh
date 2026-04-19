#!/usr/bin/env bash
#
# publish-if-changed.sh <path-to-package-dir>
#
# Publishes the package in the given directory if its package.json version
# differs from what's live on npm. Prints a clear message + exits 0 when
# the version already exists, so a re-triggered workflow after a partial
# failure doesn't crash on the already-published packages.
#
# Used by .github/workflows/publish.yml; also runnable locally if you
# need to publish one package manually.
#
# Why pnpm publish instead of npm publish:
#   Workspace packages use `"@designteam/core": "workspace:*"` in
#   peer-deps. `npm publish` ships package.json VERBATIM — the literal
#   `workspace:*` string would break every consumer. `pnpm publish`
#   rewrites workspace protocol strings to actual semver ranges based on
#   what's currently installed. We want that rewrite, so we always use
#   pnpm publish.
#
# Scope handling:
#   - Scoped packages (@foo/bar) publish with --access public
#   - Unscoped packages (designteam CLI) publish without the flag

set -euo pipefail

PKG_DIR="${1:?path to package directory required}"

if [[ ! -f "$PKG_DIR/package.json" ]]; then
  echo "error: $PKG_DIR/package.json not found" >&2
  exit 1
fi

NAME=$(cd "$PKG_DIR" && node -p "require('./package.json').name")
VERSION=$(cd "$PKG_DIR" && node -p "require('./package.json').version")

if [[ -z "$NAME" || -z "$VERSION" ]]; then
  echo "error: package.json in $PKG_DIR missing name or version" >&2
  exit 1
fi

# `npm view <name>@<version> version` exits 0 and prints the version when
# it exists, empty + exit 0 when it doesn't, non-zero on network/auth error.
# We swallow the error and treat empty-output as "not published yet". If
# npm is actually unreachable, the subsequent publish will fail loudly on
# auth/network — the user will see a clear error, just not "npm is down".
# That trade-off is deliberate: skip-when-live has to keep working even
# when `npm view` returns a stderr warning about deprecated subdeps etc.
EXISTING=$(npm view "$NAME@$VERSION" version 2>/dev/null || true)

if [[ "$EXISTING" == "$VERSION" ]]; then
  echo "✓ $NAME@$VERSION already published — skipping"
  exit 0
fi

echo "→ publishing $NAME@$VERSION from $PKG_DIR"

# Scoped packages need --access public to publish on the free tier.
# Detect from the leading '@' in the package name. Array form avoids
# word-splitting games and keeps ShellCheck happy.
PUBLISH_ARGS=()
if [[ "$NAME" == @* ]]; then
  PUBLISH_ARGS+=(--access public)
fi

cd "$PKG_DIR"
# --provenance attaches a GitHub-signed attestation when run on GHA with
# id-token: write. Locally without those creds, pnpm/npm silently drop it.
# --no-git-checks lets pnpm publish from a non-clean tree (we've just
# built dist/) and from a non-main branch (tags are the source of truth,
# not the branch name).
pnpm publish "${PUBLISH_ARGS[@]}" --provenance --no-git-checks
