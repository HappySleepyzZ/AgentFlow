# AgentFlow 数据模型

**版本**：v0.1 draft

JSON / Pydantic 统一数据模型，用于前后端通信和持久化。

---

## 1. 核心实体

### Workflow（工作流）
```typescript
interface Workflow {
  id: string;              // UUID
  name: string;
  description?: string;
  version: string;         // "0.1.0"
  created_at: string;      // ISO8601
  updated_at: string;
  nodes: Node[];
  edges: Edge[];
  variables: Record<string, any>;
  meta?: {
    author?: string;
    tags?: string[];
  };
}
```

### Node（节点）
```typescript
interface Node {
  id: string;              // 图内唯一，如 "n_abc123"
  type: string;            // "LLMStep" | "AgentTask" | "prefab_instance" | ...
  name?: string;           // 用户可改的显示名
  position: { x: number; y: number };
  params: Record<string, any>;

  // Prefab 相关（仅当 type 为 prefab_instance/prefab_variant 时）
  prefab_ref?: {
    prefab_id: string;
    version?: string;      // 版本锁，不填为 latest
    variant?: boolean;     // 是否 variant
    overrides?: Record<string, any>;  // Variant 的 override
  };

  // 运行时状态（保存时不持久化，由 store 运行时注入）
  runtime?: NodeRuntime;
}

interface NodeRuntime {
  status: "pending" | "queued" | "running" | "done" | "failed" | "waiting_approval" | "cached";
  progress?: { current: number; total: number; label?: string };
  last_output_preview?: any;
  last_error?: string;
  metrics?: { tokens: number; cost: number; duration_ms: number };
}
```

### Edge（连线）
```typescript
interface Edge {
  id: string;
  source: string;          // source node_id
  source_port: string;     // output port name
  target: string;
  target_port: string;
  kind: "exec" | "data";   // 执行流 or 数据流
}
```

### Prefab（封装模板）
```typescript
interface Prefab {
  id: string;              // "配表流水线"
  version: string;         // semver
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  exposed_inputs: ExposedPort[];
  exposed_outputs: ExposedPort[];
  exposed_params: ExposedParam[];
}

interface ExposedPort {
  name: string;            // 对外暴露的端口名
  type: PortType;
  maps_to?: string;        // 内部节点端口路径：`n_1.inputs.path`
  maps_from?: string;
}

interface ExposedParam {
  name: string;
  maps_to: string;         // `n_3.params.model`
  type: string;
  default?: any;
  description?: string;
}
```

### Run（运行记录）
```typescript
interface Run {
  id: string;
  workflow_id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  started_at: string;
  ended_at?: string;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  nodes: Record<string, NodeRuntime>;  // node_id -> runtime
  metrics?: {
    total_tokens: number;
    total_cost: number;
    total_duration_ms: number;
  };
  error?: string;
}
```

### Event（实时事件）
```typescript
type Event =
  | { type: "run.started";  run_id: string; workflow_id: string }
  | { type: "run.finished"; run_id: string; status: string }
  | { type: "node.started"; run_id: string; node_id: string; ts: number }
  | { type: "node.step";    run_id: string; node_id: string; step: { index: number; total: number; label?: string } }
  | { type: "node.finished";run_id: string; node_id: string; duration_ms: number; preview?: any; metrics?: NodeMetrics }
  | { type: "node.failed";  run_id: string; node_id: string; error: string }
  | { type: "node.cached";  run_id: string; node_id: string }
  | { type: "approval.requested"; run_id: string; node_id: string; question: string }
  | { type: "approval.resolved";  run_id: string; node_id: string; decision: string };
```

---

## 2. 节点类型注册表

后端内置的节点类型，注册在 `registry.py`：

```python
NodeTypeDef = {
    "type_name": "LLMStep",
    "category": "work",  # work | control | data
    "color": "#4A90E2",
    "icon": "sparkles",
    "inputs": [
        {"name": "context", "type": "any", "required": False},
        {"name": "in_exec", "type": "exec", "required": True},
    ],
    "outputs": [
        {"name": "result", "type": "text"},
        {"name": "out_exec", "type": "exec"},
    ],
    "param_schema": {  # JSON Schema
        "type": "object",
        "properties": {
            "model": {"type": "string", "enum": ["glm", "claude", "opus47"]},
            "prompt": {"type": "string", "format": "multiline"},
            "temperature": {"type": "number", "default": 0.7, "minimum": 0, "maximum": 2},
        },
        "required": ["model", "prompt"]
    }
}
```

前端拉取 `/api/node-types` 得到全部定义，自动渲染：
- 节点外观
- 参数面板表单
- 端口列表

---

## 3. 文件格式约定

### 文件扩展名
- `*.flow.json` — Workflow
- `*.prefab.json` — Prefab
- `*.run.jsonl` — Run events（每行一个事件）

### 版本演进
每个文件顶部有 `version` 字段，后续如果模型变化，通过 migration 脚本升级。

```json
{
  "version": "0.1.0",
  "type": "workflow",
  "data": { /* Workflow */ }
}
```

---

## 4. API 契约

### REST
```
GET    /api/workflows              # 列出所有
POST   /api/workflows              # 创建
GET    /api/workflows/{id}         # 读取
PUT    /api/workflows/{id}         # 更新
DELETE /api/workflows/{id}         # 删除

GET    /api/prefabs                # 列出所有
GET    /api/prefabs/{id}           # 读取（含 versions 列表）
POST   /api/prefabs                # 创建/发布
...

GET    /api/node-types             # 节点类型定义

POST   /api/workflows/{id}/run     # 触发运行，body: { inputs: {...} }
GET    /api/runs/{run_id}          # 运行详情
GET    /api/runs/{run_id}/events   # 历史事件（jsonl）
POST   /api/runs/{run_id}/cancel   # 取消
POST   /api/runs/{run_id}/approve  # 审批（HITL）
```

### WebSocket
```
WS  /ws/runs/{run_id}    # 订阅单次运行的事件流
WS  /ws                  # 订阅所有事件（全局仪表盘）
```

消息格式见上面 Event。

---

## 5. 示例：Hello Workflow

```json
{
  "version": "0.1.0",
  "type": "workflow",
  "data": {
    "id": "wf_hello",
    "name": "Hello Workflow",
    "version": "0.1.0",
    "created_at": "2026-04-22T01:50:00+08:00",
    "updated_at": "2026-04-22T01:50:00+08:00",
    "variables": {},
    "nodes": [
      {
        "id": "n_input",
        "type": "UserInput",
        "position": { "x": 100, "y": 200 },
        "params": { "name": "topic", "type": "text", "default": "太阳系" }
      },
      {
        "id": "n_llm",
        "type": "LLMStep",
        "position": { "x": 400, "y": 200 },
        "params": {
          "model": "glm",
          "prompt": "用 100 字介绍：{context}",
          "temperature": 0.7
        }
      },
      {
        "id": "n_out",
        "type": "Output",
        "position": { "x": 700, "y": 200 },
        "params": { "name": "介绍", "display": "markdown" }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "n_input", "source_port": "value",
        "target": "n_llm",   "target_port": "context",
        "kind": "data"
      },
      {
        "id": "e2",
        "source": "n_llm", "source_port": "result",
        "target": "n_out", "target_port": "value",
        "kind": "data"
      },
      {
        "id": "e3",
        "source": "n_input", "source_port": "out_exec",
        "target": "n_llm",   "target_port": "in_exec",
        "kind": "exec"
      },
      {
        "id": "e4",
        "source": "n_llm", "source_port": "out_exec",
        "target": "n_out", "target_port": "in_exec",
        "kind": "exec"
      }
    ]
  }
}
```
