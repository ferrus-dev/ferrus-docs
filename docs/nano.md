---
id: nano
title: Nano
sidebar_position: 6
slug: /nano
---

import InstallTabs from '@site/src/components/InstallTabs';

# Nano

**Nano** is ferrus's own coding-agent harness: a small Rust agent runtime that
talks to a model through an OpenAI-compatible Chat Completions endpoint. The
first target is a local [LM Studio](https://lmstudio.ai) server.

**New in 0.6.0-alpha.1:** Nano is interactive, and it no longer needs ferrus
around it. The `ferrus-nano` binary opens a coding conversation in any
directory, with no HQ, no registration, and no task database. Inside HQ, you
can now talk to Nano directly, and it can play the Supervisor, Reviewer, and
Consultant roles as well as the Executor.

:::caution[Experimental]
There are no measured performance claims yet, and coding quality depends
heavily on the model you load. Nano has no OS sandbox: its shell commands run
with your user's permissions, with no approval prompt for each command.
:::

## Three ways to run Nano

| Mode | Start it with | You need | Use it for |
|---|---|---|---|
| **[Standalone](/docs/nano-standalone)** | `ferrus-nano` in a terminal | A provider file | Coding in any directory, Git or not, without orchestration |
| **[HQ conversation](/docs/nano-hq#conversations)** | `/executor` or `/attach` in HQ | A ferrus project with Nano as the Executor | Talking to Nano about a project, or steering a running task |
| **[Managed roles](/docs/nano-hq)** | `/task`, `/run`, `/spec` in HQ | A ferrus project with Nano registered | The normal Supervisor → Executor → Reviewer loop |

All three share the same engine, provider file, native tools, and durable
journal. External backends reach ferrus through MCP. Nano calls ferrus
operations (claim, heartbeat, check, submit, repository graph, project memory)
directly as Rust functions, with no loopback MCP server or JSON-RPC hop.

## Install

Release archives contain two binaries: `ferrus` for HQ and orchestration, and
`ferrus-nano` for the standalone agent. Nano and external MCP tool support are
compiled into both.

<InstallTabs defaultComponent="nano" />

- **Full bundle** installs both binaries.
- **Standalone Nano** installs only `ferrus-nano`, which is all you need
  outside a ferrus project.
- **Ferrus only** installs only `ferrus`, which can still run Nano inside HQ.

Every option downloads and verifies the same archive, and leaves any binary
you didn't select in place. See [Install options](/docs/quickstart#install-options)
to change the destination or pin a release.

Cargo's default feature set does **not** include Nano, and ferrus only has
alpha releases so far, so name both the version and the features:

```bash
cargo install ferrus --version 0.6.0-alpha.1 --locked --profile dist --features nano-openai,nano-mcp
```

This installs both binaries. Add `--bin ferrus-nano` to install only the
standalone agent. You can use `nano-openai` alone if you don't need external
MCP tools. A `ferrus` build without `nano-openai` reports the missing feature
before HQ prepares a task, and `ferrus-nano` is not built at all.

## Set up a provider

Start LM Studio's server on `http://127.0.0.1:1234` and load a model that
supports **tool calls**. Nano then reads its settings from a private provider
file, by default `~/.ferrus/nano.toml`. On Windows the file lives in your user
profile, for example `C:\Users\Alice\.ferrus\nano.toml`.

```toml
base_url = "http://127.0.0.1:1234/v1"
model = "YOUR_LOADED_MODEL_ID"
reasoning_effort = "none"
```

Use the **exact** model ID LM Studio shows. There are two ways to create the
file.

### With `ferrus register`

In a ferrus project, registration creates the file on first use and prints the
resolved path:

```bash
ferrus register --supervisor claude-code --executor nano --executor-model YOUR_LOADED_MODEL_ID
ferrus
```

To run Nano in every role, register it for both. One model flag is enough,
because both roles read the same file:

```bash
ferrus register --supervisor nano --supervisor-model YOUR_LOADED_MODEL_ID --executor nano
```

Registration never contacts the provider and never replaces an existing
file. It writes `agent = "nano"` to `ferrus.toml` and creates no MCP config
entry. On later registrations, `--executor-model` and `--supervisor-model`
override the model from the file. Leave a flag out to clear that override and
use the file's `model`.

### By hand

Without `ferrus`, create the file yourself. See the
[standalone quick start](/docs/nano-standalone#quick-start).

### Using a different file

Set `FERRUS_NANO_CONFIG` to an absolute, owner-only path. In a ferrus project
it must be set in the shell that runs **both** `ferrus register` and HQ:

```bash
export FERRUS_NANO_CONFIG=/absolute/private/path/nano.toml
ferrus register --executor nano
ferrus
```

`ferrus-nano` also accepts `--config`, which takes precedence over the
variable.

### Provider settings

Keep the file outside the repository. On Unix it must be mode `0400` or
`0600`; on Windows it needs a protected owner-only DACL. Unknown keys fail
explicitly, and so does an inline `api_key`.

| Key | Default | Meaning |
|---|---|---|
| `base_url` | required | Endpoint ending in `/v1`. Plain HTTP is allowed only on loopback; other hosts need HTTPS. |
| `model` | required | The model ID. Nano never picks a model automatically. |
| `reasoning_effort` | server default | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, or `max`. `none` can turn off reasoning on local thinking models, so the output budget goes to tool calls. |
| `api_key_file` | none | Absolute path to an owner-only file that holds only a Bearer token. Without it, requests carry no `Authorization` header. |
| `temperature` | server default | Optional sampling override. |
| `context_tokens` | none | Optional per-request window used for Nano's own admission and compaction. It is never sent as a model-loading parameter. |
| `session_tokens` | `1000000` | Hard cumulative input + output budget for the whole work phase, including retries and summaries. |
| `max_output_tokens` | automatic | Optional per-response ceiling. Without it, Nano derives a cap from the context and session budgets. |
| `request_timeout_ms` | `120000` | Read-inactivity timeout. Receiving bytes resets it. |
| `include_usage` | `true` | Request streamed usage. Set it to `false` if your server doesn't support it; Nano then estimates usage. |
| `mcp_config_file` | none | Opt-in [external MCP tools](#external-mcp-tools). |
| `working_set_enabled` / `native_context_enabled` | `true` | Switches for evaluation runs. Leave them on for normal use. |

Three advanced stream limits are also accepted: `wire_bytes`,
`event_bytes`, and `max_tool_calls`. See the
[provider contract](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-provider.md)
for them. `temperature` is the only sampling parameter Nano sends. Set
`top_p`, `top_k`, and penalties as the model's defaults in LM Studio. For
tuning sampling, context size, and quantization on local models, see
[Tuning local models](/docs/local-models).

## What Nano can do today

The host picks the tools for each profile, independently of what the model
asks for. The Executor gets everything below.
[Standalone](/docs/nano-standalone#what-it-can-do) and
[direct HQ](/docs/nano-hq#direct-and-managed-conversations) sessions get the
file, command, and context tools without the managed lifecycle.
[Supervisor](/docs/nano-hq#nano-as-supervisor) and
[Reviewer](/docs/nano-hq#reviewer-and-consultant) profiles can't edit code or
run commands.

The Executor cannot create, approve, or reset tasks. Lifecycle mutations always
pass through the same SQLite transactions and guards that external agents use
via MCP.

### Code in the task worktree

- **`read_file` / `search_text`**: bounded reads of whole lines and literal,
  case-sensitive search. Each result includes the file's SHA-256 digest.
- **`apply_patch`**: exact, digest-checked edits. A single-file call replaces
  one exact substring that must appear exactly once. A batch can create,
  update, or delete up to 16 files. A stale digest returns `conflict` and
  writes nothing. There is no fuzzy matching or line-number guessing.
- Nano can't reach `.git`, `.ferrus`, ferrus databases, symlinks, or files
  outside the worktree. Git staging, commits, and integration stay with
  ferrus.

### Run commands

- **`exec`, `read_process`, `stop_process`, `read_output`**: start shell
  commands in the background, poll them, cancel the whole process tree, and
  page through bounded stdout and stderr.
- Commands run with a scrubbed environment. Provider keys, MCP secrets, and
  ferrus launch credentials are not inherited.
- Defaults: 4 concurrent commands, 10 minutes per command, 4 MiB of output
  per command.

### Drive the ferrus lifecycle natively

- **`check`** runs the configured `[checks]` with the same retry accounting
  as external agents. **`submit`** runs the check gate and the final review
  gate, then hands the task to Reviewing.
- **`consult`** and **`ask_human`** pause the task and wait for the Supervisor
  or for you to answer, and return the actual reply.
- Claiming, lease heartbeats, and waiting for answers are handled by the host,
  so they cost no model turns.
- A final model sentence never marks a task done. Only Supervisor approval
  does.

### Use repository context

- Nano exposes the [repository graph](/docs/repository-graph) and
  [project memory](/docs/project-memory) retrieval tools natively:
  `repository_graph_status`, `repository_search`, `repository_context`,
  `project_memory_status`, `project_context_search`, `project_context`.
- **`repository_fallback`** reads or searches the workspace directly when
  graph coverage is missing or stale. The model has to state a reason, and
  fallback results are never treated as graph facts.
- A **working set** chooses which earlier evidence to resend each turn,
  re-checks source digests before reusing anything, and drops evidence for
  files that changed. After edits, it refreshes the task's graph overlay with
  a short debounce.
- Nano loads **scoped instructions**: root and nested `AGENTS.md` files for
  the paths being edited, plus selected `.agents/skills/<name>/SKILL.md`
  files, with digests and size caps.

### Stay within budget

- Before each request Nano measures the payload and reserves room for the
  output. If the context is full, it first swaps large old read-only tool
  results for short handles that the model can re-run. If that's not enough,
  it summarizes older turns. The task and constraints are never dropped.
- A response cut off by the output limit (`finish_reason = "length"`)
  continues in the same session. Tool calls from a truncated response are
  never executed.
- Rate limits (429), transient 5xx errors, and broken streams are retried
  with backoff, from the same session budget.

### Survive crashes

- Each run writes a durable journal under
  `~/.ferrus/projects/<project-id>/nano/sessions/<run>/`.
  Standalone sessions keep theirs under
  [`~/.ferrus/standalone/`](/docs/nano-standalone#sessions-and-continuation).
- When HQ relaunches an interrupted Executor, Nano reconciles every
  in-flight effect before inferring again:
  - an unfinished patch is confirmed or ruled out by its before/after
    digests;
  - a lost `submit` is confirmed against the committed SQLite event.
- Effects that can't be proven, such as an unknown shell command, check, or
  MCP call, fail the task for manual reconciliation. Nano never replays them
  blindly.

### External MCP tools

With `nano-mcp`, the Executor and standalone Nano can call tools from local
**stdio** MCP servers that you list explicitly. Point `mcp_config_file` in
`nano.toml` to a second owner-only file:

```toml
[[servers]]
id = "local"
command = "/usr/local/bin/my-mcp-server"   # must be absolute
args = ["--stdio"]
allow = ["lookup"]                          # exact tools the model may call
timeout_ms = 10000

[servers.env]
PATH = "/usr/local/bin:/usr/bin"
```

The model sees these tools as `mcp_<server-id>_<tool>`, and they can't
shadow native tools. Each peer gets only the environment you configure.
Arguments are validated against the pinned input schema, and outputs are
capped at 24 KiB. HTTP transport, OAuth, MCP resources, prompts, sampling,
and elicitation are not supported yet.

## Not there yet

- OS-level sandboxing and per-command approval. The only backend is
  `trusted_local`, so shell commands run with your user's permissions. The
  worktree and scrubbed environment are not a security boundary.
- Native review outside Git, or of a submission without a frozen graph view.
  See [Reviewer and Consultant](/docs/nano-hq#reviewer-and-consultant).
- Providers other than Chat Completions (for example, the Responses API).
- Published benchmarks against external agents. The pinned evaluation suite
  exists, but measured comparisons are still pending.

## Further reading

The in-repo design notes go deeper than this page:

- [Launch and HQ events](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-launch.md)
- [Standalone Nano](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-standalone.md) and [HQ conversations](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-interactive.md)
- [Supervisor authoring](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-supervisor.md) and [review and consultation](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-review.md)
- [Provider contract](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-provider.md)
- [Workspace tools](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-workspace.md) and [command sessions](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-commands.md)
- [Native context](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-context.md), [working set](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-working-set.md), and [compaction](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-compaction.md)
- [Managed lifecycle](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-lifecycle.md) and [sessions and recovery](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-sessions.md)
- [External MCP tools](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-mcp.md)
- [Architecture](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano/ferrus-nano-architecture.md)
