const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const os = require('os');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const mainEntryPath = path.join(repoRoot, 'main.js');
const userConfigPath = path.join(repoRoot, 'config', 'user.json');
const seedTemplatePath = path.join(repoRoot, 'data', 'rongyu', 'templates', 'hello_world.json');

function readFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function clearMainModuleCache() {
  for (const modulePath of Object.keys(require.cache)) {
    if (modulePath === mainEntryPath || modulePath.startsWith(path.join(repoRoot, 'src', 'main'))) {
      delete require.cache[modulePath];
    }
  }
}

function loadMainModules() {
  clearMainModuleCache();

  return {
    api: require('../src/main/api'),
    bootstrapPathContext: require('../src/main/bootstrapPathContext'),
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

function runMainStartupScenario(pathContext) {
  clearMainModuleCache();

  const originalLoad = Module._load;
  const originalOn = process.on;
  const originalQuit = process.quit;
  const captured = {
    bootstrapAppArg: null,
    fakeApp: null,
    bootstrapInvoked: false,
    loadFilePath: null,
    onceEvents: [],
    registeredIpcMain: null,
    sentMessages: [],
  };

  const fakeApp = {
    getAppPath: () => pathContext.appRoot,
    getPath: (key) => {
      assert.strictEqual(key, 'userData');
      return pathContext.userDataRoot;
    },
    isPackaged: pathContext.isPackaged,
    on(eventName, handler) {
      captured.appOn = captured.appOn || [];
      captured.appOn.push({ eventName, handler });
    },
    whenReady() {
      return {
        then(callback) {
          callback();
          return { catch() {} };
        },
      };
    },
  };
  captured.fakeApp = fakeApp;

  function FakeBrowserWindow() {
    assert.strictEqual(process.env.AGENTFLOW_APP_ROOT, pathContext.appRoot, 'startup should prime app root before creating the window');
    assert.strictEqual(process.env.AGENTFLOW_USER_DATA, pathContext.userDataRoot, 'startup should prime user data before creating the window');
    assert.strictEqual(
      process.env.AGENTFLOW_IS_PACKAGED,
      pathContext.isPackaged ? '1' : '0',
      'startup should prime packaged mode before creating the window'
    );

    this.webContents = {
      openDevTools() {},
      once(eventName, handler) {
        captured.onceEvents.push(eventName);
        handler();
      },
      send(channel, payload) {
        captured.sentMessages.push({ channel, payload });
      },
    };
  }

  FakeBrowserWindow.prototype.loadFile = function loadFile(targetPath) {
    captured.loadFilePath = targetPath;
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        app: fakeApp,
        BrowserWindow: FakeBrowserWindow,
        ipcMain: { __brand: 'ipcMain' },
      };
    }

    if (parent && parent.filename === mainEntryPath && request === './src/main/bootstrapPathContext') {
      const realBootstrapPathContext = originalLoad(request, parent, isMain);

      return {
        primePathContext(app) {
          captured.bootstrapInvoked = true;
          captured.bootstrapAppArg = app;
          return realBootstrapPathContext.primePathContext(app);
        },
      };
    }

    if (parent && parent.filename === mainEntryPath && request === './src/main/ipcHandlers') {
      return {
        register(ipcMain) {
          captured.registeredIpcMain = ipcMain;
        },
      };
    }

    return originalLoad(request, parent, isMain);
  };

  process.on = function patchedOn() {};
  process.quit = function patchedQuit() {};

  try {
    require(mainEntryPath);
  } finally {
    Module._load = originalLoad;
    process.on = originalOn;
    process.quit = originalQuit;
    clearMainModuleCache();
  }

  return captured;
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

withEnv(
  {
    AGENTFLOW_APP_ROOT: 'previous-app-root',
    AGENTFLOW_USER_DATA: 'previous-user-data',
    AGENTFLOW_IS_PACKAGED: '0',
  },
  () => {
    const { bootstrapPathContext } = loadMainModules();
    const bootstrapTempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agentflow-path-bootstrap-'));
    const bootstrapAppRoot = path.join(bootstrapTempRoot, 'mock-app-root');
    const bootstrapUserDataRoot = path.join(bootstrapTempRoot, 'mock-user-data');

    bootstrapPathContext.primePathContext({
      getAppPath: () => bootstrapAppRoot,
      getPath: (key) => {
        assert.strictEqual(key, 'userData');
        return bootstrapUserDataRoot;
      },
      isPackaged: true,
    });

    assert.strictEqual(process.env.AGENTFLOW_APP_ROOT, bootstrapAppRoot);
    assert.strictEqual(process.env.AGENTFLOW_USER_DATA, bootstrapUserDataRoot);
    assert.strictEqual(process.env.AGENTFLOW_IS_PACKAGED, '1');

    cleanupPaths([bootstrapTempRoot]);
  }
);

const mainStartupRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agentflow-main-startup-'));
const startupPathContext = {
  appRoot: path.join(mainStartupRoot, 'app.asar'),
  isPackaged: true,
  userDataRoot: path.join(mainStartupRoot, 'user-data'),
};
const startupCapture = withUserConfig(
  null,
  () =>
    withEnv(
      {
        AGENTFLOW_APP_ROOT: null,
        AGENTFLOW_USER_DATA: null,
        AGENTFLOW_IS_PACKAGED: null,
      },
      () => runMainStartupScenario(startupPathContext)
    )
);

assert.strictEqual(startupCapture.loadFilePath, 'src/renderer/index.html', 'startup should load the renderer entry');
assert.strictEqual(startupCapture.bootstrapInvoked, true, 'startup should invoke the shared bootstrap seam');
assert.strictEqual(startupCapture.bootstrapAppArg, startupCapture.fakeApp, 'startup should pass the Electron app into the shared bootstrap seam');
assert.deepStrictEqual(startupCapture.onceEvents, ['did-finish-load'], 'startup should attach the initial template load event');
assert.ok(startupCapture.registeredIpcMain, 'startup should register IPC handlers');
assert.deepStrictEqual(
  startupCapture.sentMessages.map((message) => message.channel),
  ['template:load-default'],
  'startup should request the default template after the renderer loads'
);

cleanupPaths([mainStartupRoot]);

const qaTempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agentflow-p0-01-'));
const devAppRoot = path.join(qaTempRoot, 'dev-app-root');
const devRuntimeRoot = path.join(devAppRoot, 'data', 'rongyu', 'runtime');
const devTemplateRoot = path.join(devAppRoot, 'data', 'rongyu', 'templates');
const devWorkflowPath = path.join(devRuntimeRoot, 'workflows', 'qa_dev_relative.flow.json');
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
fs.mkdirSync(devTemplateRoot, { recursive: true });
fs.copyFileSync(seedTemplatePath, path.join(devTemplateRoot, 'hello_world.json'));

const workflow = {
  id: 'qa_packaged_smoke',
  name: 'QA Packaged Smoke',
  nodes: [],
  edges: [],
};

const devRelativeWorkflow = {
  id: 'qa_dev_relative',
  name: 'QA Dev Relative',
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
      AGENTFLOW_APP_ROOT: devAppRoot,
      AGENTFLOW_IS_PACKAGED: '0',
      AGENTFLOW_USER_DATA: path.join(qaTempRoot, 'ignored-dev-user-data'),
    },
    () => {
      const { api, pathStore } = loadMainModules();

      assert.strictEqual(pathStore.getRuntimeRoot(), devRuntimeRoot, 'dev relative defaults should resolve runtime under the app root');
      assert.strictEqual(pathStore.getTemplateRoot(), devTemplateRoot, 'dev relative defaults should resolve templates under the app root');

      api.saveWorkflow(devRelativeWorkflow);
      assert.ok(fs.existsSync(devWorkflowPath), 'dev relative defaults should save workflows under the app-root runtime path');
      assert.deepStrictEqual(api.loadWorkflow(devRelativeWorkflow.id), devRelativeWorkflow);

      const defaultTemplate = api.getDefaultTemplate();
      assert.strictEqual(defaultTemplate.name, 'Hello World', 'dev relative defaults should still load the default template');
      assert.ok(
        api.getAllTemplates().some((template) => template.id === 'hello_world'),
        'dev relative defaults should still list bundled templates'
      );
    }
  );
});

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
