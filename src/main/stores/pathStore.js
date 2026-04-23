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

function maybeMigrateLegacyRuntimeRoot(targetRoot, baseRoot) {
  const configuredRuntimeRoot = config.get('paths.runtimeRoot', 'user/runtime');

  if (config.hasUserValue('paths.runtimeRoot') || configuredRuntimeRoot !== 'user/runtime') {
    return targetRoot;
  }

  const legacyRoot = resolveConfiguredPath('data/rongyu/runtime', baseRoot);

  if (!fs.existsSync(legacyRoot) || fs.existsSync(targetRoot)) {
    return targetRoot;
  }

  ensureDir(path.dirname(targetRoot));
  fs.cpSync(legacyRoot, targetRoot, { recursive: true });
  return targetRoot;
}

function getResourceRoot() {
  if (config.hasUserValue('paths.resourceRoot')) {
    return resolveConfiguredPath(config.get('paths.resourceRoot'), getPathContext().appRoot);
  }

  if (config.hasUserValue('paths.dataRoot')) {
    return resolveConfiguredPath(config.get('paths.dataRoot'), getPathContext().appRoot);
  }

  return resolveConfiguredPath(config.get('paths.resourceRoot', 'resources'), getPathContext().appRoot);
}

function getDataRoot() {
  return getResourceRoot();
}

function getRuntimeRoot() {
  const context = getPathContext();
  const baseRoot = context.isPackaged ? context.userDataRoot : context.appRoot;
  const runtimeRoot = resolveConfiguredPath(config.get('paths.runtimeRoot', 'user/runtime'), baseRoot);

  return ensureDir(maybeMigrateLegacyRuntimeRoot(runtimeRoot, baseRoot));
}

function getTemplateRoot() {
  if (config.hasUserValue('paths.templateRoot')) {
    return resolveConfiguredPath(config.get('paths.templateRoot'), getPathContext().appRoot);
  }

  if (config.hasUserValue('paths.resourceRoot')) {
    return path.join(getResourceRoot(), 'templates');
  }

  return resolveConfiguredPath(config.get('paths.templateRoot', 'resources/templates'), getPathContext().appRoot);
}

function getRuntimeScopedDir(scope) {
  return ensureDir(path.join(getRuntimeRoot(), scope));
}

module.exports = {
  ensureDir,
  getDataRoot,
  getResourceRoot,
  getRuntimeRoot,
  getRuntimeScopedDir,
  getTemplateRoot,
};
