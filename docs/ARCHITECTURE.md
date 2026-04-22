# AgentFlow 技术架构

**版本**：v0.2（基于 v0.1 评审修订）
**v0.1 原件**：`archive/v0.1/ARCHITECTURE.md`

---

## 📝 v0.2 修订摘要

- ✅ 执行引擎：按层并行 → **入边就绪驱动**（修硬伤 1）
- ✅ Loop 方案定死：**嵌套 run_workflow 执行器**（修硬伤 2）
- ✅ 增加 **checkpoint 机制**（修硬伤 3）
- ✅ Prefab **强制版本锁**（修硬伤 4）
- ✅ Script 节点沙箱：**subprocess + tmpdir**（不搞进程内沙箱）
- ✅ 增加 **JSON Schema SSOT** 设计
- ✅ 增加 **可观测层**（结构化日志 → OTLP Trace）
- ✅ 增加 **前后端状态一致性**策略

---

## 1. 整体架构（不变）

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                         │
│  ┌──────────────┬──────────────┬──────────────┬───────────┐  │
│  │  节点库面板   │   画布        │  属性面板     │ 运行面板   │  │
│  │  (左侧)      │  ReactFlow   │   (右侧)      │  (底部)   │  │
│  └──────────────┴──────────────┴──────────────┴───────────┘  │
│    React + Vite + ReactFlow + Zustand + WebSocket            │
└──────────────┬─────────────────────────────┬─────────────────┘
               │ HTTP (CRUD/Run/File)        │ WS (Events)
               ▼                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    Backend (Python 3.11)                      │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  API Layer │  │  Runner      │  │  Event Bus           │  │
│  │  FastAPI   │  │  (asyncio)   │  │  (asyncio pubsub)    │  │
│  └──────┬─────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │               │                      │              │
│  ┌──────┴──────┬────────┴────────┬─────────────┴──────────┐  │
│  │  Store      │  Node Registry  │  Agent Adapter        │  │
│  │  (files+lock)│ (schema SSOT)  │  (OpenClaw bridge)    │  │
│  └──────┬──────┴─────────────────┴────────────┬───────────┘  │
│         │                                      │              │
└─────────┼──────────────────────────────────────┼──────────────┘
          │                                      │
          ▼                                      ▼
    ┌──────────────┐                    ┌──────────────────┐
    │ workflows/   │                    │ OpenClaw         │
    │ prefabs/     │                    │ sessions_spawn   │
    │ runs/        │                    │ TaskFlow         │
    │ schemas/     │ ⭐新增              └──────────────────┘
    └──────────────┘
```

**变化点**：
- 前端明确 **Vite + Zustand**（M1 W1 上）
- Store 增加 **文件锁**防并发写
- Node Registry **schema SSOT**
- 存储增加 `schemas/` 目录

---

## 2. 模块划分（增量）

### 2.1 前端
| 模块 | 职责 |
|---|---|
| CanvasView | ReactFlow 画布 |
| NodeLibrary | 左侧节点列表 |
| Inspector | 右侧参数表单（**从 schema 生成**）⭐ |
| RunPanel | 底部日志/产物 |
| WorkflowStore (Zustand) | 编辑态 |
| RuntimeStore ⭐新增 | 运行态（从 WS 流入）|
| WSClient | WebSocket 连接 + reconnect |
| ApiClient | HTTP 封装 |

### 2.2 后端
| 模块 | 职责 |
|---|---|
| api.py | FastAPI 路由 |
| runner.py | 执行引擎（**入边就绪驱动**）⭐ |
| registry.py | 节点类型注册（**schema 驱动**）⭐ |
| nodes/ | 内置节点 |
| store.py | 工作流/Prefab/Run 持久化（**含 file lock**）⭐ |
| eventbus.py | 事件总线 |
| agents.py | OpenClaw 桥接 |
| checkpoint.py ⭐新增 | Run 状态快照 |
| schemas.py ⭐新增 | Pydantic ↔ JSON Schema 同源 |

### 2.3 存储结构
```
~/.agentflow/
├── workflows/
│   └── *.flow.json
├── prefabs/
│   └── *.prefab.json
├── runs/
│   └── <run_id>/
│       ├── meta.json
│       ├── events.jsonl
│       ├── checkpoint.json   ⭐新增：支持断电续跑
│       └── outputs/
├── schemas/                  ⭐新增
│   └── nodes/*.schema.json   # 节点 JSON Schema
└── config.json
```

---

## 3. 执行模型（重写）⭐

### 3.1 核心变更：入边就绪驱动

**v0.1 问题**：`topo_sort` 按层并行，不区分执行边和数据边，数据依赖和执行依赖拓扑不同时会死锁/提前执行。

**v0.2 方案**：节点的所有入边（执行+数据）就绪后立即执行，事件驱动而非分层。

### 3.2 数据模型（微调）

```python
class Node(BaseModel):
    id: str
    type: str
    name: Optional[str]
    position: Point
    params: dict
    prefab_ref: Optional[PrefabRef]
    # 不存 runtime 到文件，运行时由 RuntimeStore 维护

class Edge(BaseModel):
    id: str
    source: str
    source_port: str
    target: str
    target_port: str
    kind: Literal["exec", "data"]

class Workflow(BaseModel):
    id: str
    name: str
    nodes: list[Node]
    edges: list[Edge]
    variables: dict
    version: str
```

### 3.3 执行引擎（伪代码）

```python
class NodeState:
    pending_in_edges: int      # 还未就绪的入边数
    received: dict             # port_name -> value
    status: Literal["pending", "queued", "running", "done", "failed", "waiting"]

async def run_workflow(wf: Workflow, inputs: dict, run_id: str):
    states = {n.id: NodeState(
        pending_in_edges=count_in_edges(n, wf.edges),
        received={},
        status="pending"
    ) for n in wf.nodes}

    ready_queue = asyncio.Queue()

    # 找到所有入边为 0 的节点（Start / UserInput）
    for n in wf.nodes:
        if states[n.id].pending_in_edges == 0:
            states[n.id].status = "queued"
            await ready_queue.put(n)

    semaphore = asyncio.Semaphore(CONCURRENCY)  # 默认 4

    async def worker():
        while not all_done(states):
            node = await ready_queue.get()
            async with semaphore:
                await execute_node(node, states, ready_queue, wf.edges, run_id)

    workers = [asyncio.create_task(worker()) for _ in range(CONCURRENCY)]
    await asyncio.gather(*workers)


async def execute_node(node, states, ready_queue, edges, run_id):
    states[node.id].status = "running"
    emit("node.started", node_id=node.id)

    # 1. 缓存命中检查
    if cache_hit(node, states[node.id].received):
        emit("node.cached", node_id=node.id)
        output = load_cached(node)
    else:
        # 2. 真正执行
        try:
            output = await asyncio.wait_for(
                registry.get(node.type).execute(
                    inputs=states[node.id].received,
                    params=node.params,
                    ctx=ctx,
                ),
                timeout=node.params.get("timeout", 300)
            )
            save_cache(node, output)
        except Exception as e:
            emit("node.failed", node_id=node.id, error=str(e))
            states[node.id].status = "failed"
            # 失败策略：标记下游为 skipped（P1 再做更细）
            return

    states[node.id].status = "done"
    emit("node.finished", node_id=node.id, preview=short(output))

    # 3. Checkpoint ⭐新增
    await checkpoint.save(run_id, states)

    # 4. 激活下游
    for edge in outgoing_edges(node.id, edges):
        target_state = states[edge.target]
        target_state.received[edge.target_port] = output.get(edge.source_port)
        target_state.pending_in_edges -= 1
        if target_state.pending_in_edges == 0 and target_state.status == "pending":
            target_state.status = "queued"
            await ready_queue.put(get_node(edge.target))
```

### 3.4 Loop 节点（嵌套 run_workflow）⭐

**决策**：Loop 节点内部启动子 run_workflow，不动主图的 DAG。

```python
class LoopNode(NodeType):
    async def execute(self, inputs, params, ctx):
        items = inputs["items"]
        max_iter = params.get("max_iterations", 1000)
        sub_workflow = params["sub_workflow"]  # 子图定义（内嵌）

        results = []
        for i, item in enumerate(items[:max_iter]):
            ctx.emit("node.step", {"index": i+1, "total": len(items)})
            sub_result = await run_workflow(
                wf=sub_workflow,
                inputs={"item": item, "index": i, "accumulator": results},
                run_id=f"{ctx.run_id}.loop.{i}",
            )
            results.append(sub_result)

        return {"results": results}
```

**优势**：
- 主 DAG 保持无环
- 每次迭代独立 checkpoint
- 可支持嵌套循环
- 天然支持 parallel 模式（`asyncio.gather`）

### 3.5 HITL Checkpoint 机制 ⭐

**问题**：HumanApprove 节点暂停时，进程重启 run 状态全丢。

**方案**：
```python
class CheckpointStore:
    async def save(run_id, states, waiting_node_id=None):
        path = f"runs/{run_id}/checkpoint.json"
        async with file_lock(path):
            json.dump({
                "states": {id: s.to_dict() for id, s in states.items()},
                "waiting_node_id": waiting_node_id,
                "ts": time.time()
            }, open(path, "w"))

    async def resume(run_id) -> (states, waiting_node_id):
        path = f"runs/{run_id}/checkpoint.json"
        data = json.load(open(path))
        return data["states"], data["waiting_node_id"]


class HumanApproveNode(NodeType):
    async def execute(self, inputs, params, ctx):
        # 1. 发飞书卡片 / web 弹窗
        await notify_approver(params["question"], run_id=ctx.run_id, node_id=ctx.node_id)

        # 2. 写 waiting checkpoint
        await checkpoint.save_waiting(ctx.run_id, ctx.node_id)
        emit("approval.requested", run_id=ctx.run_id, node_id=ctx.node_id)

        # 3. 阻塞等待外部 API 回调
        decision = await wait_for_approval(
            ctx.run_id, ctx.node_id,
            timeout=params.get("timeout", 3600)
        )
        return {"decision": decision}


# 外部 REST API
POST /api/runs/{run_id}/approve
body: {node_id, decision: "approved"|"rejected", comment?}
→ 唤醒对应 run 的 wait_for_approval
```

**恢复流程**：服务启动时扫 `runs/*/checkpoint.json`，有 `waiting_node_id` 的 run 自动进入待唤醒队列。

### 3.6 事件流（不变）

```json
{"type":"run.started","run_id":"r_abc","workflow_id":"wf_123"}
{"type":"node.started","run_id":"r_abc","node_id":"n_1","ts":1234}
{"type":"node.step","run_id":"r_abc","node_id":"n_1","step":{"index":3,"total":7}}
{"type":"node.finished","run_id":"r_abc","node_id":"n_1","duration_ms":2350,"preview":"...","metrics":{"tokens":1234,"cost":0.002}}
{"type":"node.failed","run_id":"r_abc","node_id":"n_1","error":"timeout"}
{"type":"node.cached","run_id":"r_abc","node_id":"n_1"}
{"type":"approval.requested","run_id":"r_abc","node_id":"n_2","question":"..."}
{"type":"approval.resolved","run_id":"r_abc","node_id":"n_2","decision":"approved"}
{"type":"run.finished","run_id":"r_abc","status":"succeeded"}
```

---

## 4. 节点 Schema SSOT ⭐

### 4.1 单一来源：JSON Schema

每个节点一份 `schemas/nodes/<NodeName>.schema.json`：

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "agentflow/nodes/LLMStep",
  "type": "object",
  "x-agentflow": {
    "category": "work",
    "color": "#4A90E2",
    "icon": "sparkles",
    "inputs": [
      {"name": "context", "type": "any", "required": false},
      {"name": "in_exec", "type": "exec", "required": true}
    ],
    "outputs": [
      {"name": "result", "type": "text"},
      {"name": "out_exec", "type": "exec"}
    ]
  },
  "properties": {
    "model": {"type": "string", "enum": ["glm", "claude", "opus47"]},
    "prompt": {"type": "string", "format": "multiline"},
    "temperature": {"type": "number", "default": 0.7}
  },
  "required": ["model", "prompt"]
}
```

### 4.2 Python 侧消费
```python
from pydantic import create_model_from_schema

LLMStepParams = create_model_from_schema(load("nodes/LLMStep.schema.json"))

class LLMStepNode(NodeType):
    schema = load("nodes/LLMStep.schema.json")

    async def execute(self, inputs, params: LLMStepParams, ctx):
        ...
```

### 4.3 前端侧消费
```typescript
// 拉取 /api/node-types 返回 schema 数组
// Inspector 组件从 schema 自动生成表单（rjsf 库）
<Form schema={nodeType.schema} formData={node.params} onChange={...}/>
```

**收益**：
- 新增节点只写一份 schema + 一个 execute 函数
- 前端自动支持
- 类型校验自动

---

## 5. Agent 集成（强化）

```python
class AgentTaskNode(NodeType):
    schema = load("nodes/AgentTask.schema.json")

    async def execute(self, inputs, params, ctx):
        async for event in agent_bridge.spawn_streaming(
            agent_id=params["agent_id"],
            model=params.get("model"),
            task=render_template(params["task"], inputs),
            tools=params.get("tools"),
            timeout=params.get("timeout", 300),
        ):
            if event.type == "step":
                ctx.emit("node.step", {"label": event.label})
            elif event.type == "done":
                return {"result": event.result}
```

---

## 6. Prefab 机制（版本锁强化）⭐

### 6.1 强制版本锁

```json
{
  "id": "n_123",
  "type": "prefab_instance",
  "prefab": "配表流水线",
  "prefab_version": "1.2.0",   // ⭐ v0.2 必填，不再默认 latest
  "params": {...}
}
```

### 6.2 Semver 规则

| 变更类型 | 版本号 | 向后兼容 |
|---|---|---|
| 改内部实现、修 bug | patch（1.2.0 → 1.2.1）| ✅ |
| 加新 exposed_input（可选）| minor（1.2.0 → 1.3.0）| ✅ |
| 删/改名 exposed_input/output/param | major（1.2.0 → 2.0.0）| ❌ |

### 6.3 Migration Diff

升级 Prefab 版本时，检查 breaking 变化：
```python
def diff_prefab(old, new) -> list[BreakingChange]:
    # - 删除的 exposed_*
    # - 类型变化的 exposed_*
    # - 重命名的 exposed_*
    # → 返回列表，前端提示用户手动处理
```

---

## 7. Script 节点沙箱（降级方案）⭐

**v0.1 问题**：进程内沙箱（`exec` + 限制 `__builtins__`）可被绕过，"60s timeout 兜不住"。

**v0.2 方案**：
```python
class ScriptNode(NodeType):
    async def execute(self, inputs, params, ctx):
        code = params["code"]
        timeout = params.get("timeout", 60)

        with tempfile.TemporaryDirectory() as tmpdir:
            script_path = Path(tmpdir) / "script.py"
            script_path.write_text(code)

            # subprocess 隔离
            result = await asyncio.create_subprocess_exec(
                sys.executable, str(script_path),
                cwd=tmpdir,
                stdout=PIPE, stderr=PIPE,
                env={"INPUTS": json.dumps(inputs)},  # 仅 stdlib
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    result.communicate(), timeout=timeout
                )
            except asyncio.TimeoutError:
                result.kill()
                raise ScriptTimeout()

        return {"result": json.loads(stdout)}
```

**收益**：
- 超时能 kill
- 文件系统只在 tmpdir 可写
- 崩了不影响后端进程

**未来（M3+）**：如需真隔离再上 nsjail / Firecracker / WASM。

---

## 8. 可观测性 ⭐新增

### 8.1 M1：结构化日志

每 run 写 `runs/<run_id>/structured.log.jsonl`：
```jsonl
{"ts":1234,"level":"info","run_id":"r_abc","node_id":"n_1","event":"started"}
{"ts":1235,"level":"info","run_id":"r_abc","node_id":"n_1","event":"llm_call","tokens":1234,"cost":0.002}
{"ts":1236,"level":"error","run_id":"r_abc","node_id":"n_1","event":"exception","error":"..."}
```

### 8.2 M2：OpenTelemetry

```python
tracer = opentelemetry.trace.get_tracer("agentflow")

async def execute_node(node, ...):
    with tracer.start_as_current_span(f"node.{node.type}",
                                      attributes={"node.id": node.id, "run.id": run_id}):
        ...
```

可接 Jaeger / Tempo 看 trace。

---

## 9. 前后端状态一致性 ⭐新增

### 9.1 状态分层
- **编辑态**（前端 Zustand `WorkflowStore`）：用户正在编辑的画布
- **运行态**（前端 Zustand `RuntimeStore`）：从 WS 流入的节点状态
- **持久态**（后端文件）：保存的 workflow / run

### 9.2 冲突处理
1. **运行中不能编辑**：前端检测到 `run.started` 后，画布进入只读模式
2. **断网重连**：WS 重连后 fetch `/api/runs/<run_id>` 全量同步
3. **保存冲突**：PUT workflow 带 `updated_at`，后端发现冲突返回 409，前端提示用户
4. **本地离线编辑**：M3 再考虑，M1/M2 不支持

---

## 10. 文件并发写入保护 ⭐新增

```python
import fcntl

@contextmanager
def file_lock(path):
    lock_path = f"{path}.lock"
    with open(lock_path, "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)

# 使用：
async def save_workflow(wf):
    path = f"workflows/{wf.id}.flow.json"
    with file_lock(path):
        # read-modify-write 原子化
        tmp = f"{path}.tmp"
        open(tmp, "w").write(json.dumps(wf.dict()))
        os.rename(tmp, path)  # rename 在同 fs 下原子
```

---

## 11. 关键技术决策（v0.2）

| 决策 | 选择 | v0.1 vs v0.2 |
|---|---|---|
| 前端框架 | React 18 + Vite + ReactFlow + Zustand | ⭐加 Vite |
| 后端框架 | FastAPI | 不变 |
| 通信 | HTTP + WebSocket | 不变 |
| 存储 | 文件系统 JSON + **file lock** | ⭐加锁 |
| 执行引擎 | **入边就绪驱动**（非按层并行）| ⭐改 |
| Loop 实现 | **嵌套 run_workflow** | ⭐定案 |
| Script 沙箱 | **subprocess + tmpdir** | ⭐降级 |
| Checkpoint | **每 node.finished 写入** | ⭐新增 |
| Schema | **JSON Schema SSOT** | ⭐新增 |
| 可观测 | M1 结构化日志，M2 OTLP | ⭐新增 |
| Prefab 版本锁 | **强制** | ⭐改 |
