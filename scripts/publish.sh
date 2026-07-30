#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/publish.sh <package-name>
#   package-name: "agent-comments" or "agent-comments-pi"
#
# Prompts for version bump (patch/minor/major), bumps, publishes, commits, pushes.

PKG="$1"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "$PKG" in
  agent-comments)
    PKG_DIR="$REPO_ROOT"
    PUBLISH_CMD="npm publish --access public"
    ;;
  agent-comments-pi)
    PKG_DIR="$REPO_ROOT/packages/pi"
    PUBLISH_CMD="pnpm publish --access public"
    ;;
  *)
    echo "Usage: $0 <agent-comments|agent-comments-pi>"
    exit 1
    ;;
esac

cd "$PKG_DIR"

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"
echo -n "Bump type? [patch|minor|major]: "
read -r BUMP

case "$BUMP" in
  patch|minor|major) ;;
  *)
    echo "Invalid bump type: $BUMP"
    exit 1
    ;;
esac

# Bump version (no git tag, we handle commit ourselves)
npm version "$BUMP" --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")
echo "Bumped to $NEW_VERSION"
echo

# Publish
echo "Publishing $PKG@$NEW_VERSION..."
$PUBLISH_CMD
echo

# Commit & push the version bump
cd "$REPO_ROOT"
git add "$PKG_DIR/package.json"
git commit -m "chore($PKG): bump to v$NEW_VERSION"

# Also commit pnpm-lock if it changed
if ! git diff --quiet pnpm-lock.yaml 2>/dev/null; then
  git add pnpm-lock.yaml
  git commit -m "chore: update pnpm-lock"
fi

echo "Pushing..."
git push

echo
echo "Done. $PKG v$NEW_VERSION published and pushed."
