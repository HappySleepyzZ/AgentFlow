# AgentFlow Node Catalog

**Version**: v0.3  
**Status**: active

This file lists the intended node surface area and the contract shape each node type is expected to fit.

## Contract Rule

Each node type should be implemented as:

1. one schema file
2. one manifest exposed by the registry
3. one handler implementation

Runner behavior must stay generic across node types.

## P0 Nodes

### UserInput

- Category: `data`
- Purpose: declare workflow entry inputs
- Typical outputs: `value`, `out_exec`

### Output

- Category: `data`
- Purpose: collect or display a final artifact
- Typical inputs: `value`, `in_exec`

### LLMStep

- Category: `work`
- Purpose: call an LLM with schema-backed params
- Typical params: `model`, `prompt`, `temperature`, `timeout`

### AgentTask

- Category: `integration`
- Purpose: run a configured agent task
- Typical params: `agentId`, `task`, `model`, `tools`, `timeout`

### Script

- Category: `work`
- Purpose: execute trusted local script logic
- Typical params: `runtime`, `code`, `timeout`

## P1 Control Nodes

- `Branch`
- `Sequence`
- `Parallel`
- `Merge`
- `SetVariable`
- `GetVariable`
- `Const`

## P2 Reuse and Advanced Nodes

- `Loop`
- `HumanApprove`
- `Selector`
- `Retry`
- `RaceFirst`

## Manifest Expectations

Every node manifest should expose:

- title and category
- schema
- input ports
- output ports
- runtime capability flags

Detailed contract definitions live in [DATA_MODEL.md](DATA_MODEL.md).
