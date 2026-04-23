# AgentFlow

Visual workflow orchestration for multi-agent work on desktop.

## Status

This repository is currently a v0.3 Electron skeleton. The active architecture is local-first, Electron-only, and file-backed. Older v0.1/v0.2 design artifacts remain only as history in git and `archive/`.

## Current Principles

- Electron desktop app, no required backend service
- Local-first storage for workflows, prefabs, runs, and config
- JSON Schema as the single source of truth for node definitions
- Runner is a scheduler only; node-specific behavior lives in node handlers
- Bundled templates live under `resources/`; mutable local state lives under `user/`
- Canonical documents use unsuffixed names under `docs/`

## Core Directories

```text
agentflow/
|-- main.js
|-- src/
|   |-- main/
|   |   |-- api.js
|   |   |-- config.js
|   |   |-- ipcHandlers.js
|   |   |-- registry.js
|   |   |-- runner.js
|   |   `-- utils/
|   |-- renderer/
|   `-- schemas/
|-- config/
|-- resources/
|-- user/
|-- docs/
|-- archive/
`-- ARCHITECTURE_MAP.md
```

## Working Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Data Model](docs/DATA_MODEL.md)
- [Node Catalog](docs/NODE_CATALOG.md)
- [Roadmap](docs/ROADMAP.md)
- [Review](docs/REVIEW.md)

## Commands

```bash
npm install
npm run dev
npm run build
```
