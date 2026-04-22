# AgentFlow Architecture

**Version**: v0.3  
**Status**: active  
**Shape**: Electron desktop app, local-first, no required backend service

## 1. Decisions That Are Locked

- Electron is the only active runtime model.
- The app is local-first and file-backed.
- Unsuffixed files in `docs/` are the only canonical documents.
- JSON Schema is the single source of truth for node definitions.
- The runner is a scheduler, not a bag of node-specific business logic.
- Service and store boundaries are required before feature expansion.
- Windows is the only priority platform in the current phase.
- IPC is the only active transport in v0.3. No local Express thin layer is planned.

## 2. High-Level Architecture

```text
Renderer (React / ReactFlow / Zustand)
  -> IPC client
Main process (Node.js / Electron)
  -> services
  -> stores
  -> registry
  -> runner
Local filesystem
  -> workflows
  -> prefabs
  -> runs
  -> schemas
  -> config
```

The renderer owns editing and presentation. The main process owns execution, persistence, and external integrations.

## 3. Core Boundaries

### 3.1 Renderer

Owns:

- canvas editing
- inspector rendering
- runtime visualization
- local UI state

Does not own:

- workflow execution
- file IO
- schema persistence
- run lifecycle rules

### 3.2 IPC Layer

Owns:

- transport between renderer and main process

Does not own:

- business rules
- persistence
- execution policy

The intended v0.3 flow is:

```text
renderer -> ipcHandlers -> services -> stores/runner/registry
```

Future backend migration should replace transport only, not business services.

### 3.3 Services

Own:

- workflow use cases
- prefab use cases
- run lifecycle use cases
- schema lookup and validation

They coordinate stores, registry, and runner. They should be the place where future desktop-vs-server transport changes are absorbed.

### 3.4 Stores

Own:

- read/write of workflow files
- read/write of run records and event logs
- prefab persistence
- schema persistence
- config persistence

They do not know about IPC or renderer concerns.

### 3.5 Registry

Owns:

- loading node manifests
- binding schema to executable handlers
- exposing node capabilities to services and runner

The registry contract should grow beyond `execute()` to include manifest metadata and runtime capabilities.

### 3.6 Agent Adapters

Agent execution must not be bound to OpenClaw. The architecture should support a provider adapter layer, for example:

```text
src/main/adapters/agents/
├── openclawAdapter.*
├── localAdapter.*
└── customAdapter.*
```

`AgentTask` is a generic node type. Provider-specific behavior belongs in adapters.

### 3.7 Runner

Owns:

- DAG validation
- scheduling
- state transitions
- downstream activation
- failure propagation

The runner should not know about specific node types. If a feature requires special casing a node type inside the runner, the node contract is probably incomplete.

## 4. Domain Objects

The following contracts are the architectural center of gravity and must be documented before broad feature work:

- `WorkflowDocument`
- `Workflow`
- `NodeInstance`
- `Edge`
- `NodeTypeManifest`
- `NodeHandler`
- `RunRecord`
- `NodeRunState`
- `RuntimeEvent`
- `NodeExecutionContext`

Detailed definitions live in [DATA_MODEL.md](C:\Users\rongyu\.openclaw\workspace-coder\sandbox\shared\agentflow\docs\DATA_MODEL.md).

## 5. Execution Model

The active execution model is ready-queue scheduling over a DAG.

Required behavior:

- validate DAG before execution
- initialize per-node state
- enqueue nodes whose inbound dependencies are satisfied
- execute node handlers with a standard context object
- update downstream state via edges
- mark failure and skip downstream according to explicit policy
- record events and run state through stores

The runner may remain single-threaded for now. Parallelism is a future optimization, not a prerequisite.

## 6. Node System

Every node type should be defined by:

1. A JSON Schema file for parameters and port metadata.
2. A manifest derived from that schema.
3. A handler implementation.

Minimum handler contract:

- `execute(inputs, params, ctx)`

Planned contract growth:

- `validate`
- `estimate`
- `resume`
- `cancel`
- `buildCacheKey`
- `supportsStreaming`

That growth should happen in the registry and handler contract, not through runner branching.

P0 node priorities are:

- `UserInput`
- `Output`
- `LLMStep`
- `Script`
- small control/data primitives only when needed to validate the framework

## 7. Persistence Model

Canonical local buckets:

```text
data/
├── workflows/
├── prefabs/
├── runs/
└── schemas/
```

Expected artifacts:

- workflow document
- prefab document
- run metadata
- run event log
- run outputs

The preferred run layout is:

```text
runs/<run-id>/
├── meta.json
├── events.jsonl
└── outputs/
```

Checkpointing may be introduced later, but only after `RunRecord` and `RuntimeEvent` are stabilized.

Large outputs should be written under `outputs/`, while events store only previews or file references.

## 8. Current P0 Decisions

- `Script` is P0 and Windows-first.
- `HumanApprove` in P0 is local-dialog only; remote providers come later.
- `Prefab` is in scope, but only the first slice:
  - prefab document format
  - create prefab
  - reference prefab instance
  - fixed version reference
- `AgentTask` must route through provider adapters and stay provider-agnostic.
- Detailed run logs are required for debugging during development.

## 9. Evolution Rules

- New product capability should map first to a domain object or service.
- If a change only exists in a UI doc and not in `DATA_MODEL.md`, the design is incomplete.
- If a feature needs direct file reads in renderer code, the boundary is wrong.
- If a feature needs runner conditionals by node type, the node contract is wrong.

## 10. Current Gaps

The skeleton is directionally correct, but these gaps must be addressed before large-scale feature work:

- missing explicit service/store layers in code
- incomplete node handler contract
- incomplete persistence abstraction
- missing canonical runtime event and run record implementation
- documentation drift from old v0.2 assumptions

## 11. Next Architecture Work

1. Stabilize `DATA_MODEL.md`.
2. Introduce `services/` and `stores/` modules in `src/main`.
3. Move file IO out of generic API helpers into stores.
4. Make the registry expose full node manifests.
5. Keep runner limited to scheduling and state transitions.
