const assert = require('assert');
const fs = require('fs');
const path = require('path');

const api = require('../src/main/api');
const config = require('../src/main/config');

const runtimeRoot = path.resolve(config.get('paths.runtimeRoot'));
const workflowDir = path.join(runtimeRoot, 'workflows');
const workflowPath = path.join(workflowDir, 'qa_store_smoke.flow.json');
const templateRoot = path.resolve(config.get('paths.templateRoot'));
const templatePath = path.join(templateRoot, 'hello_world.json');

function readFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

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

const apiSource = readFile('src/main/api.js');
const workflowServiceSource = readFile('src/main/services/workflowService.js');
const templateServiceSource = readFile('src/main/services/templateService.js');
const templateFileBefore = fs.readFileSync(templatePath, 'utf8');

assert.strictEqual(typeof api.loadWorkflow, 'function');
assert.strictEqual(typeof api.saveWorkflow, 'function');
assert.strictEqual(typeof api.getAllTemplates, 'function');
assert.strictEqual(typeof api.getDefaultTemplate, 'function');

assert.ok(!apiSource.includes("require('fs')"), 'api facade must not import fs');
assert.ok(!apiSource.includes("require('path')"), 'api facade must not import path');
assert.ok(!apiSource.includes('workflowStore'), 'api facade must not import workflowStore');
assert.ok(!apiSource.includes('templateStore'), 'api facade must not import templateStore');
assert.ok(apiSource.includes('./services/workflowService'), 'api facade should delegate workflow actions to workflowService');
assert.ok(apiSource.includes('./services/templateService'), 'api facade should delegate template actions to templateService');

assert.ok(workflowServiceSource.includes("../stores/workflowStore"), 'workflowService should use workflowStore');
assert.ok(!workflowServiceSource.includes('templateStore'), 'workflowService must not depend on templateStore');
assert.ok(!workflowServiceSource.includes('templateService'), 'workflowService must not depend on templateService');

assert.ok(templateServiceSource.includes("../stores/templateStore"), 'templateService should use templateStore');
assert.ok(!templateServiceSource.includes('workflowStore'), 'templateService must not depend on workflowStore');
assert.ok(!templateServiceSource.includes('workflowService'), 'templateService must not depend on workflowService');

api.saveWorkflow(workflow);
assert.ok(fs.existsSync(workflowPath), 'workflow should be written under the runtime root');
assert.ok(workflowPath.startsWith(workflowDir), 'workflow file should be written under runtime/workflows');
assert.ok(workflowPath.startsWith(runtimeRoot), 'workflow file should be written under runtime root');

const loaded = api.loadWorkflow('qa_store_smoke');
assert.deepStrictEqual(loaded, workflow);

const templates = api.getAllTemplates();
assert.ok(Array.isArray(templates), 'template listing should return an array');
assert.ok(templates.some((template) => template.id === 'hello_world'), 'hello_world template should exist');

const defaultTemplate = api.getDefaultTemplate();
assert.strictEqual(defaultTemplate.name, 'Hello World');

defaultTemplate.name = 'Mutated Template Name';
assert.strictEqual(api.getDefaultTemplate().name, 'Hello World', 'reloading default template should not observe in-memory mutation');

api.saveWorkflow({
  ...api.getDefaultTemplate(),
  id: 'qa_template_promoted',
});

const templateFileAfter = fs.readFileSync(templatePath, 'utf8');
assert.strictEqual(templateFileAfter, templateFileBefore, 'saving runtime workflow must not mutate template seed file');

cleanup();
try {
  fs.unlinkSync(path.join(workflowDir, 'qa_template_promoted.flow.json'));
} catch (error) {
  // ignore cleanup failures for missing files
}

console.log('P0-01 verification passed');
