# AgentFlow Templates

**Version**: v0.3  
**Status**: active

## Goal

Template files provide bundled starter workflows that can be loaded immediately in a fresh install.

## Current Storage Contract

- Bundled templates live under `resources/templates/`.
- Template files use the `*.json` extension.
- Mutable workflow state does not live next to bundled templates.
- Mutable workflow saves go to the runtime root, which defaults to `user/runtime/`.

## Current Seed Templates

```text
resources/templates/
`-- hello_world.json
```

## Example File

`resources/templates/hello_world.json`

```json
{
  "id": "template_hello_world",
  "name": "Hello World",
  "level": 1,
  "description": "Minimal runnable starter template.",
  "nodes": [
    {
      "id": "n_input",
      "type": "UserInput",
      "position": { "x": 120, "y": 120 },
      "params": {
        "name": "message",
        "default": "Hello AgentFlow!"
      }
    },
    {
      "id": "n_output",
      "type": "Output",
      "position": { "x": 360, "y": 120 },
      "params": {
        "name": "result"
      }
    }
  ],
  "edges": [
    {
      "id": "e_data",
      "source": "n_input",
      "sourcePort": "value",
      "target": "n_output",
      "targetPort": "value",
      "kind": "data"
    }
  ]
}
```

## Compatibility Notes

- Legacy relative template paths such as `data/rongyu/templates` are treated as compatibility inputs and should resolve to the bundled template root.
- Legacy runtime data under `data/rongyu/runtime` should be migrated forward into the default `user/runtime/` tree when the app first resolves the new default runtime root.

## Implementation Notes

- Template reads flow through `src/main/stores/templateStore.js`.
- Path resolution lives in `src/main/stores/pathStore.js`.
- Packaged builds must include `resources/templates/**/*`.
