# AgentFlow PRD

**Version**: v0.3  
**Status**: active

## 1. Product Positioning

AgentFlow is a desktop application for visually composing, running, and reusing multi-step agent workflows.

It is aimed at technical early adopters who already use agentic tools and want:

- better visibility into multi-step work
- reusable workflow structure
- local control instead of SaaS dependency

## 2. Why This Exists

Current agent workflows are too often trapped inside chat transcripts. That makes them hard to:

- inspect while running
- reproduce later
- share with teammates
- improve over time

The product value is not "AI in a canvas". The value is making multi-step agent work visible, repeatable, and editable.

## 3. Product Constraints

- Desktop-first
- Single-user first
- Local-first storage
- No mandatory backend
- Technical users only
- Windows-first in the current phase
- TypeScript + React + Vite in the implementation phase

## 4. Core User Value

The user should be able to:

1. open a workflow and understand it visually
2. run it and see which node is doing what
3. inspect outputs and failures without hunting through chat logs
4. save and rerun the workflow later
5. package working flows into reusable prefabs

## 5. Core Concepts

- `Workflow`: graph of nodes and edges
- `Node`: executable or control/data unit with schema-backed params
- `Edge`: typed connection between ports
- `Run`: one execution record for a workflow
- `Prefab`: reusable packaged subgraph
- `Schema`: the single source of truth for node configuration
- `Agent Provider`: pluggable backend behind `AgentTask`, not limited to OpenClaw

## 6. Product Requirements

### P0

- editable workflow canvas
- schema-driven node definitions
- runnable DAG execution
- local workflow persistence
- local run records and logs
- basic runtime visibility
- Windows-first `Script` execution
- local-dialog `HumanApprove`
- first-slice prefab support

### P1

- prefab packaging and reuse
- richer control flow
- run replay and rerun primitives
- GitHub-based sharing flow
- UI smoke automation

### P2

- optional collaboration and platform features
- optional backend migration if real usage demands it

## 7. Non-Goals

- non-technical end users
- enterprise SaaS features
- real-time collaborative editing in the first phase

## 8. Success Criteria

### Near-term

- the author can use AgentFlow for real tasks repeatedly
- workflows become easier to inspect and rerun than equivalent chat-based flows
- at least one teammate can open and understand a shared workflow without hand-holding

### Medium-term

- repeated tasks are captured as prefabs
- repo-based sharing is good enough before any platform build-out

## 9. Product Risk

The main risk is not missing UI polish. The main risk is weak internal architecture causing every new node or workflow feature to require touching runner, IPC, storage, and UI at once.

That is why the architecture work in `ARCHITECTURE.md` and the domain contracts in `DATA_MODEL.md` are product-critical, not engineering garnish.
