const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const userConfigPath = path.join(repoRoot, 'config', 'user.json');
const seedTemplatePath = path.join(repoRoot, 'data', 'rongyu', 'templates', 'hello_world.json');

function readFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function clearMainModuleCache() {
  for (const modulePath of Object.keys(require.cache)) {
    if (modulePath.startsWith(path.join(repoRoot, 'src', 'main'))) {
      delete require.cache[modulePath];
    }
  }
}

function loadMainModules() {
  clearMainModuleCache();

  return {
    api: require('../src/main/api'),
    pathStore: require('../src/main/stores/pathStore'),
  };
}

function withEnv(overrides, callback) {
  const previous = {};

  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key];
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function withUserConfig(configObject, callback) {
  const hadUserConfig = fs.existsSync(userConfigPath);
  const previousContents = hadUserConfig ? fs.readFileSync(userConfigPath, 'utf8') : null;

  if (configObject == null) {
    if (hadUserConfig) {
      fs.unlinkSync(userConfigPath);
    }
  } else {
    fs.writeFileSync(userConfigPath, JSON.stringify(configObject, null, 2));
  }

  try {
    return callback();
  } finally {
    if (hadUserConfig) {
      fs.writeFileSync(userConfigPath, previousContents);
    } else if (fs.existsSync(userConfigPath)) {
      fs.unlinkSync(userConfigPath);
    }
  }
}

function cleanupPaths(pathsToDelete) {
  for (const targetPath of pathsToDelete) {
    fs.rmSync(targetPath, { force: true, recursive: true });
  }
}

const apiSource = readFile('src/main/api.js');
const workflowServiceSource = readFile('src/main/services/workflowService.js');
const templateServiceSource = readFile('src/main/services/templateService.js');
const packageJson = JSON.parse(readFile('package.json'));

assert.strictEqual(typeof loadMainModules().api.loadWorkflow, 'function');
assert.strictEqual(typeof loadMainModules().api.saveWorkflow, 'function');
assert.strictEqual(typeof loadMainModules().api.getAllTemplates, 'function');
assert.strictEqual(typeof loadMainModules().api.getDefaultTemplate, 'function');

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

assert.ok(Array.isArray(packageJson.build && packageJson.build.files), 'package build files should be declared as an array');
assert.ok(
  packageJson.build.files.includes('data/rongyu/templates/**/*'),
  'packaged builds must include the committed template seed directory'
);

const qaTempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agentflow-p0-01-'));
const packagedAppRoot = path.join(qaTempRoot, 'packaged-app', 'app.asar');
const packagedUserDataRoot = path.join(qaTempRoot, 'packaged-user-data');
const packagedTemplateRoot = path.join(packagedAppRoot, 'data', 'rongyu', 'templates');
const packagedRuntimeRoot = path.join(packagedUserDataRoot, 'data', 'rongyu', 'runtime');
const packagedWorkflowPath = path.join(packagedRuntimeRoot, 'workflows', 'qa_packaged_smoke.flow.json');
const missingTemplateRoot = path.join(qaTempRoot, 'missing-app', 'data', 'rongyu', 'templates');
const absoluteRuntimeRoot = path.join(qaTempRoot, 'absolute-runtime');
const absoluteTemplateRoot = path.join(qaTempRoot, 'absolute-templates');
const absoluteWorkflowPath = path.join(absoluteRuntimeRoot, 'workflows', 'qa_absolute_override.flow.json');

fs.mkdirSync(packagedTemplateRoot, { recursive: true });
fs.mkdirSync(absoluteTemplateRoot, { recursive: true });
fs.copyFileSync(seedTemplatePath, path.join(packagedTemplateRoot, 'hello_world.json'));
fs.copyFileSync(seedTemplatePath, path.join(absoluteTemplateRoot, 'hello_world.json'));

const workflow = {
  id: 'qa_packaged_smoke',
  name: 'QA Packaged Smoke',
  nodes: [],
  edges: [],
};

const absoluteWorkflow = {
  id: 'qa_absolute_override',
  name: 'QA Absolute Override',
  nodes: [],
  edges: [],
};

withUserConfig(null, () => {
  withEnv(
    {
      AGENTFLOW_APP_ROOT: packagedAppRoot,
      AGENTFLOW_IS_PACKAGED: '1',
      AGENTFLOW_USER_DATA: packagedUserDataRoot,
    },
    () => {
      const { api, pathStore } = loadMainModules();

      assert.strictEqual(
        pathStore.getRuntimeRoot(),
        packagedRuntimeRoot,
        'packaged runtime root should be based on userData for relative defaults'
      );
      assert.strictEqual(
        pathStore.getTemplateRoot(),
        packagedTemplateRoot,
        'packaged template root should stay under the packaged app root for relative defaults'
      );

      api.saveWorkflow(workflow);
      assert.ok(fs.existsSync(packagedWorkflowPath), 'packaged workflow save should write under the userData runtime root');
      assert.ok(
        !packagedWorkflowPath.startsWith(packagedAppRoot),
        'packaged runtime writes must not target the packaged app bundle'
      );

      const defaultTemplate = api.getDefaultTemplate();
      assert.strictEqual(defaultTemplate.name, 'Hello World');
      assert.ok(
        api.getAllTemplates().some((template) => template.id === 'hello_world'),
        'packaged template listing should read the bundled template root'
      );
    }
  );
});

withUserConfig(null, () => {
  withEnv(
    {
      AGENTFLOW_APP_ROOT: path.join(qaTempRoot, 'missing-app'),
      AGENTFLOW_IS_PACKAGED: '1',
      AGENTFLOW_USER_DATA: packagedUserDataRoot,
    },
    () => {
      const { pathStore } = loadMainModules();

      assert.ok(!fs.existsSync(missingTemplateRoot), 'template root should not exist before packaged lookup');
      assert.strictEqual(pathStore.getTemplateRoot(), missingTemplateRoot);
      assert.ok(!fs.existsSync(missingTemplateRoot), 'template root lookup must not create directories in the packaged app root');
    }
  );
});

withUserConfig(
  {
    paths: {
      runtimeRoot: absoluteRuntimeRoot,
      templateRoot: absoluteTemplateRoot,
    },
  },
  () => {
    withEnv(
      {
        AGENTFLOW_APP_ROOT: path.join(qaTempRoot, 'dev-app-root'),
        AGENTFLOW_IS_PACKAGED: '0',
        AGENTFLOW_USER_DATA: path.join(qaTempRoot, 'dev-user-data'),
      },
      () => {
        const { api, pathStore } = loadMainModules();

        assert.strictEqual(pathStore.getRuntimeRoot(), absoluteRuntimeRoot, 'absolute runtime overrides must remain absolute');
        assert.strictEqual(pathStore.getTemplateRoot(), absoluteTemplateRoot, 'absolute template overrides must remain absolute');

        api.saveWorkflow(absoluteWorkflow);
        assert.ok(fs.existsSync(absoluteWorkflowPath), 'workflow saves should honor absolute runtime overrides');

        const loadedWorkflow = api.loadWorkflow(absoluteWorkflow.id);
        assert.deepStrictEqual(loadedWorkflow, absoluteWorkflow);

        const defaultTemplate = api.getDefaultTemplate();
        assert.strictEqual(defaultTemplate.name, 'Hello World', 'template loading should honor absolute template overrides');
        assert.ok(
          api.getAllTemplates().some((template) => template.id === 'hello_world'),
          'template listing should honor absolute template overrides'
        );
      }
    );
  }
);

cleanupPaths([qaTempRoot]);
clearMainModuleCache();

console.log('P0-01 verification passed');
