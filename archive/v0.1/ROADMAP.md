# AgentFlow 开发路线图

**版本**：v0.1 draft
**起点**：2026-04-22

---

## 里程碑总览

| 里程碑 | 时间 | 核心目标 |
|---|---|---|
| **M0 - Spike** | 1-2 晚（~4h）| 单文件 HTML + Python 后端，跑通 3 节点 hello workflow |
| **M1 - MVP** | 2-3 周 | P0 全部功能，能跑真实"7 步配表"和"脚本+Critic 循环" |
| **M2 - Daily Driver** | +2 周 | P1 功能（Prefab、HITL、缓存、Trace）齐活，成为日常工具 |
| **M3 - 平台化** | +1-2 月 | 多用户、Prefab 市场、云部署 |

---

## M0 - Spike（极速 PoC）

**目标**：2-4 小时内验证技术路线，让作者看到"画布在转"。

### 交付物
- `backend/main.py`（FastAPI 单文件，~200 行）
- `frontend/index.html`（单页，CDN 引 ReactFlow，~300 行）
- 3 个内置节点：`UserInput`、`LLMStep (mock)`、`Output`
- WebSocket 实时高亮当前节点
- 可保存/加载 `.flow.json`

### 技术栈（锁死，不再改）
- 后端：**Python 3.11 + FastAPI + uvicorn + websockets**
- 前端：**React 18 + ReactFlow 11（CDN）**
- 通信：**HTTP（保存/加载/触发）+ WebSocket（事件流）**
- 存储：**文件系统**（`workflows/*.flow.json`）

### 任务拆解
1. 目录骨架 + 空文件 ✓
2. 后端 `/api/workflows` CRUD
3. 后端 `/api/run` 触发 + `/ws` 事件流
4. 简单执行器（拓扑排序 + asyncio）
5. Node registry（3 个内置节点）
6. 前端画布（拖拽、连线、右键菜单）
7. 前端节点库面板（左）+ 属性面板（右）
8. 前端 WS 订阅 + 节点状态高亮
9. 端到端 demo（hello workflow）

### 成功标准
浏览器打开 → 画布上有 3 个节点 → 点"运行"→ 节点依次变绿 → 右下角面板显示产物。

---

## M1 - MVP

**目标**：能跑真实工作流，成为比消息流更高效的工作界面。

### 功能清单（对应 PRD P0）

#### 1. 画布增强
- [ ] 节点类型颜色区分（工作/控制流/数据）
- [ ] 端口类型校验（拒绝不兼容的连线）
- [ ] 节点内嵌步骤进度条 `▓▓░ 3/7`
- [ ] 端口悬停预览上游产物
- [ ] 运行时右下角全局状态条
- [ ] 节点状态：pending/queued/running/done/failed/waiting
- [ ] 选中节点时右侧属性面板同步
- [ ] 自动保存（debounce 2s）
- [ ] 快捷键（Del / Ctrl+C/V / Space 平移）

#### 2. 节点集（P0 全部）
- 工作：LLMStep、AgentTask、Script、HttpCall
- 控制流：Start、End、Sequence、Parallel、Branch、Loop
- 数据：UserInput、Output、SetVariable、GetVariable、Merge、Const

#### 3. 执行引擎
- [ ] 真实 LLM 调用（OpenAI / Claude / 本地 proxy）
- [ ] 真实 OpenClaw `sessions_spawn` 接入
- [ ] 节点超时 / 取消 / 错误捕获
- [ ] 循环节点（Loop）的子图执行
- [ ] 分支（Branch）的条件求值

#### 4. 数据类型系统
- [ ] 端口类型：`text / json / file / number / boolean / any`
- [ ] 类型兼容规则（any 兼容一切，json 可接 text 反之不行...）
- [ ] 前端连线时显示类型冲突提示

#### 5. 运行历史
- [ ] 每次运行保存到 `runs/<run_id>/`：节点状态、产物、日志
- [ ] 界面展示最近 N 次运行
- [ ] 点击历史可"回放"（节点按真实时间轴重放）

### 任务拆分（按周）

#### 第 1 周：内核
- 节点类型颜色 + 端口类型系统
- 节点集：LLMStep / AgentTask 真接入 / Script
- 执行引擎增强：并发、超时、错误处理
- 属性面板（JSON Schema 驱动）

#### 第 2 周：复杂控制流 + 交互
- Branch / Loop / Parallel
- Merge / SetVariable / GetVariable
- 自动保存 + 节点级缓存
- 端口类型校验

#### 第 3 周：可观测 & 调试
- 运行历史 + 回放
- 单节点重跑
- 节点内嵌步骤进度
- 端到端跑通"7 步配表"和"脚本+Critic"demo

---

## M2 - Daily Driver

**目标**：支持真正复杂的工作流和复用，成为日常工具。

### 功能清单（对应 PRD P1）

#### Prefab 系统（最重磅）
- [ ] 选中节点 → 右键 Create Prefab
- [ ] Prefab 文件格式设计 + CRUD
- [ ] Prefab Instance 引用 & 联动更新
- [ ] Prefab Variant（override）
- [ ] Unpack Prefab / Revert / Apply All
- [ ] 版本锁（可选 pin）
- [ ] 左侧 "我的 Prefab" 面板
- [ ] 子图双击进入编辑

#### 人工介入（HITL）
- [ ] HumanApprove 节点
- [ ] 通过 Feishu 卡片（或前端弹窗）推送审批
- [ ] 审批超时策略

#### 高级逻辑节点（行为树风）
- [ ] Selector（降级）
- [ ] Retry（重试）
- [ ] RaceFirst（多 agent 竞标）
- [ ] Timeout

#### 可观测深度
- [ ] Token / 成本统计（按节点 + 全局）
- [ ] Trace 面板（时间轴视图）
- [ ] 成本告警阈值

#### 触发器
- [ ] Webhook 触发
- [ ] 定时触发（cron）
- [ ] 消息触发（从 OpenClaw 消息流启动 workflow）

---

## M3 - 平台化

**目标**：对外发布，支持多人使用。

- [ ] 用户认证（OAuth / 本地账号）
- [ ] 多 workspace 隔离
- [ ] Prefab 市场（发布、下载、评分、版本）
- [ ] 工作流版本控制（类似 git）
- [ ] 云部署方案（Docker Compose 一键 + SaaS）
- [ ] 监控/日志/告警
- [ ] 付费计划（可选）

---

## 依赖与风险

### 依赖
- OpenClaw `sessions_spawn` 的稳定性和回调机制
- LLM API Key 管理（复用 OpenClaw 的配置）
- 文件系统存储（本地单用户够用，平台化要上 DB）

### 风险对冲
- **M0 先 Mock**：不碰真 LLM / sessions_spawn，只验证画布形态
- **M1 增量接真**：一个个节点切过去，保持可回滚
- **M2 之前都是单用户**：不涉及多租户/权限复杂度

---

## 并行/优先级建议

按"用户价值 / 开发成本"排序：

1. **最先**：M0（验证形态）→ 让用户看到在动，决定是否继续
2. **核心**：M1 第 1-2 周（画布 + 核心节点 + 真执行）→ 能做事
3. **复用**：M2 Prefab → 让工作流能沉淀
4. **增强**：M1 第 3 周（可观测）+ M2 HITL → 真生产可用
5. **推广**：M3 → 做成平台

---

## 即时 Next Step（今晚）

**建议**：按 M0 开工，2-4 小时内交付：
1. 后端骨架（FastAPI + WS）
2. 前端骨架（单 HTML + ReactFlow CDN）
3. 3 节点 hello workflow 跑通

**产出验证**：明天打开浏览器，能看到画布转圈跑 demo。

如确认开工，我直接 start。
