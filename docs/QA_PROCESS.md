# AgentFlow QA Process

**Version**: v0.3  
**Status**: active

## Goal

Make QA repeatable, reviewable, and easy to hand off to a separate session for blind review.

## Directory Layout

```text
qa/
├── reviews/
│   └── qa_<task-id>_<shortsha>.md
└── templates/
    └── REVIEW_PROMPT.md
```

## Naming Convention

Use this filename format for every review record:

```text
qa_<task-id>_<shortsha>.md
```

Examples:

- `qa_P0-01_a1b2c3d.md`
- `qa_P0-04_f9e8d7c.md`

Why this format:

- task ID keeps workstream grouping clear
- short commit SHA binds the review to an exact code state
- filenames stay short and sortable

## When To Create A QA Record

Create a QA record when a task reaches `qa` status in `docs/EXECUTION_PLAN.md`.

Always create one for:

- architecture changes
- runner changes
- persistence format changes
- Script changes
- Prefab changes
- multi-layer changes

## Required Fields

Each QA record must contain:

- task ID
- goal
- commit SHA
- changed files
- expected behavior
- local verification performed
- known risks
- reviewer mode: `same-session agent` or `separate session`
- review result: `pass`, `pass_with_notes`, or `fail`
- follow-up fixes

The QA record binds to the reviewed code state by commit SHA. It may be added in the same change set as the reviewed code, or immediately after the review in a documentation-only follow-up change, as long as the record clearly names the reviewed SHA.

## Review Modes

### Default Review Pass

Run this immediately after local verification to catch obvious issues before formal sign-off.

Preferred CLI entrypoint in this environment:

- `codex-paperhub exec review --uncommitted --ephemeral`

Use `codex-paperhub` instead of bare `codex` so the spawned review process inherits the Paperhub provider configuration used by the main session.

Treat this as a fast findings pass, not the final acceptance review.

If it returns findings:

1. fix the findings
2. rerun local verification
3. update the QA record with the fixes applied

### Separate Session

Preferred for high-risk changes.

After the default review pass is clean, start a formal blind review in a separate session.

The implementation session may launch that formal review itself through `codex-paperhub exec` with a prompt, or a human may open a separate Codex session manually. The requirement is review independence and a fixed review target, not who clicks the button.

Use the review prompt template and pass only the final review package, not the full historical discussion.

The formal review should target the final code state that is intended to move from `qa` to `done`, ideally by commit SHA or an equivalent fixed diff.

### Same-Session Agent

Allowed for lower-risk changes when speed matters, but less blind than a separate session.

## Completion Rule

A task may move from `qa` to `done` only after:

1. local verification is recorded
2. the default review pass was run and its findings were fixed or explicitly accepted
3. a QA review file exists for the final code state
4. a formal blind review was completed for that final code state

## Update Rule

When creating or updating a QA file, also update:

- the task row in `docs/EXECUTION_PLAN.md`
- the execution log in `docs/EXECUTION_PLAN.md`
