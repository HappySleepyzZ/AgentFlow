# AgentFlow Data Model

**Version**: v0.3  
**Status**: active

This document is the canonical contract reference for development.

## 1. Persistence Documents

### WorkflowDocument

```ts
interface WorkflowDocument {
  kind: "workflow";
  version: "0.3";
  workflow: Workflow;
}
```

### PrefabDocument

```ts
interface PrefabDocument {
  kind: "prefab";
  version: "0.3";
  prefab: Prefab;
}
```

### RunDocument

```ts
interface RunDocument {
  kind: "run";
  version: "0.3";
  run: RunRecord;
}
```

## 2. Graph Model

### Workflow

```ts
interface Workflow {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  nodes: NodeInstance[];
  edges: Edge[];
  variables?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}
```

### NodeInstance

```ts
interface NodeInstance {
  id: string;
  type: string;
  name?: string;
  position?: { x: number; y: number };
  params: Record<string, unknown>;
}
```

### Edge

```ts
interface Edge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  kind: "exec" | "data";
}
```

## 3. Node Type Model

### NodeTypeManifest

```ts
interface NodeTypeManifest {
  type: string;
  title: string;
  category: "work" | "control" | "data" | "integration";
  schema: JsonSchema;
  inputs: PortDef[];
  outputs: PortDef[];
  runtime?: {
    supportsStreaming?: boolean;
    supportsCancel?: boolean;
    supportsResume?: boolean;
    cacheable?: boolean;
  };
}
```

### PortDef

```ts
interface PortDef {
  name: string;
  kind: "exec" | "data";
  dataType?: "any" | "text" | "number" | "boolean" | "json" | "file";
  required?: boolean;
}
```

### NodeHandler

```ts
interface NodeHandler {
  execute(
    inputs: Record<string, unknown>,
    params: Record<string, unknown>,
    ctx: NodeExecutionContext
  ): Promise<Record<string, unknown>>;
}
```

### AgentProviderConfig

```ts
interface AgentProviderConfig {
  provider: string;
  enabled: boolean;
  baseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
  extra?: Record<string, unknown>;
}
```

## 4. Runtime Model

### RunRecord

```ts
interface RunRecord {
  id: string;
  workflowId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  startedAt: string;
  endedAt?: string;
  nodeStates: Record<string, NodeRunState>;
  inputSnapshot?: Record<string, unknown>;
  outputSnapshot?: Record<string, unknown>;
  error?: string;
}
```

### NodeRunState

```ts
interface NodeRunState {
  status: "pending" | "queued" | "running" | "done" | "failed" | "skipped";
  pendingInEdges: number;
  received: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  endedAt?: string;
}
```

### RuntimeEvent

```ts
type RuntimeEvent =
  | { type: "run.started"; runId: string; workflowId: string; ts: string }
  | { type: "run.finished"; runId: string; status: RunRecord["status"]; ts: string }
  | { type: "node.queued"; runId: string; nodeId: string; ts: string }
  | { type: "node.started"; runId: string; nodeId: string; ts: string }
  | { type: "node.stdout"; runId: string; nodeId: string; ts: string; chunk: string }
  | { type: "node.stderr"; runId: string; nodeId: string; ts: string; chunk: string }
  | { type: "node.finished"; runId: string; nodeId: string; ts: string; outputPreview?: unknown }
  | { type: "node.failed"; runId: string; nodeId: string; ts: string; error: string };
```

### NodeExecutionContext

```ts
interface NodeExecutionContext {
  runId: string;
  workflowId: string;
  nodeId: string;
  emit(event: RuntimeEvent): Promise<void> | void;
  now(): string;
}
```

## 5. Prefab Model

```ts
interface Prefab {
  id: string;
  name: string;
  version: string;
  workflow: Workflow;
  exposedInputs?: string[];
  exposedOutputs?: string[];
  exposedParams?: string[];
}
```

### PrefabReference

```ts
interface PrefabReference {
  prefabId: string;
  version: string;
}
```

P0 prefab scope is intentionally small:

- prefab document format
- create prefab
- reference prefab by fixed version

Variant, override, unpack, and migration diff are later-stage additions.

## 6. File Layout

```text
data/
├── workflows/*.flow.json
├── prefabs/*.prefab.json
├── runs/<run-id>/meta.json
├── runs/<run-id>/events.jsonl
└── schemas/*.schema.json
```

Agent and integration credentials should live in config, not inside workflow documents.

## 7. Contract Rules

- Renderer-facing payloads should be derived from these contracts, not invented ad hoc.
- IPC payloads should map directly to these contracts.
- Stores persist documents from this model.
- Services enforce workflow-level rules over this model.
- Runner mutates `NodeRunState`, not renderer state.
- Provider secrets such as `apiKey` must not be stored in workflow or prefab files.
