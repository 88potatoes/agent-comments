# agent-comments-pi

`/address` slash command for [Pi](https://pi.dev) — fetches unresolved [agent-comments](https://github.com/88potatoes/agent-comments) and sends them to the agent.

## Requirements

- [agent-comments](https://github.com/88potatoes/agent-comments) CLI installed (`npm install -g agent-comments`)

## Install

```bash
pi install git:github.com/88potatoes/agent-comments-pi
```

Or from npm (once published):

```bash
pi install npm:@88potatoes/agent-comments-pi
```

## Usage

```
/address
```

Fetches all unresolved comments and prompts the agent to address them.

```
/address Focus on performance issues only
```

Passes a custom instruction prefix.

The agent will be reminded to resolve each comment after addressing it so `/address` closes the loop.
