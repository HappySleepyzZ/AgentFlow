# AgentFlow 技术架构

**版本**：v0.1 draft

---

## 1. 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                         │
│  ┌──────────────┬──────────────┬──────────────┬───────────┐  │
│  │  节点库面板   │   画布        │  属性面板     │ 运行面板   │  │
│  │  (左侧)      │  ReactFlow   │   (右侧)      │  (底部)   │  │
│  └──────────────┴──────────────┴──────────────┴───────────┘  │
│         React + ReactFlow + WebSocket Client                  │
└──────────────┬─────────────────────────────┬─────────────────┘
               │ HTTP (CRUD/Run/File)        │ WS (Events)
               ▼                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    Backend (Python)                           │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  API Layer │  │  Runner      │  │  Event Bus           │  │
│  │  FastAPI   │  │  (asyncio)   │  │  (in-memory pubsub)  │  │
│  └──────┬─────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │               │                      │              │
│  ┌──────┴──────┬────────┴────────┬─────────────┴──────────┐  │
│  │  Store      │  Node Registry  │  Agent Adapter        │  │
│  │  (files)    │  (plugin dir)   │  (OpenClaw bridge)    │  │
│  └──────┬──────┴─────────────────┴────────────┬───────────┘  │
│         │                                      │              │
└─────────┼──────────────────────────────────────┼──────────────┘
          │                                      │
          ▼                                      ▼
    ┌──────────────┐                    ┌──────────────────┐
    │ workflows/   │                    │ OpenClaw         │
    │ prefabs/     │                    │ sessions_spawn   │
    │ runs/        │                    │ TaskFlow         │
    └──────────────┘                    └──────────────────┘
```

---

## 2. 模块划分

### 2.1 前端
| 模块 | 职责 |
|---|---|
| `CanvasView` | ReactFlow 画布主体，节点渲染、连线、缩放 |
| `NodeLibrary` | 左侧面板，节点类型列表，拖拽到画布 |
| `Inspector` | 右侧面板，选中节点的参数编辑 |
| `RunPanel` | 底部面板，日志、产物、错误 |
| `WorkflowStore` | 前端状态管理（Zustand / Jotai） |
| `WSClient` | WebSocket 连接，接收节点事件、同步画布 |
| `ApiClient` | HTTP 封装，CRUD / 运行 |

### 2.2 后端
| 模块 | 职责 |
|---|---|
| `api.py` | FastAPI 路由层 |
| `runner.py` | 执行引擎，拓扑排序 + asyncio 并发 |
| `registry.py` | 节点类型注册表 |
| `nodes/` | 内置节点实现（每类一个文件） |
| `store.py` | 工作流/Prefab/Run 的文件存取 |
| `eventbus.py` | 事件发布订阅（asyncio Queue） |
| `agents.py` | OpenClaw sub-agent 调用桥接 |
| `types.py` | Pydantic 数据模型 |

### 2.3 存储结构
```
~/.agentflow/
├── workflows/
│   ├── hello.flow.json
│   ├── 配表流水线.flow.json
│   └── ...
├── prefabs/
│   ├── 配表流水线.prefab.json
│   └── ...
├── runs/
│   └── <run_id>/
│       ├── meta.json         # 运行摘要
│       ├── events.jsonl      # 事件时间轴
│       └── outputs/          # 节点产物
└── config.json
```

---

## 3. 执行模型

### 3.1 数据模型（核心）
```python
# 节点实例
class Node(BaseModel):
    id: str
    type: str              # "LLMStep" / "AgentTask" / ...
    position: Point        # 画布坐标
    params: dict           # 用户填的参数
    prefab_ref: Optional[PrefabRef]  # 如果是 prefab instance/variant

# 连线
class Edge(BaseModel):
    id: str
    source: str            # node_id
    source_port: str       # 输出端口名
    target: str
    target_port: str
    kind: Literal["exec", "data"]

# 工作流
class Workflow(BaseModel):
    id: str
    name: str
    nodes: list[Node]
    edges: list[Edge]
    variables: dict        # 全局变量初始值
    version: str
```

### 3.2 节点定义（plugin 接口）
```python
class NodeType:
    type_name: str         # 唯一标识
    category: str          # "work" / "control" / "data"
    inputs: list[PortSpec]
    outputs: list[PortSpec]
    param_schema: dict     # JSON Schema

    async def execute(self, inputs: dict, params: dict, ctx: Context) -> dict:
        """返回 {output_port: value}"""
        ...

class Context:
    """传给节点的执行上下文"""
    workflow_id: str
    run_id: str
    node_id: str
    variables: dict
    emit: Callable         # 中途汇报进度
    cancel_token: CancelToken
```

### 3.3 执行流程
```python
async def run_workflow(wf: Workflow, initial_inputs: dict) -> RunResult:
    # 1. 拓扑排序（执行引脚优先）
    order = topo_sort(wf.edges)

    # 2. 初始化
    cache = {}  # node_id -> outputs
    ctx_base = Context(workflow_id=wf.id, run_id=uuid4(), ...)

    # 3. 按层并行执行
    for layer in order:
        tasks = [execute_node(n, cache, ctx_base) for n in layer]
        await asyncio.gather(*tasks, return_exceptions=True)

    return RunResult(cache=cache, events=[...])


async def execute_node(node: Node, cache, ctx_base):
    # 1. 收集输入
    inputs = resolve_inputs(node, cache)

    # 2. 缓存命中检查
    if cache_hit(node, inputs):
        emit("cache_hit", node.id)
        cache[node.id] = cached
        return

    # 3. 发起执行事件
    emit("node.started", node.id)

    # 4. 真正执行
    node_impl = registry.get(node.type)
    try:
        output = await asyncio.wait_for(
            node_impl.execute(inputs, node.params, ctx),
            timeout=node.params.get("timeout", 300)
        )
        cache[node.id] = output
        emit("node.finished", node.id, preview=short(output))
    except Exception as e:
        emit("node.failed", node.id, error=str(e))
        raise
```

### 3.4 事件流
WebSocket 单连接，消息格式：
```json
{
  "type": "node.started",
  "run_id": "r_abc",
  "node_id": "n_123",
  "ts": 1713715200.5
}

{
  "type": "node.step",
  "run_id": "r_abc",
  "node_id": "n_123",
  "step": {"index": 3, "total": 7, "name": "字段映射"}
}

{
  "type": "node.finished",
  "run_id": "r_abc",
  "node_id": "n_123",
  "duration_ms": 2350,
  "preview": "...",
  "metrics": {"tokens": 1234, "cost": 0.002}
}

{
  "type": "node.failed",
  "run_id": "r_abc",
  "node_id": "n_123",
  "error": "timeout after 300s"
}
```

---

## 4. Agent 集成

### 4.1 AgentTask 节点 → sessions_spawn

```python
class AgentTaskNode(NodeType):
    type_name = "AgentTask"
    category = "work"
    inputs = [Port("context", "any"), Port("in_exec", "exec")]
    outputs = [Port("result", "any"), Port("out_exec", "exec")]
    param_schema = {
        "agent_id": {"type": "string", "enum": ["coder", "main", "wiki"]},
        "task": {"type": "string"},
        "timeout": {"type": "integer", "default": 300},
    }

    async def execute(self, inputs, params, ctx):
        agent_id = params["agent_id"]
        task_text = render_template(params["task"], inputs)

        # 调用 OpenClaw
        result = await agent_bridge.spawn_and_wait(
            agent_id=agent_id,
            task=task_text,
            on_step=lambda step: ctx.emit("node.step", step),
            timeout=params.get("timeout", 300),
        )
        return {"result": result, "out_exec": True}
```

### 4.2 事件透传
sub-agent 的进度事件 → agent_bridge 捕获 → 通过 ctx.emit 转成画布节点事件。

---

## 5. Prefab 机制

### 5.1 Prefab 文件格式
```json
{
  "prefab_id": "配表流水线",
  "version": "1.2.0",
  "nodes": [...],           // 子图节点
  "edges": [...],
  "exposed_inputs": [       // 对外暴露的输入端口
    {"name": "excel_path", "maps_to": "node_1.path", "type": "file"}
  ],
  "exposed_outputs": [
    {"name": "result", "maps_from": "node_7.output", "type": "json"}
  ],
  "exposed_params": [       // 对外暴露的可配置参数
    {"name": "model", "maps_to": "node_3.params.model", "default": "claude"}
  ]
}
```

### 5.2 Instance / Variant / Unpacked
```json
// Instance
{
  "id": "n_123",
  "type": "prefab_instance",
  "prefab": "配表流水线",
  "prefab_version": "1.2.0",
  "params": { "model": "opus47" }
}

// Variant
{
  "id": "n_123",
  "type": "prefab_variant",
  "base_prefab": "配表流水线",
  "base_version": "1.2.0",
  "overrides": {
    "nodes.step3.params.model": "opus47",
    "nodes.step3.params.timeout": 600
  }
}

// Unpacked: 转成普通节点 + 边，prefab 关联丢失
```

### 5.3 加载时解析
运行时把 prefab_instance 展开成子图：
```python
def resolve_prefab(instance_node, all_prefabs):
    prefab = all_prefabs[instance_node.prefab]
    sub_nodes = deepcopy(prefab.nodes)
    sub_edges = deepcopy(prefab.edges)
    apply_overrides(sub_nodes, instance_node.overrides or {})
    apply_params(sub_nodes, instance_node.params, prefab.exposed_params)
    return sub_nodes, sub_edges
```

---

## 6. 关键技术决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 前端框架 | React 18 + ReactFlow | 生态最成熟，ComfyUI 风格项目都用 |
| 后端框架 | FastAPI | asyncio 原生、自带 OpenAPI、轻 |
| 通信 | HTTP + WebSocket 分工 | 简单：CRUD 走 HTTP，事件流走 WS |
| 存储 | 文件系统 JSON（MVP）| 单用户够用，不引入 DB 依赖 |
| 执行引擎 | 自研 asyncio | MVP 够，未来可换 Temporal |
| 节点机制 | Python plugin | 新增节点只改一个文件 |
| 状态管理 | Zustand（前端） | 比 Redux 轻，比 Context 强 |
| 样式 | Tailwind + 暗色 | 快，ComfyUI 同款气质 |
| 运行时语言 | Python 3.11 | 复用 OpenClaw 生态 |

---

## 7. 部署形态

### MVP（M0/M1）
```bash
# 一键启动
cd agentflow
python -m backend.main   # 后端 :8000
# 前端文件直接由 FastAPI 挂 /static/ 提供
# 浏览器打开 http://localhost:8000
```

### 平台化（M3）
- Docker Compose（backend + postgres + redis）
- 前端单独构建 → CDN/Nginx
- HTTPS + Auth
