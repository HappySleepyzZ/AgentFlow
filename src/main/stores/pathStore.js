const fs = require('fs');
const path = require('path');

const config = require('../config');

const repoRoot = path.resolve(__dirname, '../../..');

function getPathContext() {
  return {
    appRoot: path.normalize(process.env.AGENTFLOW_APP_ROOT || repoRoot),
    isPackaged: process.env.AGENTFLOW_IS_PACKAGED === '1',
    userDataRoot: path.normalize(process.env.AGENTFLOW_USER_DATA || repoRoot),
  };
}

function resolveConfiguredPath(configuredPath, baseRoot) {
  if (path.isAbsolute(configuredPath)) {
    return path.normalize(configuredPath);
  }

  return path.resolve(baseRoot, configuredPath);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function getDataRoot() {
  return resolveConfiguredPath(config.get('paths.dataRoot', 'data/rongyu'), getPathContext().appRoot);
}

function getRuntimeRoot() {
  const context = getPathContext();
  const baseRoot = context.isPackaged ? context.userDataRoot : context.appRoot;
  return ensureDir(resolveConfiguredPath(config.get('paths.runtimeRoot', 'data/rongyu/runtime'), baseRoot));
}

function getTemplateRoot() {
  return resolveConfiguredPath(config.get('paths.templateRoot', 'data/rongyu/templates'), getPathContext().appRoot);
}

function getRuntimeScopedDir(scope) {
  return ensureDir(path.join(getRuntimeRoot(), scope));
}

module.exports = {
  ensureDir,
  getDataRoot,
  getRuntimeRoot,
  getRuntimeScopedDir,
  getTemplateRoot,
};
