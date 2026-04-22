const assert = require('assert');
const fs = require('fs');
const path = require('path');

const api = require('../src/main/api');
const config = require('../src/main/config');

const runtimeRoot = path.resolve(config.get('paths.runtimeRoot'));
const workflowDir = path.join(runtimeRoot, 'workflows');
const workflowPath = path.join(workflowDir, 'qa_store_smoke.flow.json');

function cleanup() {
  try {
    fs.unlinkSync(workflowPath);
  } catch (error) {
    // ignore cleanup failures for missing files
  }
}

cleanup();

const workflow = {
  id: 'qa_store_smoke',
  name: 'QA Store Smoke',
  nodes: [],
  edges: [],
};

assert.strictEqual(typeof api.loadWorkflow, 'function');
assert.strictEqual(typeof api.saveWorkflow, 'function');
assert.strictEqual(typeof api.getAllTemplates, 'function');
assert.strictEqual(typeof api.getDefaultTemplate, 'function');

api.saveWorkflow(workflow);
assert.ok(fs.existsSync(workflowPath), 'workflow should be written under the runtime root');

const loaded = api.loadWorkflow('qa_store_smoke');
assert.deepStrictEqual(loaded, workflow);

const templates = api.getAllTemplates();
assert.ok(Array.isArray(templates), 'template listing should return an array');
assert.ok(templates.some((template) => template.id === 'hello_world'), 'hello_world template should exist');
assert.strictEqual(api.getDefaultTemplate().name, 'Hello World');

cleanup();

console.log('P0-01 verification passed');
