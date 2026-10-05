---
id: nano
title: Nano (native executor)
sidebar_position: 6
slug: /nano
---

# Nano

**Nano** is ferrus's own coding-agent harness, new in **0.5.0-alpha.1**. It is
a small Rust agent runtime built into the `ferrus` binary. External backends
reach ferrus through MCP. Nano calls ferrus operations (claim, heartbeat,
check, submit, repository graph, project memory) directly as Rust functions,
with no loopback MCP server or JSON-RPC hop. It talks to a model through an
OpenAI-compatible Chat Completions endpoint. The first target is a local
[LM Studio](https://lmstudio.ai) server.

:::caution[Experimental: headless Executor only]
In this release Nano runs **only as a headless Executor** launched by HQ.
It cannot be the Supervisor or Reviewer, and interactive `/executor`
sessions are rejected. Pair it with an external supervisor such as
`claude-code` or `codex`. There are no measured performance claims yet, and
coding quality depends heavily on the model you load.
:::

## Install

Prebuilt release archives already include Nano, together with external MCP
tool support. The quick-install scripts use these archives:

```bash
curl -fsSL https://ferrus.dev/cli/install.sh | sh
```

Cargo's default feature set does **not** include Nano. From crates.io, enable
both features explicitly:

```bash
cargo install ferrus --version 0.5.0-alpha.1 --locked --profile dist --features nano-openai,nano-mcp
```

When building from source, use `--features nano-openai,nano-mcp`. You can use
`nano-openai` alone if you don't need external MCP tools. A build without
`nano-openai` reports the missing feature before HQ prepares a task.

## Set up with LM Studio

1. Start LM Studio's server on `http://127.0.0.1:1234` and load a model that
   supports **tool calls**.
2. Register Nano as the executor with the **exact** model ID LM Studio shows:

   ```bash
   ferrus register --supervisor claude-code --executor nano --executor-model YOUR_LOADED_MODEL_ID
   ```

3. Enter HQ and use the normal `/task` or `/run` workflow:

   ```bash
   ferrus
   ```

On the first registration, ferrus creates an owner-only provider file at
`~/.ferrus/nano.toml` and prints the resolved path. On Windows the file lives
in your user profile, for example `C:\Users\Alice\.ferrus\nano.toml`. The file
starts with three settings:

```toml
base_url = "http://127.0.0.1:1234/v1"
model = "YOUR_LOADED_MODEL_ID"
reasoning_effort = "none"
```

Registration never contacts the provider and never replaces an existing
file. It writes `[hq.executor] agent = "nano"` to `ferrus.toml` and creates
no MCP config entry. On later registrations, `--executor-model` overrides the
model from the file. Leave the flag out to clear the override and use the
file's `model`.

To use a different provider file, set `FERRUS_NANO_CONFIG` to an absolute,
owner-only path. It must be set in the shell that runs **both** `ferrus
register` and HQ:

```bash
export FERRUS_NANO_CONFIG=/absolute/private/path/nano.toml
ferrus register --executor nano
ferrus
```

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
[provider contract](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano-provider.md)
for them. `temperature` is the only sampling parameter Nano sends. Set
`top_p`, `top_k`, and penalties as the model's defaults in LM Studio. For
tuning sampling, context size, and quantization on local models, see
[Tuning local models](/docs/local-models).

## What Nano can do today

Nano only gets tools that fit the Executor role. It cannot create, approve,
or reset tasks. Lifecycle mutations always pass through the same SQLite
transactions and guards that external agents use via MCP.

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
- When HQ relaunches an interrupted Executor, Nano reconciles every
  in-flight effect before inferring again:
  - an unfinished patch is confirmed or ruled out by its before/after
    digests;
  - a lost `submit` is confirmed against the committed SQLite event.
- Effects that can't be proven, such as an unknown shell command, check, or
  MCP call, fail the task for manual reconciliation. Nano never replays them
  blindly.

### External MCP tools

With `nano-mcp`, Nano can call tools from local **stdio** MCP servers that you
list explicitly. Point `mcp_config_file` in `nano.toml` to a second
owner-only file:

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

## How HQ runs Nano

For each dispatch, HQ starts `ferrus nano run` in the task's prepared
worktree. HQ still owns the worktree and baseline, process supervision,
dispatch accounting, review, and recovery. Nano receives versioned JSONL
`start`/`cancel` commands on stdin and emits progress events on stdout.

- `/stop` sends `cancel` first and gives Nano two seconds to clean up. After
  that, HQ falls back to killing the process group.
- `ferrus --debug` also shows tool requests, model failures, output-limit
  continuations, and terminal outcomes in the HQ transcript.
- Logs go to `.ferrus/logs/executor_<task>_<timestamp>_<run>.log`. Look for
  `Nano diagnostic` entries. The full event stream is in the session's
  `events.jsonl`.
- `ferrus nano --version` prints the bundled ferrus version without loading
  provider settings.

### When a run fails

These failures mark the task **Failed** with a specific code, and Nano exits
non-zero:

- a non-retryable provider error: `nano_provider_failed` or
  `nano_provider_protocol`;
- an exhausted token, turn, tool-call, retry, or no-progress budget:
  `nano_limit_*`.

Budgets belong to the work phase, so restarting Nano doesn't refill them, and
changing settings doesn't silently restart the task. For longer tasks, raise
`session_tokens` (for example `session_tokens = 2000000`) before the next
work phase.

## Not there yet

- Interactive sessions (`/executor`), and the Supervisor and Reviewer roles.
- A standalone `ferrus-nano` executable.
- OS-level sandboxing. The only backend is `trusted_local`, so shell commands
  run with your user's permissions. The worktree and scrubbed environment are
  not a security boundary.
- Providers other than Chat Completions (for example, the Responses API).
- Published benchmarks against external agents. The pinned evaluation suite
  exists, but measured comparisons are still pending.

## Further reading

The in-repo design notes go deeper than this page:

- [Launch and HQ events](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano-launch.md)
- [Provider contract](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano-provider.md)
- [Workspace tools](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano-workspace.md) and [command sessions](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano-commands.md)
- [Native context](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano-context.md), [working set](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano-working-set.md), and [compaction](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano-compaction.md)
- [Managed lifecycle](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano-lifecycle.md) and [sessions and recovery](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano-sessions.md)
- [External MCP tools](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano-mcp.md)
- [Architecture](https://github.com/ferrus-dev/ferrus/blob/main/docs/ferrus-nano-architecture.md)
