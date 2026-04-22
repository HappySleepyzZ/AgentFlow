# AgentFlow Roadmap

**Version**: v0.3  
**Status**: active

## Phase 0: Skeleton Stabilization

Goal:

- turn the current repository from "concept skeleton" into "stable foundation"

Deliverables:

- canonical v0.3 docs only
- stable data model
- explicit service/store boundaries
- minimal runnable Electron shell
- React + Vite + TypeScript shell locked in
- development data root established under `data/rongyu/`

## Phase 1: Core Contracts

Goal:

- make future feature work cheap instead of compounding

Work:

- finalize `Workflow`, `Run`, `Event`, and node manifest contracts
- implement service modules in `src/main/services`
- implement store modules in `src/main/stores`
- make registry schema-driven
- shrink runner to scheduler responsibilities only
- add agent provider adapter boundary
- lock Windows-first runtime assumptions for P0
- lock test baseline: Vitest now, Playwright smoke later

## Phase 2: Minimum Usable Runtime

Goal:

- run a small real workflow end to end

Work:

- add minimal renderer shell
- add preload and IPC bridge
- add `UserInput`, `LLMStep`, `Script`, and `Output`
- save/load workflow files
- persist run metadata and event logs
- support local-dialog `HumanApprove`
- use `data/rongyu/` as the active development dataset

## Phase 3: Control Flow and Runtime Operations

Goal:

- support meaningful composition and debugging

Work:

- branch and merge primitives
- variable nodes
- run cancellation hooks
- event stream normalization
- node-level failure handling and rerun scaffolding

## Phase 4: Reuse and Sharing

Goal:

- make workflows reusable instead of disposable

Work:

- prefab document format
- prefab creation and fixed-version references
- GitHub-based workflow sharing

Later prefab work:

- unpack
- overrides
- variants
- migration diff

## Sequencing Rule

Do not expand node count or integrations aggressively until Phase 1 is complete. The current repo can absorb features, but not safely at scale, without those contract and boundary changes.
