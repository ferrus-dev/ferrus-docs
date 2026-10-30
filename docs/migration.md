---
id: migration
title: Migrating from 0.2.x
sidebar_position: 6
slug: /migration
---

# Migrating from 0.2.x to 0.3.0

ferrus 0.3.0-alpha.1 replaces the single-project `.ferrus/STATE.json` file
with a SQLite-backed runtime (`ferrus.db`) and a global project registry
under `~/.ferrus/projects/`. It also adds multi-task scheduling, `goose` and
`opencode` as new experimental backends, and a batch `/run` command. This
page covers what changed and how to move an existing 0.2.x project forward.

## What changed

| 0.2.x | 0.3.0 |
|---|---|
| Runtime state in `.ferrus/STATE.json` (+ `STATE.lock`) | Runtime state in SQLite (`ferrus.db`), one row per task |
| One active task per project | Multiple tasks in flight at once, bounded by `max_parallel_tasks` |
| `/task` runs the loop for the one active task | `/task` queues a task for the scheduler; `/run [--limit N]` queues a whole batch of ready milestones at once |
| `create_task` MCP tool | `enqueue_task` (role-scoped); `create_task` kept as a compatibility alias on unfiltered servers |
| `/reset` resets the single global state to `Idle` | `/reset` force-resets every **resettable** task (anything not `Complete`) and clears its scoped artifacts |
| Task artifacts directly under `.ferrus/` (`TASK.md`, `REVIEW.md`, …) | Task artifacts scoped per task: `.ferrus/tasks/<task-id>.md`, `.ferrus/runs/<task-id>/*.md` |
| No project registry | `~/.ferrus/projects/<project-id>/` holds `project.toml`, `ferrus.db`, and logs |
| Backends: Claude Code, Codex, Qwen Code (experimental) | Adds `goose` (experimental, local-model friendly) and `opencode` (experimental, supervisor/reviewer only) |
| `ferrus.toml` `[limits]` had no dispatch cap | New `max_executor_dispatches` bounds executor respawns per work phase |

None of this changes how you *drive* a task day to day — `/task`, `/spec`,
`/check`, `/consult`, `/ask_human` all behave the same from the operator's
seat. What changed is what's underneath.

## Upgrade steps

### 1. Update the binary

```bash
cargo install ferrus --version 0.6.0-alpha.1 --locked
# or re-run install.sh / install.ps1 to pull the latest release
```

### 2. Run the migration command

:::caution
`ferrus migrate` removes the legacy `.ferrus/STATE.json` and `.ferrus/STATE.lock`
as its final step, and downgrading afterwards is not supported (see
[Rollback](#rollback)). If you want a safety net, **copy
`.ferrus/STATE.json` somewhere before running this command** — once it's
gone, there's nothing to fall back to.
:::

From an existing 0.2.x project directory:

```bash
ferrus migrate     # alias: ferrus upgrade
```

This is safe to run on an already-migrated or brand-new project — it's a
one-time, idempotent registration step. It:

- registers the project in `~/.ferrus/projects/<project-id>/` and creates
  `ferrus.db`;
- writes `.ferrus/project.toml` pointing at the registry entry;
- creates `.ferrus/tasks/` and `.ferrus/runs/`;
- if a legacy `.ferrus/STATE.json` is present, imports its active task
  (including paused `Consultation` / `AwaitingHuman` state and counters)
  into a SQLite task row, and copies non-empty legacy artifacts
  (`TASK.md`, `REVIEW.md`, `SUBMISSION.md`, `QUESTION.md`, `ANSWER.md`,
  `CONSULT_REQUEST.md`, `CONSULT_RESPONSE.md`) into the new scoped layout;
- migrates the selected spec/milestone into the project's runtime state;
- removes the legacy `STATE.json` and `STATE.lock` files;
- normalizes any indexed/duplicate legacy MCP server entries in
  `.claude/mcp-supervisor.json`, `.claude/mcp-executor.json`,
  `.claude/settings.local.json`, `.qwen/settings.json`, and
  `.codex/config.toml`.

### 3. Re-run register if needed

If your Claude Code project still has a single root `.mcp.json` (the old
pre-role-scoped layout, before ferrus split configs into
`.claude/mcp-supervisor.json` and `.claude/mcp-executor.json`),
`ferrus migrate` won't rewrite that file — re-run registration to regenerate
the current per-role config:

```bash
ferrus register --supervisor claude-code --executor codex
```

This is also the moment to opt into `goose` or `opencode` if you want to
add a local-model backend — see [Supported agents](/docs/agents).

### 4. Verify

```bash
ferrus doctor
```

Confirms `.ferrus/project.toml`, the global registry entry, task/run
artifacts, and the `ferrus.db` schema all agree, and reports any
interrupted runs or expired leases. Follow up with:

```bash
ferrus recover --dry-run
```

to preview any pending recovery work without mutating state, then
`ferrus recover` (add `--worktrees` to also clean up orphaned task
worktrees) to apply it.

### 5. Review `ferrus.toml`

Nothing in `ferrus.toml` is removed or renamed, so an existing file keeps
working. Two additions are worth setting deliberately for 0.3.0:

```toml
[limits]
max_parallel_tasks = 1          # raise this to run tasks concurrently
max_executor_dispatches = 6     # new: bounds executor respawns per work phase
```

Leaving `max_parallel_tasks = 1` reproduces the exact 0.2.x single-task
behavior — SQLite-backed instead of file-backed, but otherwise identical.

## Rollback

Downgrading to a 0.2.x binary on an already-migrated project is not
supported — the 0.2.x binary doesn't know how to read `ferrus.db`, and
`ferrus migrate` has already removed the `STATE.json`/`STATE.lock` it would
need. `migrate` copies (rather than destructively rewrites) your task
artifacts, so the Markdown under `.ferrus/` survives, but the runtime state
does not roll back. If you need a genuine escape hatch, take the
`.ferrus/STATE.json` backup called out in [step 2](#2-run-the-migration-command)
*before* migrating, or migrate on a throwaway branch first.

## Multi-task behavior is opt-in

Existing single-task workflows are unaffected: with `max_parallel_tasks = 1`
(the default), only one task has an executor running at a time, exactly
like 0.2.x. Raise `max_parallel_tasks` and start using `/run --limit N`
once you're ready to have the scheduler work through several ready
milestones in parallel — see [HQ commands](/docs/hq) and the
[state machine](/docs/state-machine#the-sqlite-scheduler).
