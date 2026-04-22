# AgentFlow 开发路线图

**版本**：v0.2（基于 v0.1 评审修订）
**起点**：2026-04-22
**v0.1 原件**：`archive/v0.1/ROADMAP.md`

---

## 📝 v0.2 修订摘要

| 项 | v0.1 | v0.2 |
|---|---|---|
| M0 | 2-4h | **1-2 晚（4-8h）** |
| M1 | 2-3 周 | **6 周（拆 4 段）** |
| M2 | +2 周 | **+5 周** |
| M3 | +1-2 月 | **Go/No-Go 触发，不固定** |
| HITL | P1（M2）| **M1 第 3 周** ⭐提前 |
| 成本统计 | P1（M2）| **M1 第 3 周** ⭐提前 |
| Loop 节点 | M1 第 2 周 | **M1 第 4-6 周** ⭐推迟 |
| 运行回放 | M1 第 3 周 | **P2（M3）** ⭐降级 |
| Vite 构建 | 未提 | **M1 第 1 周必做** ⭐新增 |
| Schema SSOT | 未提 | **M1 第 1 周必做** ⭐新增 |
| Checkpoint | 未提 | **M1 第 3 周必做** ⭐新增 |
| 还债日 | 未安排 | **M1 第 2 周末 2-3 天** ⭐新增 |

---

## 里程碑总览

| 里程碑 | 时间 | 核心目标 | 成功判定 |
|---|---|---|---|
| **M0 - Spike** | 1-2 晚 | 画布能转圈 | 作者愿意继续投入 |
| **M1 - MVP** | 6 周 | 能跑真实工作流 + 成本可观测 + HITL | 连续 5 天真实使用 + 1 同事愿试 |
| **M2 - Daily Driver** | +5 周 | Prefab + 行为树 + Trace | 3 Prefab 沉淀 + 2 周无 bug + Go/No-Go |
| **M3 - 平台化** | Go/No-Go 触发 | 多用户 + 市场 + 云部署 | 10 用户 + 1 外部贡献 |

---

## M0 - Spike（1-2 晚）

**目标**：2-8h 内验证技术路线，看到"画布在转"。

### 交付物
- backend/ + frontend/ + examples/hello.flow.json + run.sh
- 3 个 mock 节点
- WebSocket 实时高亮
- 保存/加载 JSON

### 技术栈（M0 锁死）
- 后端：Python 3.11 + FastAPI + uvicorn + websockets
- 前端：React 18 + ReactFlow 11（CDN，M0 够用）
- 存储：文件系统

### 验收
浏览器打开 → 3 节点 → 运行 → 依次变绿 → 日志显示产物。

### 详细任务见 `docs/M0_SPIKE.md`

---

## M1 - MVP（6 周，拆 4 段）

### M1-W1：基建周（第 1 周）⭐关键

**目标**：打好工程底子，避免后续技术债失控。

- [ ] **前端上 Vite**（从 M0 CDN 迁移）
- [ ] **JSON Schema SSOT 链路**：
  - 定义节点 schema JSON → 生成 Pydantic
  - 同一 schema 驱动前端 Inspector 表单
- [ ] **执行引擎重构：入边就绪驱动**（非按层并行）
- [ ] **执行引擎 3 个 pytest**：
  1. 线性流（3 节点）
  2. 并行流（Parallel 收敛）
  3. 失败流（node.failed 中断）
- [ ] 节点：LLMStep（真 LLM）、AgentTask（真 sessions_spawn）、Script（subprocess+timeout+tmpdir）
- [ ] 端到端 hello workflow 用真 LLM 跑通

**里程碑检查**：
- 能真调 GLM / Claude / OpusXX
- 能真调 OpenClaw sub-agent
- pytest 全绿
- 改一个节点定义，前后端自动同步

### M1-W2：控制流 + 交互（第 2 周）

**目标**：P0 控制流（除 Loop）全覆盖。

- [ ] Branch（条件分支）
- [ ] Parallel（并行 + 收敛）
- [ ] Sequence（串行执行）
- [ ] Merge（多路合并）
- [ ] SetVariable / GetVariable / Const
- [ ] 端口类型系统 + 连线校验
- [ ] 自动保存（debounce 2s）
- [ ] 快捷键（Del/Ctrl+C/V/Space 平移）

**⚠️ 周末必做：还债日（2-3 天）**
- 重构：执行引擎/schema 统一
- 补测试：每个控制流节点 1 个 pytest
- 文档：更新 ARCHITECTURE 同步实际实现
- git tag: `v0.2.1-w2-complete`

**里程碑检查**：
- 能跑 Branch + Parallel 混合的 workflow
- 类型不兼容时前端阻断连线
- pytest 覆盖所有控制流节点

### M1-W3：能上生产（第 3 周）⭐关键

**目标**：加上"真能跑起来且不烧钱"的必备能力。

- [ ] **Token/成本统计**（节点级 + run 级）⭐提前
- [ ] **HumanApprove 节点**（Feishu 卡片 + web 弹窗双通道）⭐提前
- [ ] **Checkpoint 机制** ⭐新增：
  - 每个 node.finished 写 `runs/<run_id>/checkpoint.json`
  - events.jsonl append-only
  - 重启后能从 checkpoint resume
- [ ] 节点级缓存（输入 hash 未变跳过）
- [ ] 单节点重跑
- [ ] 成本阈值告警（超过 $X 暂停）
- [ ] **端到端 demo：7 步配表**

**里程碑检查**：
- kill 掉后端进程，重启后 run 能从断点续跑
- HumanApprove 在飞书弹卡片能审批
- 成本超限自动暂停
- 7 步配表能全程 demo 给同事看

### M1-W4-W6：Loop + 可观测 + 真使用（第 4-6 周）

**目标**：完成最硬的 Loop，沉淀真实使用经验。

#### W4：Loop 节点
- [ ] 设计：嵌套 run_workflow 方案，非 DAG rewrite
- [ ] Loop（ForEach，parallel 可选）
- [ ] 循环上下文：iteration_index / accumulator 传递规范
- [ ] max_iterations 强制上限 + 成本阈值兜底
- [ ] **端到端 demo：脚本+Critic 循环**

#### W5：可观测深度
- [ ] 结构化日志（per-run JSON log）
- [ ] 运行历史列表（时间轴视图）
- [ ] 端口悬停预览上游产物
- [ ] 节点内嵌步骤进度 `▓▓▓░ 3/7`

#### W6：真实使用 + 同事 onboarding
- [ ] **作者连续 5 天用 AgentFlow 替代消息流**（硬指标）
- [ ] 至少 1 位同事观看 demo 并表达试用意向
- [ ] 修复使用中暴露的 top-10 bug
- [ ] 写 README + QuickStart（同事能自己装起来）

### M1 成功判定

✅ 跑通"7 步配表" + "脚本+Critic 循环"
✅ 作者连续 5 天真实使用（非 demo）
✅ 1 同事愿装一份试试
✅ 崩溃重启不丢状态
✅ 单节点失败可重跑

**如未达标**：
- 停止扩张，回来还债和迭代
- 不启动 M2 Prefab

---

## M2 - Daily Driver（+5 周）

**目标**：Prefab 让工作流沉淀 + 行为树让编排更灵活 + 观测工具支持真生产。

### M2-W1-W2：Prefab 系统
- [ ] 选中节点 → Create Prefab
- [ ] Prefab 文件格式（版本锁强制）
- [ ] Instance 引用 + 联动更新
- [ ] Variant（override + revert + apply）
- [ ] Unpack Prefab
- [ ] 左侧 Prefab 面板
- [ ] 子图双击进入编辑
- [ ] **migration diff**：Prefab 版本变更时显示 breaking 变化

**里程碑**：把"7 步配表"打包为 Prefab，在另一个 workflow 引用并 override 一个参数。

### M2-W3：行为树节点
- [ ] Selector（降级尝试）
- [ ] Retry（失败重试）
- [ ] RaceFirst（多分支竞赛）
- [ ] Timeout

### M2-W4：Trace 与触发器
- [ ] OpenTelemetry span（per-node）
- [ ] Trace 面板（时间轴视图）
- [ ] Webhook 触发器
- [ ] 定时触发器（cron）
- [ ] 消息触发器（飞书消息启动 workflow）

### M2-W5：Go/No-Go 准备 ⭐新增
- [ ] 同事 onboarding 文档
- [ ] 3 个示例 Prefab 发布
- [ ] 至少 3 位同事试用
- [ ] **Go/No-Go 评审**：
  - 3 位非作者同事愿长期用 → 触发 M3
  - 未达标 → AgentFlow 定位为"个人+小圈子工具"，不做平台化

---

## M3 - 平台化（Go/No-Go 触发）

**目标**：对外发布，支持多人使用。

**启动条件（全部满足）**：
- M2 Go/No-Go 通过
- 作者 M2 结束时仍有动力继续
- 至少 3 位非作者同事愿持续用

**功能清单**：
- [ ] 用户认证 + 多 workspace 隔离
- [ ] Prefab 市场（发布/下载/评分/版本）
- [ ] 工作流版本控制（git-like）
- [ ] 运行回放 ⭐从 P0 降级到此
- [ ] 调试器（断点/变量观察/步进）
- [ ] Docker Compose 部署
- [ ] 监控/日志/告警

**不做**：
- ❌ 企业级（SSO/SAML/审计）
- ❌ 协作编辑（不是刚需）
- ❌ 付费计划（除非真有需求）

---

## 依赖与风险汇总（v0.2）

### 关键依赖
- OpenClaw `sessions_spawn` 稳定性 → M0 mock 规避，M1 逐个接真
- LLM API Key 管理 → 复用 OpenClaw 配置
- 飞书卡片 SDK → M1 第 3 周 HITL 依赖

### 风险对冲策略
| 风险 | 缓解 |
|---|---|
| Loop 实现翻车 | 推迟到 W4，用嵌套 run_workflow 方案 |
| 节点前后端双写 | W1 上 JSON Schema SSOT |
| 测试缺失 | W1 起建 pytest，每周 tag |
| M1 W2 后技术债 | W2 末强制 2-3 天还债 |
| 弃坑（W4-W5）| 硬指标驱动 + 作者自用 + 同事反馈 |

---

## 单人 part-time 作战纪律

1. **每周末必 git tag** `v0.x.y-wN`
2. **每周写一篇 dev log**（200 字即可，记录本周进展/卡点/决策）
3. **每周更新 HEARTBEAT 节奏**
4. **不做新功能前先让 pytest 全绿**
5. **技术债超过"半天能还完"立即停手还债**
6. **M1 期间不接额外的大需求**

---

## 立即 Next Step

### 今晚
1. 确认 v0.2 PRD + ROADMAP
2. 开始 M0 Spike（1-2 晚）
3. 产出第一版 `agentflow/backend/` + `agentflow/frontend/` + hello workflow

### M0 之后
→ M1-W1 基建周开始
