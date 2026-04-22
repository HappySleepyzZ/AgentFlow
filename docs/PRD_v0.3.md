# AgentFlow PRD

**版本**:v0.3(桌面版 Electron)
**修订日期**:2026-04-22
**修订原因**:放弃后端,改为桌面 exe + 本地存储 + GitHub 分享

---

## 📝 v0.3 核心变更

| 项目 | v0.2(FastAPI 后端)| v0.3(桌面版)| 变化说明 |
|---|---|---|---|
| **部署形态** | 前后端分离 + WebSocket | Electron 单 exe | 无服务器依赖 |
| **开发复杂度** | 高(前后端双写 + 状态同步)| 低(前后端合一)| 缩短开发周期 |
| **HITL 审批** | 飞书 webhook + 服务端等待 | 飞书 API + ngrok/tailscale | 桌面版也能集成 |
| **分享协作** | 需 M3 平台化 | GitHub repo + workflow.json | Git 作为版本管理 |
| **离线可用** | 需在线 | 纯离线可用 | 无网络依赖 |
| **Script 安全** | subprocess + setrlimit(红线)| child_process.spawn(信任用户)| 消灭红线问题 |
| **M3 平台化** | 必做 | **可选**(Go/No-Go 触发)| 降低愿景压力 |

---

## 1. 项目背景(不变)

### 1.1 现状
现有 OpenClaw 已有 `sessions_spawn` + TaskFlow 机制,但:
- 交互层仅限 IM 消息流,没有"俯视全局"的可视化
- 无法直观看到"谁在工作、走到哪一步、产物在哪"
- 复杂工作流靠人脑+文字维持,难以沉淀和复用
- 成本/失败原因/中间产物散落消息中难以追溯

### 1.2 用户痛点
1. 跑多步工作流时不知道当前进行到第几步
2. 无法预设编排,每次都要文字描述一遍流程
3. 无法复用已验证过的工作流(缺"模板/Prefab")
4. 成本/失败/中间产物追溯困难
5. 想让多 agent 并行/条件分支/重试等高级编排,纯对话搞不定

---

## 2. 目标用户（修订）⭐

### Persona 1：作者本人（dogfooder）
- 多场景用户（游戏制作、内容生产、脚本写作、数据处理）
- 产品开发者本身，迭代节奏最快

### Persona 2：同事（早期采用者）⭐访谈结果
- **访谈日期**：2026-04-22
- **访谈结果**：同事"没啥想法"——痛点不够强烈
- **决策**：作者 dogfooding 为主，同事作为被动试用者
- **当前工具**：codex / opencode / 飞书 OpenClaw
- **特征**：
  - 已是 AI 工具早期采用者，无需教育
  - 地理/社交触达成本为零
- **JTBD**：
  > "当我让 AI 跑一个多步任务时，我想看到它进行到哪一步、产物是什么、哪里卡住了。"

**⚠️ 关键信号**：同事痛点不够强烈 → MVP 成功标准不能依赖同事主动发起任务，改为"作者连续 5 天真实使用 + 同事被动试用并给出反馈"。

### 第二阶段:AI 工具同圈子开发者(post-M2)
通过同事口碑扩散的、使用 codex/opencode/claude code/openclaw 类工具的开发者。

**不做**:不面向非技术用户,不面向企业 SaaS。

---

## 3. 产品定位(微调)

### 一句话
> 面向 AI 工具早期采用者的可视化多 Agent 工作流编排桌面应用。

### 新增特性(v0.3)
- ✅ 纯离线可用(无服务器依赖)
- ✅ GitHub 分享协作(无需平台化)
- ✅ 单 exe 分发(一键安装)

---

### 4. 激活策略（交互设计改进）⭐新增

**痛点不强时的激活路径**：
```
作者演示 → 同事看到模板产物可用 → 痛点被激活 → 愿意打开应用 → 开箱即用模板激活需求
```

**核心策略**：**内置模板（作者搭建，开箱即用）**

| 模板 | 说明 | 预期效果 |
|---|---|---|
| **模板 1：Hello World** | 1 节点（UserInput → Output）| 1 分钟跑完，理解“输入→输出” |
| **模板 2：LLM 对话** | 3 节点（UserInput → LLMStep → Output）| 3 分钟跑完，理解“LLM 处理” |
| **模板 3：7 步配表** | 7 节点完整配表流程 | 10 分钟跑完，理解“复杂编排 + 真实产物” |

**开箱即用设计**：
- 首次打开应用 → 自动加载“模板 1：Hello World”
- 画布中央显示“点击 ▶ 运行按钮体验”
- 运行完成后弹出结果卡片（产物预览 + Token 统计）
- 用户无需任何操作即可看到价值

详细设计见：`docs/TEMPLATES.md`

---

### 5. 核心功能（P0 / P1 / P2）

### P0 - MVP 必备(M0 + M1)

#### M0(极速 PoC,1-2 晚)
- [x] Electron 基础框架搭建
- [x] 画布(ReactFlow 暗色主题)
- [x] 3 节点 mock(UserInput / LLMStep mock / Output)
- [x] 本地 JSON 保存/加载
- [x] 单 exe 打包测试

#### M1 - 第 1 周:内核
- [ ] 节点 Schema SSOT(JSON Schema → 前端 Inspector)
- [ ] 执行引擎:同步遍历 + Promise(无并发复杂度)
- [ ] 节点:LLMStep(真 LLM)、AgentTask、Script
- [ ] IPC 通信层建立
- [ ] 执行引擎 3 个测试(线性/并行/失败)

#### M1 - 第 2 周:控制流
- [ ] Branch / Parallel / Sequence / Merge
- [ ] SetVariable / GetVariable / Const
- [ ] 端口类型系统 + 连线校验
- [ ] 自动保存(debounce 2s)
- [ ] 还债日 2-3 天

#### M1 - 第 3 周:能上生产
- [ ] Token/成本统计(节点级 + run 级)
- [ ] HumanApprove(飞书卡片 + ngrok/tailscale)
- [ ] 运行日志(本地 log.jsonl)
- [ ] 端到端 demo:7 步配表

#### M1 - 第 4-6 周:Loop + 真使用
- [ ] Loop 节点(嵌套执行)
- [ ] 端到端 demo:脚本+Critic 循环
- [ ] 作者连续 5 天真实使用
- [ ] 1 位同事 onboarding

### P1 - 可用性(M2,4-5 周)
- [ ] Prefab:Instance / Variant / Unpack
- [ ] Prefab 版本锁 + migration diff
- [ ] 子图双击进入
- [ ] 行为树节点:Selector / Retry / RaceFirst / Timeout
- [ ] GitHub 分享流程
- [ ] 成本告警阈值

### P2 - 平台化(可选,Go/No-Go 触发)
- [ ] 多用户 & workspace 隔离
- [ ] Prefab 市场
- [ ] 工作流版本控制
- [ ] 运行回放
- [ ] **迁移到后端版**(如需多人实时协作)

---

## 5. HITL 审批(飞书集成)⭐新增

### 实现方案

```
桌面应用调用飞书 API
    ↓
飞书发送审批卡片
    ↓
用户在飞书客户端点击"同意/拒绝"
    ↓
飞书 webhook 回调 → ngrok/tailscale → 桌面应用监听端口
    ↓
桌面应用收到决策 → 继续 workflow
```

### 配置要求
- 用户启动 ngrok: `ngrok http 8080`
- 飞书 webhook URL = `https://xxx.ngrok.io/approval`

### 备选方案
- 本地系统通知(Windows toast / macOS notification)+ 弹窗阻塞

---

## 6. GitHub 分享机制 ⭐新增

### Workflow/Prefab 分享
- 作者创建 workflow → 推送到 GitHub repo
- 同事 clone → 打开 → 运行/修改
- 修改后 PR 回流 → 作者 review → merge

### Repo 结构
```
agentflow-workflows/
├── workflows/*.flow.json
├── prefabs/*.prefab.json
└── README.md
```

**无需平台化,Git 即是协作层**。

---

## 7. 成功标准(不变)

### M0 成功
单 exe 打包 → 安装 → 画布能转 → 作者愿意继续投入。

### M1 MVP 成功 ⭐修订
1. 跑通"7 步配表" + "脚本+Critic 循环"
2. **作者连续 5 天真实使用**（硬指标，dogfooding）
3. **至少 1 位同事看过 demo 并给出反馈**（被动试用，降低期望）⭐修订
4. 崩溃重启不丢状态（本地 JSON 持久化）

**修订理由**：同事访谈结果"没啥想法" → 痛点不够强烈 → MVP 成功标准不能依赖同事主动发起，改为被动试用。

### M2 Daily Driver 成功
1. 3 个 Prefab 沉淀
2. 2 周无重大 bug
3. Go/No-Go:3 位非作者同事愿继续使用 → 触发 M3 或迁移后端版

---

## 8. 风险与缓解（更新）⭐

| 风险 | v0.2 评估 | v0.3 评估 | 缓解 |
|---|---|---|---|
| Worker 死锁 | 🔴 红线 | ✅ **消灭**（同步执行）| 无并发复杂度 |
| 失败传播缺失 | 🔴 红线 | ✅ **消灭**（直接标记下游）| 无并发复杂度 |
| Script 僵尸进程 | 🔴 红线 | ✅ **消灭**（child_process.spawn + close 监听）| ARCHITECTURE 已修订 |
| Script 恶意防护 | 🔴 红线 | ✅ **消灭**（用户信任模型）| 桌面版无需隔离 |
| HITL 超时恢复 | 🔴 红线 | ✅ **消灭**（Promise 超时 reject）| ARCHITECTURE 已修订 |
| Persona 抽象 | 🔴 红线 | ✅ **消灭**（访谈已完成）| 结果："没啥想法" |
| MVP 成功标准可自欺 | 🔴 红线 | ✅ **消灭**（改为被动试用）| PRD 已修订 |
| Checkpoint 无测试定义 | 🔴 红线 | ✅ **消灭**（本地 JSON 直接持久化）| 无需复杂 checkpoint |
| 循环依赖检测缺失 | 未识别 | 🔴 **新增红线** | ARCHITECTURE 已修订 |
| child_process.spawn 可靠性 | 未识别 | 🔴 **新增红线** | ARCHITECTURE 已修订 |
| ngrok URL 变化 | 未识别 | 🟡 黄线 | 文档 + 推荐 tailscale |
| 网络不稳定审批超时 | 未识别 | 🔴 **新增红线** | ARCHITECTURE 已修订 |
| ngrok URL 泄露安全 | 未识别 | 🔴 **新增红线** | ARCHITECTURE 已修订 |
| 主进程崩溃前端状态 | 未识别 | 🔴 **新增红线** | 见第 10 节 |
| IPC 消息过大 | 未识别 | 🟡 黄线 | 大产物写文件 |
| 多窗口并发写入 | 未识别 | 🟡 黄线 | 禁止多窗口 |
| 开发周期 | 黄线（低估）| ✅ **缩短**（无前后端分离）| M1 可能 3-4 周 |
| 飞书 webhook 需公网 | 未识别 | 🟡 黄线（需 ngrok/tailscale）| 配置文档 + 备选方案 |

---

## 9. 不做的事(更新)

### MVP 外
- ❌ 图像/音视频节点
- ❌ 多人实时协作编辑(用 GitHub PR 代替)
- ❌ 移动端
- ❌ 用户认证(桌面版单用户)

### 可能永远不做
- ❌ 非技术用户可视化
- ❌ 企业级功能(SSO/SAML/审计)
- ❌ 付费计划(除非真有需求)
- ❌ 后端版(除非 Go/No-Go 达标且有强需求)

---

## 10. 决策点清单(更新)

| 决策 | v0.2 选择 | v0.3 选择 | 理由 |
|---|---|---|---|
| 架构形态 | FastAPI 后端 | **Electron 桌面版** | 降低复杂度 |
| 前端语言 | JavaScript/TS | JavaScript/TS | 不变 |
| 后端语言 | Python | **JavaScript/TS** | 前后端统一 |
| 执行引擎 | asyncio.Queue + worker | **同步遍历 + Promise** | 无并发复杂度 |
| HITL 审批 | 飞书 webhook + 服务端 | **飞书 API + ngrok** | 桌面版也能集成 |
| Script 沙箱 | subprocess + setrlimit | **child_process.spawn** | 用户信任模型 |
| 分享协作 | 需 M3 平台化 | **GitHub repo** | Git 作为版本管理 |
| M3 平台化 | 必做 | **可选**(Go/No-Go)| 降低愿景压力 |
| 迁移扩展性 | - | **预留后端接口边界** | 未来可升级 |