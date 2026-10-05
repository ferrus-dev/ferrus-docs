---
id: quickstart
title: Quickstart
sidebar_position: 1
slug: /quickstart
---

import InstallTabs from '@site/src/components/InstallTabs';

# Quickstart

Get ferrus running against a project in under a minute.

## 1. Install

<InstallTabs />

From [crates.io](https://crates.io/crates/ferrus):

```bash
cargo install ferrus
```

Or build from source:

```bash
git clone https://github.com/ferrus-dev/ferrus
cd ferrus
cargo install --path .
```

Requires **Rust 1.95+**. ferrus is currently **alpha** — expect rough edges.

The install scripts ship prebuilt release archives that include the
experimental [Nano](/docs/nano) executor. `cargo install` uses the smaller
default feature set. Add `--features nano-openai,nano-mcp` if you want Nano.

## 2. Scaffold

Inside any project directory:

```bash
ferrus init
```

This creates:

- `ferrus.toml` — project config (check commands, limits, agent roles)
- `.ferrus/` — project-local templates, task/run artifacts, agent registry,
  and logs (gitignored)
- `~/.ferrus/projects/<project-id>/` — machine-local project metadata and
  the `ferrus.db` SQLite database, which is the runtime source of truth
- `.agents/skills/ferrus*/` — skill files your coding agents will load to
  understand their role

## 3. Register your agents

Tell ferrus which coding agent plays each role. Supported today:
`claude-code`, `codex`, `qwen-code` (experimental), `goose` (experimental —
convenient for local models), `opencode` (experimental — supervisor/
reviewer role only for now), and `nano` (experimental — ferrus's own native
harness, headless executor only; see [Nano](/docs/nano)).

```bash
ferrus register --supervisor claude-code --executor codex
```

This writes the right MCP server config (`.claude/mcp-supervisor.json` /
`.claude/mcp-executor.json` for Claude Code, `.codex/config.toml` for Codex,
`.qwen/settings.json` for Qwen Code, `opencode.json` for opencode) so agents
automatically pick up `ferrus serve` as a tool server. goose needs no config
file — ferrus attaches its role-scoped MCP server at launch instead. Nano
needs no MCP config either: it calls ferrus natively and keeps its provider
settings in `~/.ferrus/nano.toml`. See [Supported agents](/docs/agents) for
backend-specific notes.

## 4. Drop into HQ

Run `ferrus` with no arguments:

```bash
ferrus
```

You're now in **HQ** — a small interactive shell. Type `/` to see the
available slash commands, or jump straight in:

```
ferrus> /task
```

A supervisor spawns, you describe what you want, and the full
Executor → Reviewer loop runs automatically.

For larger features it's often worth drafting a written spec first:

```
ferrus> /spec
```

The supervisor walks you through a feature specification and saves it as
Markdown under `docs/specs/`. You can then point the next `/task` at that
file so the executor implements directly from an approved design. When every
milestone in the spec is done, `/archive-spec` records an `## Outcome`
summary and files the spent task/run artifacts away — see the
[Specs & Milestones guide](/docs/spec-and-milestones#closing-out-a-spec-archive-spec).

:::tip
Press **Ctrl+C** twice within 2 seconds to exit HQ.
:::

## 5. (Optional) Index your repository

ferrus can build a local structural index of your codebase so agents navigate
it by symbol and relationship instead of re-grepping it on every spawn. It is
opt-in — add the namespace to `ferrus.toml`:

```toml
[repository_graph]
enabled = true
```

Then build it:

```bash
ferrus graph index
ferrus graph status
ferrus graph search MyType --limit 10
```

The index lives in its own machine-local SQLite sidecar, is rebuildable, and is
safe to delete at any time — an absent index never blocks the task loop. See
[Repository graph](/docs/repository-graph) and
[Project memory](/docs/project-memory).

## What happens next

```text
ferrus> /task
  └─ supervisor → you describe the task → enqueue_task
       └─ executor (headless) → implements → check → submit
            └─ reviewer (headless) → reads submission → approve or reject
                 ├─ approved → Complete
                 └─ rejected → executor re-spawns with feedback
```

`max_parallel_tasks` in `ferrus.toml` controls how many tasks can have an
executor running at once — each task advances independently through its own
state.

Next, read about the [state machine](/docs/state-machine) and the
[available HQ commands](/docs/hq).
