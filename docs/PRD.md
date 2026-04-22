# AgentFlow PRD

**版本**：v0.2（基于 v0.1 评审修订）
**作者**：coder + 容与
**日期**：2026-04-22
**v0.1 原件**：`archive/v0.1/PRD.md`
**评审报告**：`docs/REVIEW.md`

---

## 📝 v0.2 修订摘要

- ✅ 补充目标用户 Persona（同事）
- ✅ MVP 成功标准改硬：真实使用 5 天 + 至少 1 位同事
- ✅ HITL / 成本统计优先级提升（P0 后期）
- ✅ 运行回放降级到 P2
- ✅ Loop 节点推迟实现
- ✅ M2 后加 Go/No-Go 检查点

---

## 1. 项目背景

### 1.1 现状
现有 OpenClaw 已有 `sessions_spawn` + TaskFlow 机制，但：
- 交互层仅限 IM 消息流，没有"俯视全局"的可视化
- 无法直观看到"谁在工作、走到哪一步、产物在哪"
- 复杂工作流靠人脑+文字维持，难以沉淀和复用
- 成本/失败原因/中间产物散落消息中难以追溯

### 1.2 用户痛点
1. 跑多步工作流时不知道当前进行到第几步
2. 无法预设编排，每次都要文字描述一遍流程
3. 无法复用已验证过的工作流（缺"模板/Prefab"）
4. 成本/失败/中间产物追溯困难
5. 想让多 agent 并行/条件分支/重试等高级编排，纯对话搞不定

### 1.3 目标用户

#### Persona 1：作者本人（dogfooder）
- 多场景用户（游戏制作、内容生产、脚本写作、数据处理）
- 产品开发者本身，迭代节奏最快
- 作为"第 1 号用户"验证方向

#### Persona 2：同事（早期采用者）⭐新增
- **当前工具**：codex / opencode / 飞书 OpenClaw
- **痛点**：和作者一致——"看不到 agent 工作流、难以编排"
- **特征**：
  - 已是 AI 工具早期采用者，无需教育
  - 地理/社交触达成本为零（身边的人）
  - 反馈回路极短（直接约面聊/飞书群）
- **JTBD（Jobs to be Done）**：
  > "当我让 AI 跑一个多步任务时，我想看到它进行到哪一步、产物是什么、哪里卡住了，这样我就可以随时介入或调整，而不是对着消息流猜测。"
  >
  > "当我做过一次成功的 AI 工作流后，我想把它存下来、下次一键复用或改造，而不是每次重新对话描述一遍。"

#### 第二阶段：同圈子的 AI 工具用户（post-M2）
通过同事口碑扩散的、使用 codex/opencode/claude code/openclaw 类工具的开发者。

**不做**：不面向非技术用户，不面向企业 SaaS。

### 1.4 竞品差异化

| 工具 | 和我们的差异 |
|---|---|
| Dify / Langflow | 偏 LLM 应用封装，对"多 agent 协同 + 实时观察 + Prefab 复用"弱 |
| n8n | 通用自动化，LLM 是附带，agent 抽象不足 |
| Rivet | 最接近，但社区小、节点偏 LangChain 风、无 Prefab Variant |
| Temporal UI | 后端引擎强但不是编辑器，用户需写代码 |
| ComfyUI | 形态来源，但专用于图像生成 |

**AgentFlow 的差异化**：
1. 原生为"多 agent 协同 + 实时可观测 + Prefab 复用"设计
2. 执行流 + 数据流双引脚（UE 蓝图启发，Dify/n8n 没有）
3. Unity 风格 Prefab（Instance/Variant/Unpack + 版本锁）
4. 和 OpenClaw 原生集成（sub-agent 直接作为节点）

---

## 2. 产品定位

### 一句话
> 面向 AI 工具早期采用者的可视化多 Agent 工作流编排平台。

### 四种范式混合
- **视觉**：ComfyUI 极简画布、端口数据流
- **执行**：UE 蓝图执行+数据双引脚
- **封装**：Unity Prefab（Instance/Variant/Unpack）
- **逻辑**：行为树节点（Selector/Retry/RaceFirst）

---

## 3. 核心概念

### 3.1 节点（Node）
最小执行单元。有输入/输出端口、参数、状态、缓存。

### 3.2 引脚（Pin）
- **执行引脚**（⚪ 白色）：决定执行顺序
- **数据引脚**（🔵🟢🟠 彩色）：按类型着色，决定数据流

### 3.3 工作流（Workflow）
画布上节点+连线集合。可保存、加载、运行。

### 3.4 Prefab
Unity 风格封装：
- **Instance**：引用模板，模板变它就变
- **Variant**：继承+override
- **Unpacked**：脱离模板独立演化
- **版本锁**：强制 semver，exposed_* 变更需 major 版本

### 3.5 Agent
OpenClaw sub-agent（通过 `sessions_spawn`）。
**Agent 是节点的参数，不是节点类型**——同一个 AgentTask 节点换个 agent_id 就跑不同角色。

### 3.6 Step（节点内嵌步骤）
一个节点内部多步执行，通过进度条 `▓▓▓░░ 3/7` 展示。

---

## 4. 核心功能（P0 / P1 / P2）

> ⚠️ **v0.2 调整**：HITL、成本统计、checkpoint 从 P1 提到 P0 后期；运行回放降级到 P2。

### P0 - MVP 必备（M0 + M1）

#### M0（极速 PoC）
- [x] 画布（ReactFlow 暗色主题）基础形态
- [x] 3 节点 mock（UserInput / LLMStep mock / Output）
- [x] WebSocket 实时状态高亮
- [x] 保存/加载 JSON 文件
- [x] 单文件 HTML + FastAPI 单文件

#### M1 - 第 1 周：内核
- [ ] 节点 Schema 单一来源（JSON Schema → Pydantic + 前端 Inspector 同源）
- [ ] 执行引擎：**入边就绪驱动**（非按层并行）
- [ ] 节点：LLMStep（真 LLM）、AgentTask（真 sessions_spawn）、Script
- [ ] 前端构建：Vite
- [ ] 执行引擎 3 个 pytest（线性/并行/失败）

#### M1 - 第 2 周：控制流（无 Loop）
- [ ] Branch / Parallel / Sequence
- [ ] Merge / SetVariable / GetVariable / Const
- [ ] 端口类型系统（any/text/number/boolean/json/file/exec）
- [ ] 连线类型校验
- [ ] 自动保存（debounce 2s）
- [ ] **停下来还债 2-3 天**：重构、补测试、统一 schema

#### M1 - 第 3 周：能上生产
- [ ] **Token/成本统计**（节点 + 全局）⭐提前
- [ ] **HumanApprove 节点**（Feishu 卡片）⭐提前
- [ ] **Checkpoint 机制**：events.jsonl + checkpoint.json，断电续跑 ⭐新增
- [ ] 节点级缓存（输入未变跳过）
- [ ] 单节点重跑
- [ ] 端到端跑通"7 步配表"

#### M1 - 第 4-6 周：Loop + 结构化日志 + 可观测
- [ ] **Loop 节点**（嵌套 run_workflow 方案）⭐推迟到此
- [ ] 端到端跑通"脚本+Critic 循环"
- [ ] 结构化日志（per-run JSON log）
- [ ] 运行历史列表（时间轴视图）

### P1 - 可用性（M2，4-6 周）
- [ ] Prefab：Instance / Variant / Unpack
- [ ] Prefab 版本锁 + migration diff
- [ ] 子图双击进入
- [ ] 行为树节点：Selector / Retry / RaceFirst / Timeout
- [ ] 成本告警阈值
- [ ] 触发器：Webhook / 定时 / 消息
- [ ] OpenTelemetry Trace（per-node span）

### P2 - 正经平台（M3，条件触发）
- [ ] 多用户 & workspace 隔离
- [ ] Prefab 市场
- [ ] 工作流版本控制
- [ ] 协作编辑
- [ ] 运行回放 ⭐从 M1 降级到此
- [ ] 调试器（断点/变量观察）

---

## 5. 关键用户场景

### 场景 1：7 步配表工作流（实时观察）⭐ M1 第 3 周 demo 目标
7 个节点展开，运行时：
- 当前节点绿色脉冲
- 节点内嵌"步骤 3/7 · 字段映射"
- 产物预览悬停可见
- 卡住时看详情、改参数、单节点重跑

### 场景 2：脚本写作 + Critic 循环 ⭐ M1 第 6 周 demo 目标
```
[UserInput] → [AgentTask: Writer] → [AgentTask: Critic] → [Branch]
                        ↑                                      │
                        └────────────── 评分<8 ←───────────────┘
                                                               ↓ ≥8
                                                          [Output]
```
含循环，需 Loop 节点完成后才能跑通。

### 场景 3：多 Agent 竞标（M2）
```
[Input] → [RaceFirst]
            ├─ [writer_poetic]
            ├─ [writer_terse]
            └─ [writer_humorous]
          ↓
          [HumanApprove: 选一个]
          ↓
          [Output]
```

### 场景 4：Prefab 复用（M2）
配表流水线打包 Prefab，不同项目直接拖用，改模板全同步。

### 场景 5：同事 onboarding（M2 末 Go/No-Go）
- 同事打开 Dashboard
- 看作者分享的 workflow/prefab 跑起来
- 给出反馈："我想用"还是"没兴趣"

---

## 6. 非功能需求

### 6.1 性能
- 单机 MVP：100 节点规模流畅编辑
- 执行并发默认 4，单节点超时默认 5min

### 6.2 可观测 ⭐强化
- 每节点：start/end/耗时/token/成本/产物
- 全局：当前进度/成功率/总成本
- **M1 结构化日志 → M2 OpenTelemetry**

### 6.3 可靠性 ⭐强化
- 自动保存（debounce 2s）
- **运行崩溃不丢状态**（checkpoint 机制，M1 必备）
- 运行记录持久化

### 6.4 可扩展
- 节点以插件形式注册
- **节点 Schema 单一来源**（M1 必备）
- Prefab 文件格式版本化

### 6.5 安全 ⭐新增
- Script 节点：subprocess + timeout kill + tmpdir（不搞进程内沙箱）
- HttpCall：仅白名单域名（M2 可配）
- AgentTask：受 OpenClaw sub-agent 权限边界约束

---

## 7. 不做的事

### MVP 外
- ❌ 图像/音视频节点
- ❌ 多人协作编辑
- ❌ 移动端
- ❌ 用户认证（平台化前）
- ❌ 云部署/SaaS

### 可能永远不做
- ❌ 非技术用户可视化（我们就是为技术用户做的）
- ❌ 企业级功能（SSO/SAML/审计）
- ❌ 付费计划（除非真有需求）

---

## 8. 成功标准 ⭐修订

### M0 成功
浏览器打开 → 画布 3 节点 → 运行 → 依次变绿 → 作者本人愿意继续投入。

### M1 MVP 成功
1. 跑通"7 步配表" + "脚本+Critic 循环"
2. **作者本人连续 5 天用 AgentFlow 替代纯消息流完成至少 1 个真实任务** ⭐硬指标
3. **至少 1 位同事看过 demo 后愿意自己装一份试试** ⭐硬指标
4. 自动保存 + 崩溃后不丢状态
5. 单节点失败可重跑

### M2 Daily Driver 成功
1. 3 个真实生产工作流沉淀为 Prefab
2. 连续 2 周无重大 bug
3. **Go/No-Go 检查**：至少 3 位非作者同事愿意继续使用 → 触发 M3
4. 如未达标：AgentFlow 定位为"个人+小圈子工具"，不做平台化

### M3 平台化成功（如触发）
- 10+ 非作者用户
- 1+ 非作者贡献 Prefab
- 运维成本可接受

---

## 9. 风险与缓解 ⭐更新

| 风险 | 原评估 | 新评估（评审后）| 缓解 |
|---|---|---|---|
| OpenClaw sessions_spawn 稳定性 | 中 | 中 | M0 mock，M1 逐个接真 |
| Loop 节点实现复杂度 | 低 | **高（80% 崩盘）** | 推迟到 M1 第 4-6 周，用嵌套 run_workflow 方案 |
| 节点前后端定义双写 | 未识别 | **高（70% 维护失控）** | M1 第 1 周引入 JSON Schema SSOT |
| M1 末期回归失控 | 未识别 | **高（65%）** | M1 第 2 周停下还债 + 3 个核心 pytest |
| WebSocket 事件风暴 | 中 | 中 | 节流 + 折叠 |
| 循环无限跑烧钱 | 中 | 中 | max_iterations + 成本阈值 |
| Prefab 版本破坏 | 中 | 中 | 强制版本锁 + migration diff |
| 弃坑（M1 第 4-5 周） | 未识别 | **关键** | 每周末 git tag + M1 第 2 周还债 + 硬指标驱动 |

---

## 10. 决策点清单

| 决策 | 选择 | 理由 |
|---|---|---|
| 目标用户第一阶段 | 作者 + 3-5 位同事 | 反馈回路短、信任成本零 |
| 目标用户第二阶段 | AI 工具同圈子开发者 | 通过同事口碑扩散 |
| MVP 硬指标 | 连续 5 天真实使用 + 1 位同事愿试 | 比"跑通 demo"硬 |
| Loop 方案 | 嵌套 run_workflow | 语义清晰，不动 DAG |
| 执行引擎 | 入边就绪驱动 | 不会死锁/提前执行 |
| Script 沙箱 | subprocess + tmpdir | 不搞进程内沙箱 |
| 前端构建 | Vite（M1 第一件事） | CDN 撑不到 M1 末 |
| Schema | JSON Schema SSOT | 前后端同源生成 |
| 平台化启动 | M2 末 Go/No-Go | 3 位非作者同事愿用 |
