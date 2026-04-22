# AgentFlow Execution Plan

**Version**: v0.3  
**Status**: active  
**Owner**: Codex + user

## Rules

1. This file is the canonical execution tracker for implementation work.
2. Every completed task must update its status here in the same change set or immediately after.
3. A task is not `done` until it passes QA.
4. QA for meaningful changes must include a second-pass review by another agent or session when feasible.
5. Review artifacts live under `qa/reviews/`.
6. The current implementation baseline is React + Vite + TypeScript, with development data under `data/rongyu/`.

## Status Model

- `todo`: not started
- `in_progress`: actively being implemented
- `blocked`: waiting on decision or prerequisite
- `qa`: implementation complete, awaiting verification
- `done`: verified and accepted

## Definition Of Done

A task can move to `done` only when all required checks are true:

- implementation exists in repo
- local verification was run and recorded
- expected behavior was manually or programmatically checked
- important regressions were considered
- a second-pass review was completed for non-trivial work
- this file was updated

## QA Policy

### Minimum QA

- inspect changed files
- run the smallest meaningful verification command
- confirm expected output or behavior
- record whether verification was manual, automated, or both

### Required Cross Review

Use a second agent or a separate session for:

- architecture changes
- runner changes
- persistence format changes
- Script execution changes
- Prefab changes
- anything touching more than one layer

### Cross Review Record

Each reviewed task should record:

- reviewer type: `agent` or `session`
- scope reviewed
- result: `pass`, `pass_with_notes`, or `fail`
- follow-up fixes if needed

Filename rule:

- `qa/reviews/qa_<task-id>_<shortsha>.md`

## Current Workstreams

| ID | Workstream | Status | Completion Gate |
|---|---|---|---|
| P0-01 | Introduce `services/` and `stores/` boundaries in `src/main` | qa | code + QA + cross review |
| P0-02 | Make the Electron shell minimally runnable (`preload.js`, renderer entry, template load path) | todo | app boots + QA + cross review |
| P0-03 | Implement canonical workflow and run document persistence | todo | save/load verified + QA |
| P0-04 | Normalize runtime event logging to `meta.json + events.jsonl + outputs/` | todo | log artifacts verified + QA + cross review |
| P0-05 | Build schema-driven registry and core node manifest flow | todo | registry path verified + QA |
| P0-06 | Implement first runnable nodes: `UserInput`, `Output`, `LLMStep`, `Script` | todo | node execution verified + QA + cross review |
| P0-07 | Add local-dialog `HumanApprove` with provider-ready extension seam | todo | dialog flow verified + QA |
| P0-08 | Implement first-slice Prefab support (document, create, fixed-version reference) | todo | prefab path verified + QA + cross review |
| P0-09 | Establish automated QA and review workflow for future tasks | todo | repeatable process verified |

## Completed Foundation Work

| ID | Item | Status | Notes |
|---|---|---|---|
| F-01 | Canonical v0.3 docs consolidated | done | current docs are unsuffixed |
| F-02 | Agent provider config added | done | `config/agents.json` + dotted config access |
| F-03 | Implementation baseline locked | done | TS + React/Vite + Vitest, `data/rongyu/`, provider rollout priority set |

## Update Protocol

When a task changes state, update:

1. the task row in this file
2. a short note under `Execution Log`
3. the current QA result if verification happened

## Execution Log

| Date | Task | Update |
|---|---|---|
| 2026-04-22 | F-01 | Consolidated canonical v0.3 docs and removed duplicate versioned docs from active `docs/`. |
| 2026-04-22 | F-02 | Added `config/agents.json` and upgraded config access to support dotted paths and provider config. |
| 2026-04-22 | F-03 | Locked TypeScript, React/Vite, Vitest baseline, `data/rongyu/` development storage, and provider rollout priority. |
| 2026-04-22 | P0-01 | Refactored workflow/template access behind `services/` and `stores/`, then tightened the boundary after blind review by separating template service from workflow service, splitting seed templates from mutable runtime data, and adding direct facade verification. Awaiting second blind QA review. |

## Review Workflow

### Main implementation pass

- implement task locally
- run local verification
- move task to `qa`

### Blind second pass

- ask another agent to review the change with a code-review mindset
- do not ask it to justify the design from prior discussion
- give it the changed files or diff and ask for findings first
- fix findings if needed
- only then move task to `done`

### Suggested review prompt

```text
Review this change as a blind second-pass reviewer.
Focus on bugs, regressions, weak assumptions, missing tests, and contract drift.
Findings first. Keep summary short.
```

Canonical prompt template:

- `qa/templates/REVIEW_PROMPT.md`

## CLI Review Modes

### Another agent in this session

Use `spawn_agent` when a task reaches `qa`, and give the reviewer only the task scope plus changed files.

Recommended pattern:

1. implement locally
2. gather changed files
3. spawn a reviewer agent
4. wait for findings
5. fix issues
6. mark `done`

### Separate session

If you want a more independent review, open another Codex session on the same repo and ask it to review the latest diff or commit without prior planning context.

Use this when you want stronger blindness than an in-thread spawned reviewer.
