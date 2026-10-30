---
id: nano-hq
title: Nano in HQ
sidebar_label: In HQ
sidebar_position: 8
slug: /nano-hq
---

# Nano in HQ

Once [registered](/docs/nano#with-ferrus-register), Nano works in
[HQ](/docs/hq) like any other backend, and it adds two things external agents
don't have: conversations rendered inside HQ itself, and native Supervisor,
Reviewer, and Consultant profiles that need no MCP server.

## Conversations

With Nano as the Executor, HQ can show a live conversation with streaming
previews, tool calls and results, and token usage.

| Command | What it does |
|---|---|
| `/executor` | Open a direct conversation in the project workspace. It needs no queued task and waits for your first message before calling the model. Repeat it to reconnect to the same live session. |
| `/attach executor:nano:1` | Reconnect to the direct session, with its history. |
| `/attach executor:nano:<task-id>` | Open that task's active run, or its latest saved run if no process remains. |
| `/detach` | Return to the dashboard. The Executor keeps running and task state doesn't change. |
| `/cancel` | Cancel the selected attempt, stop its writers, and record the outcome. |

Attaching to a live headless run enables interaction through its existing
command pipe, at a safe point in the session. The process isn't replaced, and
no effects are replayed. A completed run is read-only.

### Steering

Type plain text to queue steering for the next model turn. Nano commits your
input after the current inference and its complete group of tool calls, before
the next inference starts. It never interrupts a patch. HQ keeps your text
until the journal has accepted it, and allows one unconfirmed request at a
time. If the queue is full, your text stays put so you can retry.

A final text response waits for your input. Failure, cancellation, and
configured session limits end the attempt. In a managed conversation, `submit`
ends it normally.

If Nano calls `ask_human`, HQ shows the question panel, and the text you type
is recorded as the answer ahead of ordinary steering.

PageUp, PageDown, and the mouse wheel scroll the conversation. Ctrl+Home and
Ctrl+End jump to its beginning and to the latest output. The view holds still
while you're reading history.

### Direct and managed conversations

| | Direct (`/executor`) | Managed (attached to a task) |
|---|---|---|
| **Workspace** | Canonical project workspace | The task's worktree |
| **Task, lease, dispatch budget** | None used | The task's own |
| **`check`** | Runs the configured checks without touching retry counters | The normal check gate |
| **`submit`, `consult`, `ask_human`** | Not available. Nano asks questions in ordinary replies. | Available |
| **Repository graph** | Canonical view, refreshed best-effort after edits | The task's own view |
| **`/cancel`** | Ends the session. The next `/executor` opens a fresh one. | Pauses automatic dispatch for that task, until `/resume` or an answer to its human question |

Conversations don't widen Nano's authority. In Git projects, a direct session's
edits and checks share the canonical approval lock with integration. A running
command holds that lock until it stops, while an idle conversation doesn't
block approval. Without Git, direct and managed Executors share one workspace
slot.

The rendered view is never the source of truth. HQ rebuilds it from the
journal when you reconnect, and an assistant message can't complete a task.

## Nano as Supervisor

Nano can run the planning and authoring sessions that a Supervisor normally
handles:

```bash
ferrus register --supervisor nano --supervisor-model YOUR_LOADED_MODEL_ID
ferrus
```

| HQ entry point | Profile | What it can write |
|---|---|---|
| `/supervisor`, `/plan` | `plan` | Nothing: discuss and inspect only |
| `/task`, `/run` (task definition) | `task` | Tasks, through `enqueue_task` |
| `/spec` | `spec` | Specifications, through `create_spec` |
| `/archive-spec` | `archive` | The selected spec's outcome, through `archive_spec` |

These profiles keep native file search, scoped instructions, and repository
graph and project memory reads. Shell commands, arbitrary file writes, and
external MCP tools aren't exposed, so nothing can get around confirmation.

### Confirming a write

Before each write, the terminal shows the proposed task, spec, or Outcome in a
scrollable view. That screen is the only approval step:

| Input | Effect |
|---|---|
| Enter, or `approve` then Enter | Authorize the write |
| `reject` or Esc | Decline it |
| Ctrl+C | End the session |

Conversation text, queued steering, and claims made by the model can't approve
a write. Task, spec, and archive sessions return to HQ after saving what was
requested. Planning stays open until you cancel it.

If an authoring session fails, it keeps its stop reason on screen until you
press Esc, and saves `diagnostics.log` beside its journal.

## Reviewer and Consultant

`--supervisor nano` also selects Nano for review and consultation. Reviews
start from normal scheduling or `/review`, and SQLite picks the profile from
the bound task and run, so prompt text can't change it.

| Profile | Reads | Lifecycle tools |
|---|---|---|
| **Reviewer** | The submitted Git tree and the run's frozen graph view | `review_pending`, `approve`, `reject` |
| **Consultant** | The attached Executor's workspace and task view | `consultation_context`, `respond_consult` |

Both profiles also get file search, scoped instructions, repository and memory
reads, `read_artifact`, and `ask_human`. Neither can edit code, run shell
commands, call the Executor's `check` or `submit`, or use external MCP tools.

:::caution[Native review needs a frozen submission]
The Reviewer needs a **Git project** with the
[repository graph](/docs/repository-graph) enabled, so that the graph view is
frozen at submit. Without that evidence, HQ pauses automatic Nano review for
the submission and reports it once. The task stays in Reviewing, so you can
select another Supervisor to review it.
:::

The Reviewer reads a private copy built from the submitted Git blobs, so later
edits can't change what it sees. Inspection is capped at 20,000 entries, 8 MiB
per blob, and 128 MiB in total. A larger tree fails the task with
`nano_review_source_limit`.

Only `approve` integrates code, with the existing canonical lock, checks, and
merge or rollback path. A restart never replays an unknown approve, reject, or
consultation response: ambiguous effects need manual reconciliation.

## How HQ runs Nano

For each dispatch, HQ starts `ferrus nano run` in the task's prepared
worktree. HQ still owns the worktree and baseline, process supervision,
dispatch accounting, review, and recovery. Nano receives versioned JSONL
commands (`start`, `interact`, `steer`, `cancel`) on stdin and emits progress
events on stdout.

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
