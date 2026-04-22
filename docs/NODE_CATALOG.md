# AgentFlow 节点目录

**版本**：v0.2（沿用 v0.1，下面列出 v0.2 调整点）
**v0.1 原件**：`archive/v0.1/NODE_CATALOG.md`

## v0.2 调整

- **HumanApprove**：从 P1 提升到 P0（M1 第 3 周实现）
- **Loop**：保留 P0，但推迟到 M1 第 4-6 周实现，且采用**嵌套 run_workflow** 方案（见 ARCHITECTURE §3.4）
- **Selector / Retry / RaceFirst**：保持 P1，但 M2 才做
- **Script**：沙箱方案改为 **subprocess + tmpdir**，不搞进程内沙箱
- **所有节点参数** 改为 JSON Schema 单一来源（SSOT），前后端自动同步

---


按类别列出 MVP 阶段的节点设计。视觉上三类用不同颜色区分：
- 🔵 **工作节点**（蓝色）：实际执行任务
- ⚫ **控制流节点**（灰色）：决定执行顺序/分支
- 🟢 **数据节点**（绿色）：数据产生/操作/存储

---

## 🔵 工作节点

### LLMStep
一次 LLM 调用。

| 字段 | 类型 | 说明 |
|---|---|---|
| **输入** | | |
| `context` | any | 拼到 prompt 里的上下文 |
| `in_exec` | exec | 执行触发 |
| **输出** | | |
| `result` | text | LLM 返回 |
| `out_exec` | exec | 触发后继 |
| **参数** | | |
| `model` | enum | glm/claude/opus47/... |
| `prompt` | string | 提示词模板，支持 `{context}` |
| `temperature` | number | 默认 0.7 |
| `max_tokens` | integer | 默认 2048 |
| `timeout` | integer | 秒，默认 120 |

### AgentTask
调 OpenClaw sub-agent。

| 字段 | 类型 | 说明 |
|---|---|---|
| **输入** | | |
| `context` | any | 传给 agent 的输入数据 |
| `in_exec` | exec | |
| **输出** | | |
| `result` | any | Agent 返回结果 |
| `out_exec` | exec | |
| **参数** | | |
| `agent_id` | enum | coder / main / wiki |
| `model` | enum | 覆盖 agent 默认模型（可选）|
| `task` | string | 任务描述（模板）|
| `tools` | array | 允许的工具列表（可选）|
| `timeout` | integer | 默认 300 秒 |

**关键**：节点内部跑 sub-agent 时，每次子任务完成都 emit `node.step` 事件。

### Script
执行 Python 代码片段。

| 字段 | 类型 | 说明 |
|---|---|---|
| **输入** | | |
| `inputs` | json | 作为变量注入 |
| `in_exec` | exec | |
| **输出** | | |
| `result` | any | 代码返回值 |
| `out_exec` | exec | |
| **参数** | | |
| `code` | string | Python 代码 |
| `timeout` | integer | 默认 60 秒 |

执行环境：受限沙箱（禁文件系统、禁网络，仅 stdlib）。

### HttpCall
HTTP 请求。

| 字段 | 类型 | 说明 |
|---|---|---|
| **输入** | | |
| `body` | json | 请求体 |
| `in_exec` | exec | |
| **输出** | | |
| `response` | json | 响应数据 |
| `status` | integer | HTTP 状态码 |
| `out_exec` | exec | |
| **参数** | | |
| `method` | enum | GET/POST/PUT/DELETE |
| `url` | string | 模板支持 |
| `headers` | object | |
| `timeout` | integer | 默认 30 |

### HumanApprove（P1）
人工审批节点。

| 字段 | 类型 | 说明 |
|---|---|---|
| **输入** | | |
| `content` | any | 展示给人看的内容 |
| `in_exec` | exec | |
| **输出** | | |
| `decision` | enum | approved/rejected |
| `comment` | text | 人的注释 |
| `out_approved` | exec | 批准分支 |
| `out_rejected` | exec | 拒绝分支 |
| **参数** | | |
| `question` | string | 问题描述 |
| `channel` | enum | feishu/web_popup |
| `timeout` | integer | 默认 3600（1h）|
| `on_timeout` | enum | auto_approve / auto_reject / fail |

---

## ⚫ 控制流节点

### Start / End
工作流入口出口。无参。

### Sequence
依次执行多条分支。

| 字段 | 类型 | 说明 |
|---|---|---|
| `in_exec` | exec | |
| `out_exec_1..N` | exec | 依次触发 |

### Parallel
并行执行多条分支，全部完成再触发下游。

| 字段 | 类型 | 说明 |
|---|---|---|
| `in_exec` | exec | |
| `out_exec_1..N` | exec | 同时触发 |
| `done_exec` | exec | 全部完成后触发 |

### Branch（If）
条件分支。

| 字段 | 类型 | 说明 |
|---|---|---|
| **输入** | | |
| `value` | any | 被判断的值 |
| `in_exec` | exec | |
| **输出** | | |
| `out_true` | exec | 条件真 |
| `out_false` | exec | 条件假 |
| **参数** | | |
| `condition` | string | 表达式，如 `value > 8` |

### Loop（ForEach）
对集合每项执行子图。

| 字段 | 类型 | 说明 |
|---|---|---|
| **输入** | | |
| `items` | array | 迭代的集合 |
| `in_exec` | exec | |
| **输出** | | |
| `item` | any | 每次迭代的元素 |
| `index` | integer | 索引 |
| `loop_body` | exec | 每次迭代触发子图 |
| `done` | exec | 循环结束触发 |
| **参数** | | |
| `max_iterations` | integer | 安全上限，默认 1000 |
| `parallel` | boolean | 是否并行处理，默认 false |

### Selector（P1）
行为树风：依次尝试，一个成功即停。

| 字段 | 类型 | 说明 |
|---|---|---|
| `in_exec` | exec | |
| `try_1..N` | exec | 依次触发尝试 |
| `on_success` | exec | 有一个成功触发 |
| `on_all_failed` | exec | 全部失败触发 |

### Retry（P1）
失败自动重试。

| 字段 | 类型 | 说明 |
|---|---|---|
| `in_exec` | exec | |
| `child_exec` | exec | 被重试的子节点 |
| `on_success` | exec | |
| `on_failed` | exec | |
| **参数** | | |
| `max_attempts` | integer | 默认 3 |
| `backoff` | enum | constant / linear / exponential |

### RaceFirst（P1）
多条分支并行，谁先成功用谁。

| 字段 | 类型 | 说明 |
|---|---|---|
| `in_exec` | exec | |
| `race_1..N` | exec | 并发触发 |
| `winner_result` | any | 第一个成功的产物 |
| `out_exec` | exec | 触发后继 |

---

## 🟢 数据节点

### UserInput
工作流的初始输入。

| 字段 | 类型 | 说明 |
|---|---|---|
| **输出** | | |
| `value` | (按参数类型) | 用户填的值 |
| **参数** | | |
| `name` | string | 字段名（工作流触发时传入）|
| `type` | enum | text / number / file / json |
| `default` | any | 默认值 |
| `description` | string | 提示文案 |

### Output
展示/保存输出。

| 字段 | 类型 | 说明 |
|---|---|---|
| **输入** | | |
| `value` | any | |
| **参数** | | |
| `name` | string | 输出名 |
| `save_to` | string | 可选：保存到文件路径 |
| `display` | enum | text / json / markdown / auto |

### SetVariable / GetVariable
全局变量读写。

| 字段 | 类型 | 说明 |
|---|---|---|
| **SetVariable** | | |
| `value` | any | 要存的值（输入）|
| `var_name` | string | 变量名（参数）|
| **GetVariable** | | |
| `value` | any | 读出的值（输出）|
| `var_name` | string | 变量名（参数）|

### Merge
多路数据合并成 JSON 对象。

| 字段 | 类型 | 说明 |
|---|---|---|
| **输入** | | |
| `in_1..N` | any | 多路输入 |
| **输出** | | |
| `merged` | json | 合并后的对象 |
| **参数** | | |
| `keys` | array | 输入对应的 key 名 |

### Transform（P1）
简单表达式变换。

| 字段 | 类型 | 说明 |
|---|---|---|
| **输入** | | |
| `value` | any | |
| **输出** | | |
| `result` | any | |
| **参数** | | |
| `expression` | string | 如 `value.upper()` |

### Const
常量值。

| 字段 | 类型 | 说明 |
|---|---|---|
| **输出** | | |
| `value` | (按参数类型)| 常量 |
| **参数** | | |
| `type` | enum | text/number/boolean/json |
| `value` | any | |

---

## 端口类型系统

```
┌──────────┬─────────────────────────────────────┐
│ 类型      │ 说明                                 │
├──────────┼─────────────────────────────────────┤
│ any      │ 兼容一切，用作万能端口                  │
│ text     │ 纯文本字符串                           │
│ number   │ 数字（int/float）                     │
│ boolean  │ true/false                          │
│ json     │ 结构化对象/数组                         │
│ file     │ 文件路径（字符串）+ 类型标注             │
│ exec     │ 执行信号（无数据，仅触发）               │
└──────────┴─────────────────────────────────────┘
```

**兼容规则**：
- `any` ↔ 任何类型
- `text` → `any`（单向）
- `json` → `any`（单向）
- 数字/布尔/文件 → 同类型 或 any
- `exec` 只能连 `exec`
- **前端连线时实时校验**，冲突显示红色虚线

---

## 未来（P1+）节点

仅列不详述，等 MVP 跑通再细化：

- **LLM 原语**：ExtractJson / Summarize / Embed / Classify
- **数据**：JsonPath / JsonMerge / RegexMatch / TextSplit
- **外部**：GoogleSearch / WebFetch / OpenAIImage / MCP Tool
- **存储**：ReadFile / WriteFile / ListDir / S3Upload
- **特殊**：Delay / Schedule / Webhook / Trigger
