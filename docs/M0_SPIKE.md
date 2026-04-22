# M0 Spike 任务清单

**版本**：v0.2（沿用 v0.1，下面标注 v0.2 调整点）
**v0.1 原件**：`archive/v0.1/M0_SPIKE.md`

## v0.2 调整

- M0 本身**照旧**（CDN + mock），不引入 Vite / JSON Schema
- **M0 执行器已预约 v0.2 接口**：以“入边就绪驱动”书写，避免 M1 重构
- **成功标准加一条**：作者看完 demo 后愿意继续投入（不需和同事显派）
- **推迟**了 M1 内的所有东西（Vite / schema / pytest / 占 M1-W1）

---

**目标**：2-8 小时内交付一个能跑的骨架，验证技术形态。

**最小可见效果**：浏览器打开 → 画布上有 3 个节点 → 点运行 → 节点依次变绿 → 产物显示。

---

## 任务拆解

### T1 - 项目骨架（30 min）
- [ ] `backend/` 目录：`main.py` / `runner.py` / `nodes.py` / `requirements.txt`
- [ ] `frontend/` 目录：`index.html` / `styles.css` / `app.js`
- [ ] `examples/hello.flow.json`
- [ ] 根目录 `run.sh` 一键启动

### T2 - 后端最小实现（60 min）
- [ ] FastAPI 启动
- [ ] CORS 允许同源前端
- [ ] 挂 `/static/` 服务前端
- [ ] API：
  - `GET /api/node-types` — 返回内置节点定义
  - `GET /api/workflows/{id}` — 读 JSON 文件
  - `PUT /api/workflows/{id}` — 写 JSON 文件
  - `POST /api/workflows/{id}/run` — 触发运行
- [ ] WebSocket：`/ws/runs/{run_id}`
- [ ] 内置节点：UserInput / LLMStep(mock) / Output
- [ ] 执行器：拓扑排序 + asyncio，每个节点 sleep 0.5s 模拟耗时
- [ ] 事件发布：node.started / node.finished

### T3 - 前端最小实现（60 min）
- [ ] 单个 `index.html`
- [ ] CDN 引：React 18 + ReactDOM + ReactFlow 11
- [ ] 暗色主题基础样式
- [ ] 三栏布局：左（节点库）+ 中（画布）+ 右（属性面板）+ 底（日志）
- [ ] 左侧节点库：列出从 `/api/node-types` 拉到的节点类型
- [ ] 画布：加载 `hello.flow.json`，渲染节点+连线
- [ ] 右侧属性面板：选中节点显示参数
- [ ] 顶部"运行"按钮 → 调 `/api/workflows/.../run` → 订阅 WS
- [ ] 收到 `node.started`：节点加绿色边框 + 脉冲动画
- [ ] 收到 `node.finished`：节点变深绿 + 底部日志面板 append
- [ ] 保存按钮 → PUT workflow

### T4 - 端到端冒烟（30 min）
- [ ] 启动 run.sh
- [ ] 浏览器打开 :8000
- [ ] 点"运行" hello workflow
- [ ] 确认：
  - UserInput 先绿 → LLMStep 绿 → Output 绿
  - 底部日志按顺序出现 3 条
  - 产物预览显示
- [ ] 截图/录屏

---

## 最小文件列表

```
agentflow/
├── run.sh                          # 启动脚本
├── backend/
│   ├── requirements.txt
│   ├── main.py                     # FastAPI 入口 (~100 行)
│   ├── runner.py                   # 执行引擎 (~80 行)
│   └── nodes.py                    # 3 个内置节点 (~60 行)
├── frontend/
│   ├── index.html                  # 结构 + CDN (~60 行)
│   ├── styles.css                  # 暗色主题 (~80 行)
│   └── app.js                      # 应用逻辑 (~250 行)
└── examples/
    └── hello.flow.json             # 示例工作流
```

**总代码量：约 700 行**，半天够写。

---

## 依赖

### Python（requirements.txt）
```
fastapi==0.115.6
uvicorn[standard]==0.32.1
pydantic==2.10.3
websockets==14.1
```

### 前端（CDN）
```html
<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/reactflow@11/dist/umd/index.js"></script>
<link href="https://unpkg.com/reactflow@11/dist/style.css" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
```

---

## 验收清单

打开浏览器：

- [ ] 画布显示 3 个节点 + 2 条连线
- [ ] 左侧节点库列出类型
- [ ] 点击节点 → 右侧显示参数
- [ ] 修改参数 → 画布节点参数同步（内存）
- [ ] 点"保存" → 后端文件更新
- [ ] 点"运行" → 节点按顺序变绿
- [ ] 底部日志显示事件流
- [ ] Output 节点展示 mock 输出

---

## 之后

M0 跑通后 → 进 M1 第 1 周：
1. 替换 mock LLMStep 为真调
2. 接 OpenClaw AgentTask 节点
3. 加端口类型校验
4. 加 Branch / Parallel / Loop
