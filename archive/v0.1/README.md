# AgentFlow

可视化多 Agent 工作流编排平台。

**一句话**：ComfyUI 的画布感 × UE 蓝图的执行+数据双流 × Unity 的 Prefab 封装 × 行为树的逻辑节点。

## 定位

- 面向多场景（游戏制作、内容生产、脚本写作、数据处理...）
- 节点式搭积木，所见即所得
- 实时显示每个节点/每一步的执行状态
- Agent 是节点的参数，不是节点本身
- 支持 Prefab 式工作流复用

## 项目结构

```
agentflow/
├── docs/          # PRD / 开发计划 / 设计文档
├── design/        # 架构图 / 数据模型 / API 规范
├── backend/       # Python FastAPI 执行引擎
├── frontend/      # React + ReactFlow 画布
├── examples/      # 示例 workflow / prefab
└── README.md
```

## 核心文档

- [PRD.md](docs/PRD.md) — 产品需求
- [ROADMAP.md](docs/ROADMAP.md) — 开发计划
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — 技术架构
- [NODE_CATALOG.md](docs/NODE_CATALOG.md) — 节点目录
- [DATA_MODEL.md](docs/DATA_MODEL.md) — 数据模型
