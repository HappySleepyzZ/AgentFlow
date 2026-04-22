# AgentFlow

可视化多 Agent 工作流编排桌面应用。

## 版本：v0.3（桌面版 Electron）

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建
npm run build
```

## 项目结构

```
agentflow/
├── main.js              ← 主进程入口
├── src/
│   ├── main/            ← 主进程逻辑
│   │   ├── api.js       ← Workflow API
│   │   ├── runner.js    ← 执行引擎
│   │   ├── registry.js  ← 节点注册
│   │   ├── nodes/       ← 节点实现
│   │   └── utils/       ← 工具函数
│   ├── renderer/        ← 前端渲染进程
│   └── schemas/         ← JSON Schema
├── config/              ← 配置文件（外置）
├── data/                ← 数据存储
└── ARCHITECTURE_MAP.md  ← 架构地图（AI 写代码必读）
```

## 核心特性

- ✅ Electron 桌面版（无后端服务器）
- ✅ 同步执行引擎（消灭并发复杂度）
- ✅ 本地 JSON 持久化（崩溃不丢状态）
- ✅ GitHub 分享协作
- ✅ 首次打开自动加载模板（开箱即用）

## 文档

详细文档见：`/root/.openclaw/workspace-coder/sandbox/shared/agentflow/docs/`

云文档：https://www.feishu.cn/docx/NUYudqbOTozqLqxsea9cqvH7nOg