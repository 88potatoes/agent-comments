# agent-comments

**CLI for telling agents what to do**

Add, resolve, and track inline code comments — locally, offline, before you push. CLI-first, stored in SQLite, composable with any tool that speaks JSON.

> **Demo** — video coming soon

<br>

## Quick start

```bash
npm install -g @88potatoes/agent-comments
```

```bash
# Add a comment on lines 10-15
agent-comments add src/main.ts 10:15 "extract this into a helper"

# List active comments
agent-comments get

# Resolve by short ID
agent-comments resolve 3f8a1b2c

# Resolve everything
agent-comments resolve --all

# JSON output for scripts
agent-comments get --view json
```

## Usage

```
add <file> <lines> <message>     Add a comment
add <file> <lines> <message> -d  Save as draft (private)
get [--file] [--status]          List comments (active by default)
get --view json                  Machine-readable output
resolve <id>                     Resolve a comment
resolve --all                    Resolve all unresolved
unresolve <id>                   Reopen a resolved comment
delete <id>                      Delete a comment
clean                            Delete all resolved comments
```

Line ranges: single line (`42`) or range (`10:15`).

Comment statuses: `active` (default), `resolved`, `draft`.

```bash
# Filtering
agent-comments get --status resolved
agent-comments get --file src/main.ts
agent-comments get --status all --view json
```

## What you get

- **Offline.** No server, no auth, no internet. Comments live on your machine.
- **Per-repo.** Each git repo gets its own SQLite database. No cross-contamination.
- **JSON-native.** Pipe into jq, CI, Slack bots, anything.
- **Drafts.** Flag something for later without making it visible to the team.
- **Resolve workflow.** Active → Resolved. Track what's been addressed.
- **Short IDs.** `3f8a1b2c` — just the first 8 chars. Easy to reference in commits and chat.

## How it works

Comments are stored in a per-repo SQLite database at `~/.local/share/agent-comments/<repo>.sqlite`. No server, no auth, no cloud.

```
~/.local/share/agent-comments/
├── my-project.sqlite
├── dotfiles.sqlite
└── work-repo.sqlite
```

Each comment: `id`, `file`, `startLine`, `endLine`, `message`, `status`, `createdAt`, `updatedAt`.

Short IDs: use the first 8 characters of a UUID (`3f8a1b2c`).

## Scripting

Pipe JSON into anything:

```bash
# Count active comments
agent-comments get --view json | jq '.comments | length'

# Unresolved FIXMEs
agent-comments get --status active --view json \
  | jq -r '.comments[] | "\(.file):\(.startLine) \(.message)"'

# Feed into CI
agent-comments get --status active --view json \
  | jq -r '.comments[] | "::warning file=\(.file),line=\(.startLine)::\(.message)"'
```

## Install

Requires **Node.js ≥ 18**.

```bash
npm install -g @88potatoes/agent-comments
```

From source:

```bash
git clone https://github.com/88potatoes/agent-comments.git
cd agent-comments
pnpm install && pnpm build
pnpm link --global
```

## References

<!-- videos, blog posts, talks, related projects — coming soon -->

## License

ISC
