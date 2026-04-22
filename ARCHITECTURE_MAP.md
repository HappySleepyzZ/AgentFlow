# AgentFlow 文件架构地图

## 📋 设计原则

### 1. 文件大小限制（防止上下文溢出）

| 类型 | 上限 | 理由 |
|---|---|---|
| 入口文件（main.js）| ≤100 行 | 仅启动逻辑，不写业务 |
| API 文件（api.js）| ≤150 行 | 数据访问，不写执行逻辑 |
| Runner 文件（runner.js）| ≤200 行 | ⭐执行引擎，允许写执行逻辑 |
| Registry 文件（registry.js）| ≤100 行 | 注册节点，不写节点实现 |
| Node 文件 | ≤100 行 | 单节点实现，独立维护 |
| Schema 文件 | ≤100 行 | JSON 定义，不写代码 |
| Utils 文件 | ≤50 行 | 纯工具函数 |
| Config 文件（config.js）| ≤50 行 | 配置加载，禁止硬编码 |

### 2. 配置外置（防止硬编码）

**禁区**：
- ❌ API Key 写在代码里
- ❌ 文件路径写死
- ❌ 超时时间写死
- ❌ 颜色/字体写死

**外置位置**：
- `config/default.json`：默认配置
- `config/user.json`：用户配置
- `config/llm.json`：LLM API Keys
- `config/feishu.json`：飞书配置

### 3. Service 层抽象（防止业务逻辑散落）

**前端 Service 层**：
- `workflowService.js`：Workflow 业务逻辑
- `nodeService.js`：Node 业务逻辑
- `ipcService.js`：IPC 通信封装

**主进程 Service 层**：
- `api.js`：Workflow API
- `runner.js`：执行引擎
- `registry.js`：节点注册

---

## 📁 文件职责表

### 前端渲染进程（待实现）

| 文件 | 职责 | 上限 | AI 写代码时禁止 |
|---|---|---|---|
| App.jsx | 应用入口 | 50 行 | ❌ 写业务逻辑 |
| Canvas.jsx | 画布渲染 | 200 行 | ❌ 写执行逻辑 |
| NodeLibrary.jsx | 节点库面板 | 100 行 | ❌ 写业务逻辑 |
| Inspector.jsx | 属性面板 | 150 行 | ❌ 写业务逻辑 |
| RunPanel.jsx | 运行面板 | 150 行 | ❌ 写执行逻辑 |
| workflowService.js | Workflow 业务逻辑 | 150 行 | ⭐ 允许写业务逻辑 |
| nodeService.js | Node 业务逻辑 | 100 行 | ⭐ 允许写业务逻辑 |
| ipcService.js | IPC 封装 | 100 行 | ❌ 写业务逻辑 |

### 主进程（已实现骨架）

| 文件 | 职责 | 上限 | AI 写代码时禁止 |
|---|---|---|---|
| main.js | 启动入口 | 100 行 | ❌ 写任何业务逻辑 |
| api.js | Workflow API | 150 行 | ❌ 写执行逻辑 |
| runner.js | 执行引擎 | 200 行 | ⭐ 允许写执行逻辑 |
| registry.js | 节点注册 | 100 行 | ❌ 写节点实现 |
| ipcHandlers.js | IPC 处理 | 150 行 | ❌ 写业务逻辑（仅调用 Service）|
| config.js | 配置加载 | 50 行 | ❌ 硬编码配置 |
| dagUtils.js | DAG 检测 | 50 行 | ⭐ 允许写算法 |

### 节点实现（待实现）

| 文件 | 职责 | 上限 | AI 写代码时禁止 |
|---|---|---|---|
| UserInput.js | 用户输入节点 | 100 行 | ⭐ 允许写节点逻辑 |
| LLMStep.js | LLM 调用节点 | 100 行 | ⭐ 允许写节点逻辑 |
| Output.js | 输出节点 | 100 行 | ⭐ 允许写节点逻辑 |
| Script.js | Script 执行节点 | 100 行 | ⭐ 允许写节点逻辑 |
| HumanApprove.js | 审批节点 | 100 行 | ⭐ 允许写节点逻辑 |
| Loop.js | Loop 节点 | 100 行 | ⭐ 允许写节点逻辑 |

### 配置文件（已实现骨架）

| 文件 | 说明 | AI 禁止 |
|---|---|---|
| default.json | 默认配置 | ❌ 硬编码到代码 |
| user.json | 用户配置 | ❌ 硬编码到代码 |
| llm.json | LLM API Keys | ❌ 硬编码到代码 |
| feishu.json | 飞书配置 | ❌ 硬编码到代码 |

---

## 🚀 AI 写代码时的流程

1. **先读 ARCHITECTURE_MAP.md**（知道在哪写、写多少、禁止什么）
2. **只改 1-2 个文件**（不超上下文）
3. **遵守文件大小限制**（≤上限）
4. **禁止硬编码配置**（使用 config.get()）
5. **业务逻辑只在 Service 层**（不散落到组件）

---

## 📊 当前实现状态

| 模块 | 状态 | 说明 |
|---|---|---|
| main.js | ✅ 已实现骨架 | 启动入口 |
| config.js | ✅ 已实现骨架 | 配置加载 |
| ipcHandlers.js | ✅ 已实现骨架 | IPC 处理 |
| runner.js | ✅ 已实现骨架 | 执行引擎 |
| registry.js | ✅ 已实现骨架 | 节点注册 |
| dagUtils.js | ✅ 已实现 | DAG 检测 |
| api.js | ✅ 已实现骨架 | Workflow API |
| default.json | ✅ 已实现 | 默认配置 |
| llm.json | ✅ 已实现 | LLM 配置 |
| feishu.json | ✅ 已实现 | 飞书配置 |
| 前端组件 | ⏳ 待实现 | M0 阶段 |
| 节点实现 | ⏳ 待实现 | M0 阶段 |
| Schema 定义 | ⏳ 待实现 | M0 阶段 |
| 模板文件 | ⏳ 待实现 | M0 阶段 |