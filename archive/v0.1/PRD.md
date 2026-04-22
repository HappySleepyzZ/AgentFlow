# AgentFlow PRD

**版本**：v0.1 draft
**作者**：coder + 容与
**日期**：2026-04-22

---

## 1. 项目背景

### 1.1 现状
- 现有 OpenClaw 已有 `sessions_spawn` + TaskFlow 机制支持主/子 Agent 协作
- 但交互层仅限 IM 消息流，没有"俯视全局"的可视化
- 无法直观看到"谁在工作、走到哪一步、产物在哪"
- 复杂工作流（如 7 步配表、脚本写作+critic+修改）靠人脑+文字维持，难以沉淀和复用

### 1.2 用户痛点
1. 跑多步工作流时不知道当前进行到第几步
2. 无法预设编排，每次都要文字描述一遍流程
3. 无法复用已验证过的工作流（没有"模板/Prefab"概念）
4. 成本/失败原因/中间产物都散落在消息里，难以追溯
5. 想让多个 agent 并行/条件分支/重试等高级编排，纯对话搞不定

### 1.3 目标用户
- **第一阶段**：作者本人（单人使用，多场景）
- **第二阶段**：推广为平台，每个用户有独立 workspace

---

## 2. 产品定位

### 2.1 一句话
> 面向个人和团队的可视化多 Agent 工作流编排平台。

### 2.2 类比
- **视觉**：ComfyUI（极简画布、端口数据流、暗色主题）
- **执行模型**：UE 蓝图（执行引脚 + 数据引脚双轨）
- **封装**：Unity Prefab（Instance / Variant / Unpack）
- **逻辑节点**：行为树（Selector / Retry / RaceFirst）

### 2.3 和现有工具的区别

| 工具 | 区别 |
|---|---|
| Dify / Langflow | 偏 LLM 应用封装，不强调"多 agent 协同"和"实时观察"，Prefab 机制弱 |
| n8n | 通用自动化，LLM 能力是附带，对"agent 工作流"抽象不足 |
| Rivet | 最接近，但社区小、节点体系偏 LangChain 风 |
| Temporal UI | 后端引擎强，但不是"编辑器"，用户需写代码 |
| ComfyUI | 专用于图像，但形态是我们的灵感来源 |

**AgentFlow 的差异化**：原生为"多 agent 协同 + 实时可观测 + Prefab 复用"而设计。

---

## 3. 核心概念

### 3.1 节点（Node）
图中最小的执行单元。具有：
- 输入/输出端口（类型化）
- 参数配置
- 执行状态（pending/running/done/failed/waiting_approval）
- 缓存（输入未变则跳过）

### 3.2 引脚（Pin / Port）
两种：
- **执行引脚**（⚪ 白色）：决定节点执行先后
- **数据引脚**（🔵🟢🟠 彩色，按类型）：决定数据流向

### 3.3 工作流（Workflow / Graph）
一张画布上节点 + 连线的集合。可保存、加载、运行。

### 3.4 Prefab
封装好的子工作流，支持 Unity 风格：
- **Instance**：引用模板，模板变它就变
- **Variant**：继承模板，可 override 部分参数
- **Unpacked**：脱离模板，独立演化
- **版本锁**：可选 pin 到特定版本

### 3.5 Agent
OpenClaw sub-agent（通过 `sessions_spawn` 调起）。
**Agent 是节点的参数，不是节点类型**——同一个"AgentTask"节点，换个 agent 参数就跑不同角色。

### 3.6 Step（节点内部步骤）
一个 Agent 节点内部可能经历多步（比如 TaskFlow 分发子任务）。画布上通过节点内嵌进度 `▓▓▓░░ 3/7` 展示。

---

## 4. 核心功能（P0 / P1 / P2）

### P0 - MVP 必备
- [x] 画布：ReactFlow 暗色主题，拖拽/连线/缩放/框选
- [ ] 节点库面板（左侧）
- [ ] 属性面板（右侧，选中节点时显示参数）
- [ ] 运行时面板（底部，展示日志/产物/事件）
- [ ] 保存/加载工作流（JSON 文件）
- [ ] 后端执行引擎：拓扑排序 + 并发
- [ ] WebSocket 实时事件（节点状态、步骤进度、产物预览）
- [ ] 基础节点集（见 P0 节点清单）
- [ ] OpenClaw Agent 集成（通过 sessions_spawn 调起）

### P1 - 可用性
- [ ] Prefab：Instance / Variant / Unpack
- [ ] 节点级缓存（重跑时跳过没变的节点）
- [ ] 断点/单节点重跑
- [ ] HITL 节点（人工审批，通过 Feishu 卡片）
- [ ] 运行历史 & Trace
- [ ] 成本/Token 统计
- [ ] 子图（Group）双击进入
- [ ] 变量系统（全局 state）

### P2 - 正经平台
- [ ] 多用户 & workspace 隔离
- [ ] Prefab 市场（分享、下载、版本管理）
- [ ] Webhook 触发 / 定时触发
- [ ] 工作流版本控制（类似 git）
- [ ] 协作编辑（多人同时编辑）
- [ ] 调试器（断点、变量观察、步进）

---

## 5. P0 节点清单

### 5.1 工作节点
| 节点 | 说明 | 关键参数 |
|---|---|---|
| **LLMStep** | 一次 LLM 调用 | model, prompt, temperature |
| **AgentTask** | 调 OpenClaw sub-agent | agent_id, task, timeout |
| **Script** | 执行 Python 代码 | code |
| **HttpCall** | 调外部 API | method, url, headers, body |
| **HumanApprove**（P1） | 人工审批 | question, options |

### 5.2 控制流节点
| 节点 | 说明 |
|---|---|
| **Start** | 工作流入口 |
| **End** | 工作流出口 |
| **Sequence** | 顺序执行多个分支 |
| **Parallel** | 并行执行全部分支 |
| **Branch** | if-else 条件分支 |
| **Loop** | ForEach 循环 |
| **Selector**（P1） | 行为树式"试到成功为止" |
| **Retry**（P1） | 失败重试 N 次 |

### 5.3 数据节点
| 节点 | 说明 |
|---|---|
| **UserInput** | 用户输入（文本/文件/JSON） |
| **Output** | 展示/保存输出 |
| **SetVariable / GetVariable** | 全局 state 读写 |
| **Merge** | 多路数据合并 |
| **Transform**（P1） | 简单数据变换（表达式） |
| **Const** | 常量值 |

---

## 6. 关键用户场景

### 场景 1：7 步配表工作流（实时观察）
用户把配表流水线展开成 7 个节点，点击运行后：
- 当前节点高亮绿色脉冲
- 节点上显示"步骤 3/7 · 字段映射"
- 端口旁边实时出现产物预览
- 跑到第 5 步卡住了 → 看节点详情、改参数、单节点重跑

### 场景 2：脚本写作 + Critic 循环
```
[UserInput] → [AgentTask: Writer] → [AgentTask: Critic] → [Branch]
                        ↑                                      |
                        └──────────── 评分<8  ←────────────────┘
                                                               ↓ 评分≥8
                                                          [Output]
```
有循环，Critic 评分低就回改，直到达标。

### 场景 3：多 Agent 竞标（游戏文案）
```
[UserInput: 关卡描述]
       ↓
   [RaceFirst]
   ├─ [AgentTask: writer_poetic]
   ├─ [AgentTask: writer_terse]
   └─ [AgentTask: writer_humorous]
       ↓
   [HumanApprove: 选一个]
       ↓
   [Output]
```
3 个风格不同的 writer 同时跑，用先交稿的；或人工挑选。

### 场景 4：Prefab 复用
用户把"配表流水线"打包成 Prefab，后续不同项目拖一下这个 Prefab 就能用，改了模板所有使用处同步。

---

## 7. 非功能需求

### 7.1 性能
- 单机 MVP 目标：支持 100 节点规模的工作流流畅编辑
- 执行并发：默认 4（可配置），单节点超时默认 5 分钟

### 7.2 可观测
- 每个节点：start/end 时间、耗时、token、成本、中间产物
- 运行全局：当前进度、成功率、总成本

### 7.3 可靠性
- 保存自动触发（debounce 2s）
- 运行时崩溃不丢已完成节点状态
- 执行记录持久化（JSON 文件，P2 再上 DB）

### 7.4 可扩展
- 节点以插件形式注册，方便新增
- Prefab 文件格式版本化

---

## 8. 不做的事（MVP 范围外）

- ❌ 图像/音视频生成节点（后续作为 Prefab 引入）
- ❌ 多人协作编辑
- ❌ 移动端适配
- ❌ 用户认证/权限
- ❌ 云部署/SaaS
- ❌ 付费计划

---

## 9. 成功标准

### MVP 成功
1. 能跑通"7 步配表"示例（P0 全部节点可用 + 实时显示）
2. 能跑通"脚本+Critic 循环"（含 Loop 和 Branch）
3. 自动保存 + 关闭重开工作流不丢失
4. 单节点失败可单独重跑

### V1 成功
1. 3 个真实生产工作流沉淀为 Prefab
2. 连续使用 1 周无重大 bug
3. 自己愿意把 Prefab 分享出去

---

## 10. 风险与未知

| 风险 | 影响 | 缓解 |
|---|---|---|
| OpenClaw `sessions_spawn` 稳定性 | 影响 agent 节点执行 | PoC 先用 mock，再真接 |
| WebSocket 事件风暴（大工作流）| 前端卡 | 节流 + 折叠历史 |
| 循环节点无限跑 | 成本失控 | 强制 max_iterations + 超时 |
| Prefab 版本变动破坏工作流 | 跑失败 | 支持版本锁 + 升级提示 |
| 前端性能（大图）| 卡 | ReactFlow 虚拟化 + 局部渲染 |
