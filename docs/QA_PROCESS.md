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

## Review Modes

### Separate Session

Preferred for high-risk changes.

Use the review prompt template and pass only the review package, not the full historical discussion.

### Same-Session Agent

Allowed for lower-risk changes when speed matters, but less blind than a separate session.

## Completion Rule

A task may move from `qa` to `done` only after:

1. local verification is recorded
2. a QA review file exists
3. review findings were either fixed or explicitly accepted

## Update Rule

When creating or updating a QA file, also update:

- the task row in `docs/EXECUTION_PLAN.md`
- the execution log in `docs/EXECUTION_PLAN.md`
