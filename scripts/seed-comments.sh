#!/usr/bin/env bash
# Bootstrap random comments for testing the TUI.
# Usage: ./scripts/seed-comments.sh [count] [repo-root]
# Default: 30 comments, repo-root = git root (or cwd).

set -euo pipefail

COUNT="${1:-30}"
REPO_ROOT="${2:-$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")}"
ACO="node $(dirname "$0")/../dist/agent-comments.mjs"

# ── pick source files, groups by path length ─────────────────────────

# Short paths (1-2 segments)
mapfile -t SHORT_FILES < <(
  find "$REPO_ROOT" -maxdepth 2 \
    -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.py' -o -name '*.rs' -o -name '*.go' \) \
    ! -path '*/node_modules/*' ! -path '*/dist/*' ! -path '*/.git/*' ! -path '*/target/*' \
    2>/dev/null
)

# Medium paths (3-4 segments)
mapfile -t MEDIUM_FILES < <(
  find "$REPO_ROOT" -mindepth 3 -maxdepth 4 \
    -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.py' -o -name '*.rs' -o -name '*.go' \) \
    ! -path '*/node_modules/*' ! -path '*/dist/*' ! -path '*/.git/*' ! -path '*/target/*' \
    2>/dev/null
)

# Deep paths (5+ segments)
mapfile -t DEEP_FILES < <(
  find "$REPO_ROOT" -mindepth 5 \
    -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.py' -o -name '*.rs' -o -name '*.go' \) \
    ! -path '*/node_modules/*' ! -path '*/dist/*' ! -path '*/.git/*' ! -path '*/target/*' \
    2>/dev/null
)

ALL_FILES=()
[ "${#SHORT_FILES[@]}" -gt 0 ] && ALL_FILES+=("${SHORT_FILES[@]}")
[ "${#MEDIUM_FILES[@]}" -gt 0 ] && ALL_FILES+=("${MEDIUM_FILES[@]}")
[ "${#DEEP_FILES[@]}" -gt 0 ] && ALL_FILES+=("${DEEP_FILES[@]}")

if [ "${#ALL_FILES[@]}" -eq 0 ]; then
  echo "No source files found in $REPO_ROOT"
  exit 1
fi

# ── weighted file picker ─────────────────────────────────────────────
# ~40% short paths, ~35% medium, ~25% deep (when available)

pick_file() {
  local roll=$((RANDOM % 100))
  if [ "$roll" -lt 40 ] && [ "${#SHORT_FILES[@]}" -gt 0 ]; then
    echo "${SHORT_FILES[$((RANDOM % ${#SHORT_FILES[@]}))]}"
  elif [ "$roll" -lt 75 ] && [ "${#MEDIUM_FILES[@]}" -gt 0 ]; then
    echo "${MEDIUM_FILES[$((RANDOM % ${#MEDIUM_FILES[@]}))]}"
  elif [ "${#DEEP_FILES[@]}" -gt 0 ]; then
    echo "${DEEP_FILES[$((RANDOM % ${#DEEP_FILES[@]}))]}"
  elif [ "${#MEDIUM_FILES[@]}" -gt 0 ]; then
    echo "${MEDIUM_FILES[$((RANDOM % ${#MEDIUM_FILES[@]}))]}"
  else
    echo "${SHORT_FILES[$((RANDOM % ${#SHORT_FILES[@]}))]}"
  fi
}

# ── messages: short, medium, multi-line ──────────────────────────────

SHORT_MSGS=(
  "rename to camelCase"
  "remove dead code"
  "add a timeout"
  "guard against null"
  "use early return"
  "inline this"
  "extract constant"
  "add type annotation"
  "flip the condition"
  "unwrap or default"
  "use optional chaining"
  "mark as readonly"
)

MEDIUM_MSGS=(
  "extract this into a helper function with proper error handling"
  "replace with standard library — see MDN for the polyfill story"
  "add unit tests for the happy path and all edge cases here"
  "split into smaller functions, this is doing way too much"
  "use dependency injection so we can test this in isolation"
  "performance: cache this result, it's called in a hot loop"
  "add input validation before the transform, empty string breaks it"
  "make this configurable via env var or config file, not hardcoded"
  "document the failure modes — silent return on error is surprising"
  "consider async version for IO-bound callers downstream"
)

LONG_MSGS=(
  "extract this block into its own module

the logic here mixes three concerns: validation, transformation, and IO.
split into:
  1. validateInput(raw) -> Result<Input, Error>
  2. transform(validated) -> Output
  3. persist(output) -> Promise<void>

this will make unit testing each stage straightforward and let us reuse
the validation/transform pipeline across the CLI and server paths."
  "race condition when two callers hit this concurrently

the current read-modify-write cycle is not atomic. if request A reads
the counter at 5 and request B also reads it at 5, both will write 6
and one update is lost.

options:
  - use a mutex/lock (simplest, blocks)
  - use compare-and-swap if the datastore supports it
  - queue updates through a single writer

leaning toward option 3 since we already have a job queue in this service."
  "add better error messages for the three known failure modes

1. network timeout: 'Connection to X timed out after Yms. Check VPN?'
2. auth expired: 'Session expired at {timestamp}. Run login command.'
3. rate limit: 'Rate limited. Retry after {retryAfter} or reduce batch size.'

currently all three surface as 'Internal error' which makes debugging
production incidents painful. we have the context available at this
call site — just need to map it to user-facing messages."
  "replace this regex with a proper parser

the current regex approach breaks on nested brackets, escaped quotes,
and unicode edge cases. we've patched it 4 times in the last quarter
and each fix introduces a new edge case.

proposal: use a recursive descent parser (~80 lines). it's more code
but the grammar is stable and the tests will actually cover the edge
cases instead of 'add another regex alternation and pray.'"
)

pick_message() {
  local roll=$((RANDOM % 100))
  if [ "$roll" -lt 30 ]; then
    echo "${SHORT_MSGS[$((RANDOM % ${#SHORT_MSGS[@]}))]}"
  elif [ "$roll" -lt 75 ]; then
    echo "${MEDIUM_MSGS[$((RANDOM % ${#MEDIUM_MSGS[@]}))]}"
  else
    echo "${LONG_MSGS[$((RANDOM % ${#LONG_MSGS[@]}))]}"
  fi
}

# ── line ranges: tiny (single), small (2-3), medium (4-8), large (10-25) ──

pick_range() {
  local total=$1
  if [ "$total" -lt 5 ]; then
    echo "$((RANDOM % total + 1)):$((RANDOM % total + 1))" | awk -F: '{if($1>$2){print $2":"$1}else{print $1":"$2}}'
    return
  fi
  local roll=$((RANDOM % 100))
  local start end
  start=$((RANDOM % (total - 1) + 1))
  if [ "$roll" -lt 35 ]; then
    # single line
    echo "$start:$start"
  elif [ "$roll" -lt 65 ]; then
    # small: 2-3 lines
    end=$((start + 2))
    [ "$end" -gt "$total" ] && end=$total
    echo "$start:$end"
  elif [ "$roll" -lt 85 ]; then
    # medium: 4-8 lines
    end=$((start + 4 + RANDOM % 5))
    [ "$end" -gt "$total" ] && end=$total
    echo "$start:$end"
  else
    # large: 10-25 lines
    end=$((start + 10 + RANDOM % 16))
    [ "$end" -gt "$total" ] && end=$total
    echo "$start:$end"
  fi
}

# ── status weights ───────────────────────────────────────────────────

STATUSES=("active" "active" "active" "active" "active" "resolved" "resolved" "draft")

# ── seed ─────────────────────────────────────────────────────────────

echo "Seeding $COUNT comments in ${REPO_ROOT}…"
echo "  short paths: ${#SHORT_FILES[@]}  medium: ${#MEDIUM_FILES[@]}  deep: ${#DEEP_FILES[@]}"
echo ""

CREATED=0

for ((i = 1; i <= COUNT; i++)); do
  FILE=$(pick_file)
  REL_FILE="${FILE#$REPO_ROOT/}"

  TOTAL_LINES=$(wc -l < "$FILE" | tr -d ' ')
  if [ "$TOTAL_LINES" -lt 3 ]; then
    continue
  fi

  RANGE=$(pick_range "$TOTAL_LINES")
  MSG=$(pick_message)
  STATUS="${STATUSES[$((RANDOM % ${#STATUSES[@]}))]}"

  if [ "$STATUS" = "draft" ]; then
    $ACO add "$REL_FILE" "$RANGE" "$MSG" -d 2>/dev/null && CREATED=$((CREATED + 1))
  else
    ID=$($ACO add "$REL_FILE" "$RANGE" "$MSG" 2>/dev/null | awk '{print $2}')
    if [ -n "$ID" ]; then
      CREATED=$((CREATED + 1))
      if [ "$STATUS" = "resolved" ]; then
        $ACO resolve "$ID" 2>/dev/null
      fi
    fi
  fi
done

echo ""
echo "Created $CREATED comments. Use 'aco t' to browse."