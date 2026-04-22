# AgentFlow 技术架构

**版本**：v0.3（桌面版 Electron）
**修订日期**：2026-04-22
**修订原因**：放弃后端，改为桌面 exe + 本地存储，降低开发复杂度

---

## 📝 v0.3 核心变更

| 项目 | v0.2（FastAPI 后端）| v0.3（桌面版）| 变化说明 |
|---|---|---|---|
| **架构** | 前后端分离 + WebSocket | Electron 单进程 | 前后端合一，状态本地管理 |
| **后端** | Python FastAPI | Node.js Express（thin layer）| 语言统一为 JS/TS |
| **执行引擎** | asyncio.Queue + worker | 同步执行 + Promise | 无并发复杂度 |
| **状态持久化** | checkpoint.json + events.jsonl | workflow.json + run_log.jsonl | 本地文件直接写 |
| **Script 沙箱** | subprocess + setrlimit | child_process.spawn + timeout | 用户信任模型 |
| **HITL 审批** | 飞书 webhook + 服务端等待 | 飞书 API + 本地监听端口 | 需配置 ngrok/tailscale |
| **分享协作** | 需 M3 平台化 | GitHub repo + workflow.json | Git 作为版本管理 |
| **网络依赖** | 必须在线 | 纯离线可用 | 无服务器依赖 |
| **迁移路径** | — | 保留后端扩展接口 | 前端零改动升级 |

---

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│              Electron Desktop Application                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Frontend (Chromium)                         ││
│  │  ┌─────────┬──────────┬─────────┬──────────────────────┐││
│  │  │节点库   │  画布     │属性面板 │ 运行面板              │││
│  │  │面板     │ReactFlow │Inspector│ (日志/产物/成本)      │││
│  │  └─────────┴──────────┴─────────┴──────────────────────┘││
│  │   React + Vite + ReactFlow + Zustand                    ││
│  └────────────────────────┬────────────────────────────────┘│
│                           │ IPC (Electron bridge)           │
│  ┌────────────────────────┴────────────────────────────────┐│
│  │              Main Process (Node.js)                      ││
│  │  ┌──────────┬──────────┬──────────┬────────────────────┐││
│  │  │API Layer │Runner    │ Feishu   │ Script Executor    │││
│  │  │Express   │(Promise) │ Client   │ (child_process)    │││
│  │  └──────────┴──────────┴──────────┴────────────────────┘││
│  │           ↓                                             ││
│  │  ┌────────────────────────────────────────────────────┐ ││
│  │  │              Local Storage                          │ ││
│  │  │  workflows/  prefabs/  runs/  schemas/  config.json │ ││
│  │  └────────────────────────────────────────────────────┘ ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

                 Optional: GitHub repo (sync)
                 Optional: ngrok/tailscale (飞书 webhook)
```

**优势**：
- ✅ 单进程，无前后端通信复杂度
- ✅ 本地存储，无服务器依赖
- ✅ 纯离线可用
- ✅ 前后端统一语言（JavaScript/TypeScript）

---

## 2. 模块划分

### 2.1 前端（Renderer Process）

| 模块 | 职责 | 技术 |
|---|---|---|
| CanvasView | ReactFlow 画布 | React + ReactFlow |
| NodeLibrary | 左侧节点列表 | React |
| Inspector | 右侧参数表单（从 schema 生成）| React + rjsf |
| RunPanel | 底部日志/产物/成本 | React |
| WorkflowStore | 编辑态 | Zustand |
| RuntimeStore | 运行态 | Zustand |
| IPCClient | 调用主进程 API | Electron IPC |

### 2.2 主进程（Main Process）

| 模块 | 职责 | 技术 |
|---|---|---|
| api.js | 本地 REST API | Express（thin layer）|
| runner.js | 执行引擎 | Promise 链式调用 |
| registry.js | 节点类型注册 | JSON Schema SSOT |
| feishu.js | 飞书通知 + webhook 监听 | axios + express webhook |
| script.js | Script 节点执行 | child_process.spawn('python') |
| store.js | 本地文件读写 | fs + SQLite（可选）|
| schemas.js | JSON Schema 管理 | Ajv 校验 |

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
│       ├── log.jsonl
│       └── outputs/
├── schemas/
│   └── nodes/*.schema.json
└── config.json
```

---

## 3. 执行模型（简化）⭐

### 3.1 核心变更：同步执行 + Promise

**v0.2 问题**：asyncio.Queue + worker 有死锁风险，失败传播复杂。

**v0.3 方案**：单线程同步遍历 DAG，Promise 链式调用。

### 3.2 执行引擎（伪代码）⭐新增循环检测

```javascript
async function runWorkflow(wf, inputs, runId) {
  // ⭐ 新增：循环依赖检测（拓扑排序）
  if (!isDAG(wf.nodes, wf.edges)) {
    throw new Error('Workflow 存在循环依赖，请检查连线');
  }
  
  const states = {};
  
  // 初始化节点状态
  for (const node of wf.nodes) {
    states[node.id] = {
      pendingInEdges: countInEdges(node, wf.edges),
      received: {},
      status: 'pending'
    };
  }
  
  // 找到所有入边为 0 的节点（Start）
  const readyNodes = wf.nodes.filter(n => states[n.id].pendingInEdges === 0);
  
  // 执行队列
  const queue = [...readyNodes];
  
  while (queue.length > 0) {
    const node = queue.shift();
    await executeNode(node, states, wf.edges, runId);
  }
}

// ⭐ 新增：拓扑排序检测循环
function isDAG(nodes, edges) {
  const visited = new Set();
  const recStack = new Set();
  
  for (const node of nodes) {
    if (dfs(node.id, edges, visited, recStack)) {
      return false;  // 存在环
    }
  }
  return true;  // 是 DAG
}

function dfs(nodeId, edges, visited, recStack) {
  if (recStack.has(nodeId)) return true;  // 环检测
  if (visited.has(nodeId)) return false;
  
  visited.add(nodeId);
  recStack.add(nodeId);
  
  for (const edge of outgoingEdges(nodeId, edges)) {
    if (dfs(edge.target, edges, visited, recStack)) return true;
  }
  
  recStack.delete(nodeId);
  return false;
}
```

async function executeNode(node, states, edges, runId) {
  states[node.id].status = 'running';
  emit('node.started', { nodeId: node.id });
  
  try {
    // 获取节点处理器
    const handler = registry.get(node.type);
    
    // 执行（带超时）
    const output = await withTimeout(
      handler.execute(states[node.id].received, node.params),
      node.params.timeout || 300
    );
    
    states[node.id].status = 'done';
    emit('node.finished', { nodeId: node.id, output });
    
    // 写日志
    appendLog(runId, { type: 'node.finished', nodeId: node.id, output });
    
    // 激活下游
    for (const edge of outgoingEdges(node.id, edges)) {
      const targetState = states[edge.target];
      targetState.received[edge.targetPort] = output[edge.sourcePort];
      targetState.pendingInEdges--;
      
      if (targetState.pendingInEdges === 0 && targetState.status === 'pending') {
        queue.push(getNode(edge.target));
      }
    }
  } catch (error) {
    states[node.id].status = 'failed';
    emit('node.failed', { nodeId: node.id, error: error.message });
    
    // 失败传播：标记下游为 skipped
    markDownstreamSkipped(node.id, states, edges);
  }
}
```

**优势**：
- ✅ 无死锁风险
- ✅ 失败传播简单（直接标记下游）
- ✅ 无并发复杂度
- ✅ 调试容易（单线程）

---

## 4. HITL 审批（飞书集成）⭐

### 4.1 实现方案

```
用户点击"HumanApprove节点"
    ↓
主进程调用飞书 API（POST /message/send）
    ↓
飞书发送审批卡片到指定用户
    ↓
用户在飞书客户端点击"同意/拒绝"
    ↓
飞书 webhook 回调 → 主进程监听 localhost:8080/approval
    ↓
主进程收到决策 → 继续 workflow
```

### 4.2 配置要求

**方案 A：公网 IP + 端口暴露**
- 用户配置公网 IP
- 飞书 webhook URL = `http://用户IP:8080/approval`

**方案 B：ngrok / tailscale（推荐）**
- 用户启动 ngrok: `ngrok http 8080`
- 获得 `https://xxx.ngrok.io/approval` URL
- 飞书 webhook 配置为 ngrok URL

### 4.3 代码实现 ⭐新增超时 + 安全验证

```javascript
// ⭐ 新增：飞书 webhook 签名验证
app.post('/approval', async (req, res) => {
  // 1. 验证飞书签名（防止 ngrok URL 泄露伪造）
  const signature = req.headers['x-lark-signature'];
  if (!verifyLarkSignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const { runId, nodeId, decision } = req.body;
  
  // 找到对应的 waiting workflow
  const waitingWorkflow = waitingWorkflows.get(runId);
  if (waitingWorkflow) {
    waitingWorkflow.resolve({ decision });
    waitingWorkflows.delete(runId);
  }
  
  res.json({ success: true });
});

// HumanApprove 节点执行
class HumanApproveNode {
  async execute(inputs, params) {
    // 1. 发送飞书卡片
    await feishu.sendApprovalCard({
      question: params.question,
      runId: ctx.runId,
      nodeId: ctx.nodeId,
      approverOpenId: params.approver
    });
    
    // 2. ⭐ 新增：超时处理（默认 30 分钟）
    const timeout = params.timeout || 1800;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waitingWorkflows.delete(ctx.runId);
        reject(new ApprovalTimeout());
      }, timeout * 1000);
      
      waitingWorkflows.set(ctx.runId, { 
        resolve: (decision) => {
          clearTimeout(timer);
          resolve({ decision });
        }
      });
    });
  }
}
```
```

---

## 5. Script 节点（信任模型）⭐

### 5.1 实现方案 ⭐新增可靠性处理

```javascript
class ScriptNode {
  async execute(inputs, params) {
    const code = params.code;
    const timeout = params.timeout || 60;
    
    // ⭐ 新增：显示代码内容，用户确认（风险提示）
    if (!params.confirmed) {
      throw new Error('请先查看脚本内容并确认执行');
    }
    
    // 创建临时目录
    const tmpdir = fs.mkdtempSync('/tmp/agentflow-');
    const scriptPath = path.join(tmpdir, 'script.py');
    
    fs.writeFileSync(scriptPath, code);
    
    // 执行 Python（用户信任环境）
    const child = spawn('python', [scriptPath], {
      cwd: tmpdir,
      env: { INPUTS: JSON.stringify(inputs) }
    });
    
    // ⭐ 修复：timeout + kill + close 监听
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
    }, timeout * 1000);
    
    try {
      const stdout = await new Promise((resolve, reject) => {
        let output = '';
        child.stdout.on('data', (data) => output += data);
        child.on('close', (code) => {
          clearTimeout(timer);
          if (killed) reject(new ScriptTimeout());
          else resolve(output);
        });
      });
      return { result: JSON.parse(stdout) };
    } catch (error) {
      throw error;
    } finally {
      // ⭐ 修复：清理 tmpdir（即使 close 未触发）
      try {
        fs.rmSync(tmpdir, { recursive: true });
      } catch (e) {
        // 定期清理任务兜底
      }
    }
  }
}

// ⭐ 新增：定期清理遗留 tmpdir
setInterval(() => {
  const tmpdirs = fs.readdirSync('/tmp').filter(d => d.startsWith('agentflow-'));
  for (const d of tmpdirs) {
    try { fs.rmSync(`/tmp/${d}`, { recursive: true }); } catch (e) {}
  }
}, 3600000);  // 每小时清理
```
```

**安全说明**：
- ✅ 用户自己的机器，信任模型成立
- ✅ timeout + kill 保证不会无限运行
- ✅ tmpdir 限制文件系统访问
- ⚠️ 无内存/CPU 限制（用户自己负责）

---

## 6. GitHub 分享机制 ⭐

### 6.1 Workflow/Prefab 分享

```
用户本地 workflow.json
    ↓
推送到 GitHub repo
    ↓
同事 clone repo
    ↓
AgentFlow 打开 workflow.json
    ↓
运行/修改/PR 回流
```

### 6.2 Repo 结构

```
agentflow-workflows/
├── workflows/
│   ├── hello.flow.json
│   └── 配表流水线.flow.json
├── prefabs/
│   ├── 7步配表.prefab.json
│   └── 脚本+Critic循环.prefab.json
└── README.md
```

### 6.3 协作流程

1. 作者创建 workflow → 推送到 repo
2. 同事 clone → 修改 → PR
3. 作者 review → merge → workflow 更新

**无需平台化，Git 即是协作层**。

---

## 7. 节点 Schema SSOT（不变）

### 7.1 JSON Schema 定义

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "agentflow/nodes/LLMStep",
  "x-agentflow": {
    "category": "work",
    "color": "#4A90E2",
    "inputs": [
      { "name": "context", "type": "any" },
      { "name": "in_exec", "type": "exec", "required": true }
    ],
    "outputs": [
      { "name": "result", "type": "text" },
      { "name": "out_exec", "type": "exec" }
    ]
  },
  "properties": {
    "model": { "type": "string", "enum": ["glm", "claude", "opus47"] },
    "prompt": { "type": "string" }
  },
  "required": ["model", "prompt"]
}
```

### 7.2 前端消费

```typescript
// Inspector 组件从 schema 生成表单
<Form schema={nodeType.schema} formData={node.params} />
```

---

## 8. 迁移路径（桌面版 → 后端版）⭐

### 8.1 设计原则

**预留后端接口边界**：
- 所有核心逻辑封装为 service 层
- 数据访问封装为 store 层
- 桌面版前端调用 service 层 → 后端版改为调用 HTTP API

### 8.2 迁移改动量

| 组件 | 桌面版 | 后端版 | 改动量 |
|---|---|---|---|
| 前端（React+ReactFlow）| IPC 调用 | HTTP API 调用 | **零改动**（只改调用方式）|
| 主进程 thin layer | Express 本地 | Express → Nest.js + PostgreSQL | **30-50% 改动**|
| Script 执行 | child_process.spawn | Docker 沙箱或云函数 | **需重新设计**|
| 飞书通知 | 本地 HTTP client | 后端统一处理 webhook | **10% 改动**|
| 用户认证 | 无（单用户）| 后端 OAuth | **新增**|

### 8.3 代码示例（service 层）

```javascript
// service/workflow.js（桌面版）
export async function runWorkflow(wf, inputs) {
  return await ipcRenderer.invoke('run-workflow', wf, inputs);
}

// service/workflow.js（后端版）
export async function runWorkflow(wf, inputs) {
  return await fetch('/api/run', { method: 'POST', body: { wf, inputs } });
}
```

**前端逻辑不变，只是实现改为 HTTP 调用**。

---

## 9. 新增红线处理总结 ⭐

| 红线问题 | 处理方案 |
|---|---|
| 循环依赖检测缺失 | 拓扑排序检测（isDAG），前端阻断运行 |
| child_process.spawn timeout + kill 不可靠 | setTimeout + SIGTERM + close 监听 |
| ngrok URL 变化需重新配置 | 文档说明 + 推荐 tailscale（URL 稳定）|
| 网络不稳定审批超时 | timeout 参数 + Promise 超时 reject |
| ngrok URL 泄露安全风险 | 验证飞书 webhook 签名 |
| 主进程崩溃前端状态 | 监听 crash + 前端提示重启（见第 10 节）|
| IPC 消息过大 | 大产物写文件，IPC 传路径 |
| 多窗口并发写入 | 禁止多窗口打开同一 workflow |

---

## 10. 关键技术决策（v0.3）

| 决策 | 选择 | 理由 |
|---|---|---|
| 架构 | Electron 桌面版 | 降低复杂度，无服务器依赖 |
| 前端语言 | JavaScript/TypeScript | React + ReactFlow 原生支持 |
| 后端语言 | JavaScript/TypeScript | Node.js thin layer，前后端统一 |
| 执行引擎 | 同步遍历 + Promise | 无并发复杂度，无死锁 |
| HITL 审批 | 飞书 API + ngrok/tailscale | 桌面版也能集成飞书 |
| Script 沙箱 | child_process.spawn + timeout | 用户信任模型 |
| 分享协作 | GitHub repo | Git 作为版本管理，无需平台化 |
| 迁留扩展性 | 预留后端接口边界 | 前端零改动升级 |
| 包体大小 | ~150MB（含 Chromium）| 对内部工具影响小 |

---

## 10. 包体大小与分发

| 项目 | 大小 | 说明 |
|---|---|---|
| Chromium | ~130MB | Electron 内嵌浏览器 |
| React + ReactFlow | ~2MB | 前端框架 |
| Node.js dependencies | ~10MB | Express + axios |
| 应用代码 | ~1MB | 业务逻辑 |
| **总计** | **~150MB** | 可接受（内部工具）|

**打包工具**：electron-builder
**支持平台**：Windows（exe）、macOS（dmg）、Linux（AppImage）

---

## 11. 技术栈总结

| 层 | 技术 | 说明 |
|---|---|---|
| 前端框架 | React 18 + Vite + ReactFlow | 画布渲染 |
| 状态管理 | Zustand | 编辑态 + 运行态 |
| 表单生成 | rjsf（从 JSON Schema 生成）| Inspector |
| IPC 通信 | Electron ipcMain/ipcRenderer | 前端 → 主进程 |
| 主进程框架 | Express（thin layer）| 本地 REST API |
| 执行引擎 | Promise 链式调用 | 无并发复杂度 |
| 飞书集成 | axios + lark-js SDK | 审批通知 |
| Script 执行 | child_process.spawn('python') | 用户信任模型 |
| 数据存储 | fs + SQLite（可选）| 本地文件 |
| 打包分发 | electron-builder | exe/dmg/AppImage |