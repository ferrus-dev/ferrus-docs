---
id: nano-standalone
title: Standalone Nano
sidebar_label: Standalone
sidebar_position: 7
slug: /nano-standalone
---

import InstallTabs from '@site/src/components/InstallTabs';

# Standalone Nano

`ferrus-nano` runs [Nano](/docs/nano) on its own: as an interactive coding
conversation, or as one headless request, in a directory you choose. Git and
ferrus registration are optional. It doesn't start HQ, load a spec, claim a
task, or open `ferrus.db`.

:::caution[Trusted-local execution]
Launching `ferrus-nano` opts into running shell commands with your user's
permissions, with no OS sandbox and no approval prompt for each command.
Commands can affect files outside the workspace. See
[Trust and safety](#trust-and-safety).
:::

## Quick start

**1. Install the binary.**

<InstallTabs defaultComponent="nano" />

If you use Cargo, install it with
`cargo install ferrus --version 0.6.0-alpha.1 --locked --profile dist --features nano-openai,nano-mcp --bin ferrus-nano`.

**2. Create a provider file.** Start your model server, then point Nano at it.
For a local LM Studio server, use the exact ID of the loaded model:

```bash
mkdir -p ~/.ferrus
cat > ~/.ferrus/nano.toml <<'EOF'
base_url = "http://127.0.0.1:1234/v1"
model = "YOUR_LOADED_MODEL_ID"
reasoning_effort = "none"
EOF
chmod 600 ~/.ferrus/nano.toml
```

The permissions matter: Nano refuses a file that isn't owner-only. On Windows,
keep the file in `%USERPROFILE%\.ferrus\nano.toml`, with a protected DACL that
grants access only to its owner. See [Provider settings](/docs/nano#provider-settings)
for credentials, budgets, and the other keys.

**3. Start a conversation.**

```bash
ferrus-nano --workspace /path/to/project --interactive
```

The workspace must already exist. It's the only required flag, and `.` works
too.

## Interactive conversations

Interactive mode needs a real terminal on stdin and stdout.

```bash
# Open an idle conversation
ferrus-nano --workspace /path/to/project --interactive

# Send the first request automatically, with the repository index available
ferrus-nano --workspace /path/to/project --interactive --graph \
  --prompt "Inspect the parser"

# Pick up an earlier session
ferrus-nano --workspace /path/to/project --interactive --resume PREVIOUS_ID
```

The view is the same one HQ uses. It shows tool calls and results, streaming
previews, cumulative usage, and input requests. Pressing Enter while Nano is
working queues your text as steering for the next safe point in the session.
Your draft stays in the editor until the journal has durably accepted it, so a
full queue doesn't lose it.

| Keys | Action |
|---|---|
| Enter | Send a request, or queue steering |
| Alt+Enter, Shift+Enter | New line (bracketed paste also keeps multiple lines) |
| Left, Right, Home, End, Backspace, Delete | Edit the draft |
| Up, Down | Recall accepted requests |
| PgUp, PgDn, mouse wheel | Scroll history |
| Ctrl+Home, Ctrl+End | Jump to the beginning or to the latest output |
| Ctrl+C, `/cancel`, `/quit` | Cancel the session and exit |

New output doesn't move the view while you're reading history. HQ slash
commands, task questions, and lifecycle controls aren't available here.

Cancelling stops the commands Nano owns, waits for them, and exits once the
session has recorded its result. A clean cancellation exits zero. Any other ending
stays on screen until you exit, and returns a failure status. Diagnostics go to
`diagnostics.log` in the session directory, so they don't disturb the terminal.

## Headless requests

Leave out `--interactive` to run one request. The prompt comes from `--prompt`
or from stdin:

```bash
ferrus-nano --workspace /path/to/project --prompt "Fix the parser and run its tests"
printf '%s\n' "Inspect the parser" | ferrus-nano --workspace /path/to/project
```

Stdout receives the final model response. Stderr receives the session ID, the
journal path, and diagnostics. Exit code zero means the model finished its
response and the journal recorded that. It doesn't mean tests passed. Ctrl+C
cancels the session and stops the commands it owns.

## What it can do

Standalone Nano has the file, command, and context tools described in
[What Nano can do today](/docs/nano#what-nano-can-do-today): `read_file`,
`search_text`, `apply_patch`, `exec`, `read_process`, `read_output`,
`stop_process`, `load_instructions`, and `repository_fallback`.

It loads the root `AGENTS.md` automatically. Nested guidance and explicit
skills go through the same bounded loader as managed Nano.

There is no `wait_for_task`, `check`, `submit`, consultation, or task-backed
human question. To validate a change, Nano runs your commands through `exec`,
which issues no managed check receipt.

To work inside a ferrus project with its checks and project memory, use
[`/executor` in HQ](/docs/nano-hq#conversations) instead.

## Trust and safety

- **Files:** file tools apply the same path, digest, quota, and protected
  metadata rules as managed Nano.
- **Commands:** they run with your OS permissions. Their environment is
  allowlisted and doesn't inherit provider credentials, Git overrides, startup
  hooks, or ferrus authority.
- **MCP:** external peers receive only the environment you configure.
- **Git:** nothing is managed for you. Staging, commits, resets, and worktrees
  stay with you unless you explicitly ask for them.
- **Concurrency:** don't point it at a workspace that HQ, another harness, or
  another person is editing at the same time. Standalone sessions share an
  advisory lock per workspace, but that is not an orchestration lease.

## Sessions and continuation

Each session writes an append-only journal. Storage defaults to
`~/.ferrus/standalone/<workspace-id>/`, and the ID comes from the filesystem's
directory identity. Use `--storage` to choose another private directory
outside the workspace. Storage holds no registry, task rows, or orchestration
database.

```text
<storage>/workspace.json
<storage>/workspace.lock
<storage>/nano/sessions/<session-id>/events.jsonl
<storage>/nano/sessions/<session-id>/commands/
```

The session ID is printed to stderr, or you can choose one with
`--session-id NAME`. To continue later:

```bash
ferrus-nano --workspace /path/to/project --resume PREVIOUS_ID \
  --prompt "Continue with the next change"
```

Continuing creates a new journal. Nano imports a bounded copy of the previous
transcript as untrusted history. It doesn't replay tool calls or restart old
commands. Token, turn, tool-call, and retry budgets stay cumulative, while
current settings and scoped guidance are loaded fresh. Oversized history fails
rather than being silently dropped.

Recovery only repairs an incomplete journal tail and seals an interrupted
attempt. If a session has pending or unknown effects, unconfirmed commands, or
incomplete output spools, `--resume` refuses to continue before any inference.
Reconcile those by hand, then start fresh.

## Optional local context

Repository indexing is explicit and needs no ferrus project:

```bash
ferrus-nano --workspace /path/to/project --index-graph
ferrus-nano --workspace /path/to/project --graph --prompt "Find the parser entry points"
```

`--index-graph` builds or refreshes `<storage>/repo-graph.db` and exits without
reading provider settings. `--graph` exposes the three repository retrieval
tools. Queries never build an index, and they don't rescan the repository to
claim freshness: after external edits, freshness is `unknown`, and the file
tools remain the source of truth. After Nano's own edits, stale graph retrieval
is blocked until you reindex.

An existing curated [project memory](/docs/project-memory) sidecar can be
attached read-only:

```bash
ferrus-nano --workspace /path/to/project \
  --memory-sidecar /absolute/path/to/project-memory.db \
  --memory-namespace local:ferrus --memory-project PROJECT_ID \
  --prompt "Inspect prior specification decisions"
```

Standalone Nano doesn't discover, index, or author memory sources.

[External MCP tools](/docs/nano#external-mcp-tools) use `mcp_config_file` in
the provider file, as they do in HQ. Peers that depend on a managed binding are
left out.

## Flags

| Flag | Meaning |
|---|---|
| `--workspace <dir>` | **Required.** An existing directory. |
| `--interactive` | Open a terminal conversation. Without it, run one headless request. |
| `--prompt <text>` | Request text. Headless mode reads stdin when this is omitted. |
| `--resume <id>` | Continue an earlier session. |
| `--session-id <id>` | Use this journal ID instead of a random one. |
| `--config <path>` | Absolute path to the provider file. Otherwise `FERRUS_NANO_CONFIG`, then `~/.ferrus/nano.toml`. |
| `--storage <dir>` | Absolute private directory outside the workspace, whose parent must exist. |
| `--index-graph` | Build or refresh the local index and exit. |
| `--graph` | Expose the local repository index to the model. |
| `--memory-sidecar <path>` | Attach a read-only project memory sidecar. Needs the two flags below. |
| `--memory-namespace <ns>` | The sidecar's portable namespace. |
| `--memory-project <id>` | The sidecar's project ID. |
