# AgentFlow 开发路线图

**版本**：v0.3（桌面版 Electron）
**起点**：2026-04-22
**修订原因**：放弃后端，缩短开发周期

---

## 📝 v0.3 核心变更

| 项 | v0.2 | v0.3 | 变化说明 |
|---|---|---|---|
| M0 | 1-2 晚（4-8h）| **1 晚（3-4h）** | 无前后端分离，更快 |
| M1 | 6 周 | **3-4 周** | 简化架构，消灭红线问题 |
| M2 | +5 周 | **+3-4 周** | 无需平台化基建 |
| M3 | Go/No-Go 触发 | **可选**（或迁移后端版）| 降低愿景压力 |

---

## 里程碑总览

| 里程碑 | 时间 | 核心目标 | 成功判定 |
|---|---|---|---|
| **M0 - Spike** | 1 晚 | Electron 框架 + 画布能转 | 单 exe 能跑 |
| **M1 - MVP** | 3-4 周 | 能跑真实工作流 + 成本可观测 + HITL | 连续 5 天使用 + 1 同事 |
| **M2 - Daily Driver** | +3-4 周 | Prefab + GitHub 分享 | 3 Prefab + Go/No-Go |
| **M3 - 平台化** | 可选 | 多用户 + 后端版 | Go/No-Go 触发 |

---

## M0 - Spike（1 晚，3-4h）

**目标**：验证 Electron 技术路线，产出单 exe 能跑。

### 交付物
- [ ] Electron 项目骨架（main.js + renderer.html）
- [ ] React + ReactFlow 画布（CDN 先用，M1 上 Vite）
- [ ] 3 个 mock 节点（UserInput / LLMStep mock / Output）
- [ ] IPC 通信层建立（ipcMain + ipcRenderer）
- [ ] 本地 JSON 保存/加载
- [ ] electron-builder 打包测试
- [ ] **首次打开自动加载示例 workflow** ⭐交互红线
- [ ] **内置 3 个模板（Hello World / LLM 对话 / 7 步配表）** ⭐激活策略

### 技术栈（M0 锁死）
- 主进程：Node.js + Express（thin layer）
- 前端：React 18 + ReactFlow 11（CDN）
- 存储：本地 JSON

### 验收
exe 打包 → 安装 → 打开后自动加载模板 1 → 点击运行 → 1 分钟跑完 → 弹出结果卡片（产物预览 + Token 统计）。⭐交互红线验收

---

## M1 - MVP（3-4 周）

### M1-W1：内核周（第 1 周）

**目标**：建立核心架构 + 执行引擎。

- [ ] **前端上 Vite**（从 M0 CDN 迁移）
- [ ] **JSON Schema SSOT 链路**
- [ ] **执行引擎：同步遍历 + Promise**（无并发复杂度）
- [ ] IPC 通信层完善（service 层封装）
- [ ] 节点：LLMStep（真 LLM）、AgentTask、Script
- [ ] 执行引擎 3 个测试（线性/并行/失败）

**里程碑检查**：
- 能真调 GLM / Claude
- 能真调 OpenClaw sub-agent
- 测试全绿

### M1-W2：控制流周（第 2 周）

**目标**：P0 控制流（除 Loop）全覆盖。

- [ ] Branch / Parallel / Sequence / Merge
- [ ] SetVariable / GetVariable / Const
- [ ] 端口类型系统 + 连线校验
- [ ] 自动保存（debounce 2s）
- [ ] **还债日 1-2 天**：重构 + 补测试

**里程碑检查**：
- 能跑 Branch + Parallel 混合 workflow
- 类型不兼容时前端阻断连线

### M1-W3：生产周（第 3 周）

**目标**：加上成本统计 + HITL + Loop + 交互红线修复。

- [ ] Token/成本统计（节点级 + run 级）
- [ ] **运行完成弹出结果卡片（产物预览 + Token 统计 + 节点成功率）** ⭐交互红线
- [ ] HumanApprove（**M1 用本地弹窗阻塞，M2 再接飞书卡片 + ngrok**）⭐降低门槛
- [ ] Loop 节点（嵌套执行）
- [ ] 运行日志（本地 log.jsonl）
- [ ] 端到端 demo：7 步配表 + 脚本+Critic 循环

**里程碑检查**：
- 运行完成后画布中央弹出结果卡片
- 本地弹窗审批可用（无需 ngrok 配置）
- Loop 能跑通循环

**里程碑检查**：
- HumanApprove 能收到飞书审批
- Loop 能跑通循环
- 7 步配表全程 demo 给同事看

### M1-W4：真实使用周（第 4 周）

**目标**：作者 dogfooding + 同事 onboarding。

- [ ] 作者连续 5 天真实使用（硬指标）
- [ ] 1 位同事试用并反馈
- [ ] 修复 top-10 bug
- [ ] 写 README + QuickStart
- [ ] 打包稳定版 exe 发布给同事

---

## M2 - Daily Driver（+3-4 周）

### M2-W1-W2：Prefab 系统
- [ ] Create Prefab
- [ ] Instance 引用 + 联动更新
- [ ] Variant（override + revert）
- [ ] Unpack Prefab
- [ ] Prefab 版本锁 + migration diff

**里程碑**：把"7 步配表"打包为 Prefab，同事引用并 override。

### M2-W3：GitHub 分享
- [ ] Workflow/Prefab 推送到 GitHub repo
- [ ] 同事 clone → 运行 → PR 流程
- [ ] Repo README + 示例 Prefab
- [ ] 3 位同事试用 GitHub 分享流程

### M2-W4：Go/No-Go 评审
- [ ] 至少 3 位非作者同事试用
- [ ] 收集反馈："愿意继续用" vs "没兴趣"
- [ ] **决策**：
  - 3 位愿用 → 触发 M3 或迁移后端版
  - 未达标 → 定位为"个人+小圈子工具"

---

## M3 - 平台化（可选）

**启动条件**：
- M2 Go/No-Go 通过
- 至少 3 位同事愿长期使用
- 有多人实时协作需求

**功能清单**：
- [ ] 迁移到后端版（Express → Nest.js + PostgreSQL）
- [ ] 用户认证 + workspace 隔离
- [ ] Prefab 市场
- [ ] 运行回放
- [ ] Docker Compose 部署

---

## 单人 part-time 作战纪律（不变）

1. 每周末 git tag `v0.x.y-wN`
2. 每周写 200 字 dev log
3. 不做新功能前测试全绿
4. 技术债超半天立即还债
5. M1 期间不接大需求

---

## 立即 Next Step

### 今晚
1. 确认 v0.3 PRD + ROADMAP + ARCHITECTURE
2. 开始 M0 Spike（1 晚）
3. 产出 Electron 骨架 + 单 exe 能跑

### M0 之后
→ M1-W1 内核周开始