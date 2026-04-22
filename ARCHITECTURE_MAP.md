# AgentFlow Architecture Map

## Canonical Rules

1. `docs/*.md` without version suffix is the current truth.
2. Versioned historical material belongs in git history or `archive/`.
3. Domain contracts change before implementation details change.
4. Runner schedules work; services coordinate use cases; stores own persistence.
5. IPC is the only active transport in v0.3.
6. Agent integrations must route through provider adapters.
7. The active implementation baseline is React + Vite + TypeScript.

## Layer Boundaries

### Renderer

- Purpose: editing, visualization, runtime display
- Allowed: view logic, store updates, IPC client calls
- Forbidden: file IO, node execution, persistence rules

### Main Process

- Purpose: orchestration, persistence, node execution, integrations
- Allowed: service coordination, repositories, registry, runner
- Forbidden: renderer state shaping inside low-level modules

## Main Process Modules

| File | Responsibility | Notes |
|---|---|---|
| `main.js` | Electron boot only | No business logic |
| `src/main/ipcHandlers.js` | IPC transport only | Delegate to services |
| `src/main/api.js` | Workflow-facing use cases | Should evolve into service facade |
| `src/main/runner.js` | DAG scheduling and state transitions | No node-type branching |
| `src/main/registry.js` | Node manifests and handlers | Schema-driven |
| `src/main/config.js` | Config access | Path-safe getters |
| `src/main/adapters/agents/*` | Provider-specific agent integrations | OpenClaw is only one provider |
| `src/main/utils/*` | Pure helpers | No IO side effects |

## Active Baseline

- frontend: React + Vite + TypeScript
- tests: Vitest first, Playwright later for smoke coverage
- development data root: `data/rongyu/`
- agent provider rollout: `openclaw -> ollama -> internal providers`

## Domain Contracts That Must Stay Stable

- `WorkflowDocument`
- `Workflow`
- `NodeInstance`
- `Edge`
- `NodeTypeManifest`
- `RunRecord`
- `RuntimeEvent`
- `NodeExecutionContext`

See [docs/DATA_MODEL.md](C:\Users\rongyu\.openclaw\workspace-coder\sandbox\shared\agentflow\docs\DATA_MODEL.md).

## Recommended Near-Term Structure

```text
src/main/
├── api.js
├── config.js
├── ipcHandlers.js
├── registry.js
├── runner.js
├── services/
│   ├── workflowService.js
│   ├── runService.js
│   ├── prefabService.js
│   └── schemaService.js
├── stores/
│   ├── workflowStore.js
│   ├── runStore.js
│   ├── prefabStore.js
│   └── schemaStore.js
└── utils/
```

## Editing Guidance

- Update docs when changing domain contracts.
- Add new node types through `schema + handler`, not runner conditionals.
- Keep transport concerns out of domain objects.
- Keep persistence format explicit and versioned.
