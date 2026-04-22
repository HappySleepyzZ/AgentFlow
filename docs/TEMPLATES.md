# AgentFlow 内置模板设计

**版本**：v0.3
**设计理念**：作者搭建，开箱即用，激活痛点不强的用户

---

## 🎯 激活策略

**痛点不强时的激活路径**：
```
作者演示 → 同事看到模板产物可用 → 痛点被激活 → 愿意打开应用 → 开箱即用模板激活需求
```

**核心策略**：
- 内置 3 个模板（作者搭建，无需用户创建）
- 首次打开自动加载模板 1（Hello World）
- 运行完成弹出结果卡片（产物预览 + Token 统计）
- 用户无需任何操作即可看到价值

---

## 📋 模板清单

### 模板 1：Hello World（Level 1）

**目标**：1 分钟跑完，理解"输入→输出"

**节点**：
- [UserInput] → [Output]

**参数**：
- UserInput：默认文本 "Hello AgentFlow!"
- Output：显示输入内容

**预期产物**：
- 输出文本：Hello AgentFlow!

**Token 消耗**：0（无 LLM 调用）

**交互设计**：
- 首次打开自动加载
- 画布中央显示"点击 ▶ 运行按钮体验"
- 运行完成弹出结果卡片："✅ Workflow 完成！产物：Hello AgentFlow!"

---

### 模板 2：LLM 对话（Level 2）

**目标**：3 分钟跑完，理解"LLM 处理"

**节点**：
- [UserInput] → [LLMStep] → [Output]

**参数**：
- UserInput：默认文本 "请帮我写一个简短的游戏配表说明"
- LLMStep：
  - model: glm（或 claude / opus47）
  - prompt: "{{context}}"
  - temperature: 0.7
- Output：显示 LLM 输出

**预期产物**：
- LLM 生成的配表说明文本

**Token 消耗**：~500 tokens（约 ¥0.01）

**交互设计**：
- 模板库面板显示"Level 2：LLM 对话"
- 点击加载后显示"预计耗时 3 分钟 | 预计成本 ¥0.01"
- 运行完成弹出结果卡片："✅ Workflow 完成！产物：配表说明文本（见下方预览）"

---

### 模板 3：7 步配表（Level 3）⭐核心模板

**目标**：10 分钟跑完，理解"复杂编排 + 真实产物"

**节点**：
1. [UserInput]：配表需求描述
2. [LLMStep]：解析需求 → 提取字段
3. [Script]：字段映射逻辑
4. [LLMStep]：生成配表 JSON
5. [Script]：校验 JSON 格式
6. [HumanApprove]：确认配表内容
7. [Output]：输出最终配表 JSON

**参数**：
- UserInput：默认文本 "游戏角色属性表：角色名、等级、生命值、攻击力、防御力"
- LLMStep 1：model=glm, prompt="解析以下需求，提取字段列表：{{context}}"
- Script 1：字段映射逻辑（Python 代码）
- LLMStep 2：model=glm, prompt="根据字段列表生成配表 JSON"
- Script 2：JSON 校验逻辑
- HumanApprove：question="确认配表内容是否正确？"
- Output：保存为 game_table.json

**预期产物**：
- game_table.json 文件（可直接用于游戏开发）

**Token 消耗**：~2000 tokens（约 ¥0.04）

**交互设计**：
- 模板库面板显示"Level 3：7 步配表 ⭐核心模板"
- 点击加载后显示"预计耗时 10 分钟 | 预计成本 ¥0.04"
- 运行时每个节点依次变绿，进度条显示"▓▓▓░░ 3/7"
- HumanApprove 本地弹窗阻塞："确认配表内容是否正确？"
- 运行完成弹出结果卡片："✅ Workflow 完成！产物：game_table.json（点击查看）"

---

## 🎨 交互设计细节

### 首次打开体验

```
用户打开应用
    ↓
自动加载模板 1（Hello World）
    ↓
画布中央显示提示框：
  "欢迎使用 AgentFlow！
   这是一个示例 workflow，点击 ▶ 运行按钮体验。
   或点击左上角‘模板库’切换其他模板。"
    ↓
用户点击运行按钮
    ↓
节点依次变绿（UserInput → Output）
    ↓
运行完成弹出结果卡片：
  "🎉 Workflow 完成！
   产物：Hello AgentFlow!
   Token 消耗：0
   节点成功率：100%
   [点击查看产物] [关闭]"
```

### 模板库面板设计

```
左侧面板：
┌─────────────────────┐
│ 模板库               │
│ ──────────────────  │
│ ⭐ Hello World (Lv1)│ ← 默认选中
│    1节点 | 1分钟     │
│                      │
│ 📝 LLM 对话 (Lv2)   │
│    3节点 | 3分钟     │
│                      │
│ 🎯 7步配表 (Lv3)    │
│    7节点 | 10分钟    │
│    ⭐ 核心模板       │
│                      │
│ ──────────────────  │
│ 自定义节点库         │
│ UserInput            │
│ LLMStep              │
│ Output               │
│ ...                  │
└─────────────────────┘
```

### 运行完成结果卡片设计

```
画布中央弹出：
┌───────────────────────────────┐
│ 🎉 Workflow 完成！             │
│ ──────────────────────────────│
│ 产物预览：                     │
│ Hello AgentFlow!              │
│                               │
│ Token 消耗：0                  │
│ 节点成功率：100% (2/2)         │
│ 耗时：1.2 秒                   │
│                               │
│ [点击查看产物] [关闭]          │
└───────────────────────────────┘
```

---

## 📝 模板文件格式

### 存储位置
```text
data/templates/
├── hello_world.flow.json
├── llm_chat.flow.json
└── 7_step_table.flow.json
```

### hello_world.flow.json 示例

```json
{
  "id": "template_hello_world",
  "name": "Hello World",
  "level": 1,
  "description": "1 分钟跑完，理解'输入→输出'",
  "estimated_time": "1分钟",
  "estimated_cost": "¥0",
  "nodes": [
    {
      "id": "n_1",
      "type": "UserInput",
      "position": { "x": 100, "y": 100 },
      "params": { "default_text": "Hello AgentFlow!" }
    },
    {
      "id": "n_2",
      "type": "Output",
      "position": { "x": 300, "y": 100 },
      "params": {}
    }
  ],
  "edges": [
    {
      "id": "e_1",
      "source": "n_1",
      "sourcePort": "output",
      "target": "n_2",
      "targetPort": "input",
      "kind": "data"
    }
  ]
}
```

---

## 🚀 M0 实现优先级

| 优先级 | 任务 | 说明 |
|---|---|---|
| P0 | 首次打开自动加载模板 1 | 交互红线，开箱即用 |
| P0 | 内置 3 个模板文件 | 激活策略，作者搭建 |
| P0 | 运行完成弹出结果卡片 | 交互红线，价值可见性 |
| P1 | 模板库面板设计 | 用户可切换模板 |
| P1 | 模板预览（预计耗时/成本）| 降低尝试门槛 |
| P2 | 模板难度递进引导 | 渐进学习 |

---

**总结**：通过"作者搭建的模板 + 开箱即用"策略，激活痛点不强的用户。首次打开即看到价值，无需任何配置即可运行。
