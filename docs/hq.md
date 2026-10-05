---
id: hq
title: HQ commands
sidebar_position: 3
slug: /hq
---

# HQ commands

Running `ferrus` with no arguments drops you into **HQ** — a small
interactive shell that drives the state machine. Type `/` to see an
autocomplete menu; use **Tab** / **Shift+Tab** to navigate and **Enter**
to accept.

A status line at the bottom of the terminal shows the current task state
and retry/cycle counters in real time.

## Cheat sheet

| Command | Description |
|---|---|
| `/plan` | Free-form planning session with the supervisor (no task created). |
| `/spec` | Draft a feature specification with the supervisor and save it as a Markdown artifact you can later feed into `/task`. Offers to archive the currently selected spec first if it is already complete. |
| `/archive-spec` | Summarize the completed selected spec's work into an `## Outcome` section and archive its linked task and run artifacts. |
| `/milestones` | Select the current spec and milestone without creating a task. |
| `/task` | Queue one task from the next ready milestone with the supervisor, then run the SQLite scheduler. Supports `--manual` to skip milestone resolution and define a free-form task. |
| `/run [--limit N]` | Plan a **batch** run: queue tasks for every ready milestone in the selected spec (or up to `--limit`) and let the scheduler dispatch executors for all of them, bounded by `max_parallel_tasks`. |
| `/check` | Run the ferrus check gate from HQ. Supports `--force` to run regardless of task status. |
| `/supervisor` | Open an interactive supervisor session (no initial prompt). |
| `/executor` | Open an interactive executor session (no initial prompt). Not available when the executor is [Nano](/docs/nano), which runs headless only. |
| `/resume` | Manually resume the executor headlessly; also recovers consultation by relaunching both supervisor and executor. |
| `/review` | Manually spawn supervisor in review mode (escape hatch when automatic spawning failed). |
| `/status` | Show task state, agent list, and session log paths. |
| `/tasks` | List SQLite task runtime rows. |
| `/runs [--limit N]` | List recent run attempts from `ferrus.db`. |
| `/events [--limit N] [--run <id>]` | List recent runtime events from `ferrus.db`. |
| `/attach <name>` | Show log path for a running headless agent. |
| `/stop` | Stop all running agent sessions (prompts for confirmation). |
| `/reset` | Force-reset resettable tasks and clear their scoped artifacts (prompts for confirmation). Does **not** clear the selected spec or milestone. |
| `/reset-spec` | Clear the selected spec and milestone without affecting task state. |
| `/init [--agents-path]` | Initialize ferrus in the current directory. |
| `/register [--supervisor <agent>] [--executor <agent>]` | Register agent configs (same as `ferrus register`). |
| `/model <supervisor\|executor> <model>` | Update the supervisor or executor model override. Pass `--clear` to reset it to the agent default. |
| `/help` | List all HQ commands. |
| `/quit` | Exit HQ. |

## The happy path

```text
ferrus> /task
  └─ supervisor spawns → you describe the task → supervisor calls enqueue_task
       └─ SQLite scheduler dispatches an executor (headless) → implements → check → submit
            └─ reviewer spawns (headless) → reads submission → approve or reject
                 ├─ approved → Complete
                 └─ rejected → executor re-spawns with feedback
```

Every task is an independent SQLite row; `/task` and `/run` both *queue*
work, and a background scheduler tick (every 2 seconds) claims `pending`
tasks and spawns executors for them, up to `max_parallel_tasks` at a time.
With `max_parallel_tasks = 1` this behaves like the original single-task
loop, just backed by SQLite instead of `STATE.json`.

- `/reset` force-resets any **resettable** task (anything other than
  `Complete`) and clears its scoped `.ferrus/tasks/` and `.ferrus/runs/`
  artifacts; it prompts for confirmation if agents are actively working.

## Specifications and milestones (`/spec`, `/milestones`, `/reset-spec`)

`/spec` spawns a supervisor session that drafts a structured feature
specification with you and writes it as a Markdown file under the directory
configured in `[spec]` (default `docs/specs/`). When the supervisor exits,
the first incomplete milestone is automatically selected.

From there, `/task` is all you need — ferrus confirms the current milestone,
drafts the task with milestone context, runs the executor loop, and advances
to the next milestone automatically on `Complete`:

```text
ferrus> /spec       ← draft the spec; first milestone auto-selected
ferrus> /task       ← confirm milestone, run the loop → auto-advance on Complete
ferrus> /task       ← next milestone, repeat
```

`/milestones` is an escape hatch: use it when you need to jump to a specific
milestone, switch specs, or recover after manual edits.

Once a spec has more than one milestone with satisfied dependencies, `/run
[--limit N]` queues all of them (or up to `--limit`) in one shot instead of
calling `/task` repeatedly — the scheduler then works through them up to
`max_parallel_tasks` executors at a time.

`/reset-spec` clears the selected spec and milestone from state without
touching the task state or task files. Use it when you want to work on an
ad-hoc task with no spec context, or when the selection is stale and you
don't need to pick a new one right away.

Once every milestone in the selected spec is complete, `/archive-spec`
closes it out: the supervisor summarizes what actually shipped into an
`## Outcome` section on the spec, and — after you approve that text — the
linked task and run artifacts are moved into a machine-local archive so
`.ferrus/tasks/` and `.ferrus/runs/` stay focused on active work. `/spec`
offers the same archival step automatically when the spec you currently
have selected is already finished.

See the [Specs & Milestones guide](/docs/spec-and-milestones) for the full
workflow, spec file format, auto-advance, and spec archival behaviour.

## Consultation (`/consult`)

Any active executor work state (`Executing`, `Addressing`) can
pause into `Consultation`. HQ spawns the configured supervisor in consult
mode, and the executor immediately calls `wait_for_consult` to block until
the supervisor answers via `respond_consult`.

This is how the executor asks the supervisor questions mid-task without
ending the loop.

## Ask a human (`/ask_human`)

Any active state — including `Consultation` — can pause into `AwaitingHuman`.
The agent calls `wait_for_answer` and blocks. You type your answer directly
in the HQ terminal (raw text, no slash prefix), and the previous state is
restored when the answer lands.

## Quit

Press **Ctrl+C** twice within 2 seconds to exit. The first press shows a
yellow "Press Ctrl+C again to exit" prompt in the status line; the second
confirms.
