const fs = require('fs');
const path = require('path');

const config = require('../config');

const appRoot = path.resolve(__dirname, '../../..');

function resolveConfiguredPath(configuredPath) {
  if (path.isAbsolute(configuredPath)) {
    return path.normalize(configuredPath);
  }

  return path.resolve(appRoot, configuredPath);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function getDataRoot() {
  return resolveConfiguredPath(config.get('paths.dataRoot', 'data/rongyu'));
}

function getRuntimeRoot() {
  return ensureDir(resolveConfiguredPath(config.get('paths.runtimeRoot', 'data/rongyu/runtime')));
}

function getTemplateRoot() {
  return ensureDir(resolveConfiguredPath(config.get('paths.templateRoot', 'data/rongyu/templates')));
}

function getRuntimeScopedDir(scope) {
  return ensureDir(path.join(getRuntimeRoot(), scope));
}

module.exports = {
  appRoot,
  ensureDir,
  getDataRoot,
  getRuntimeRoot,
  getRuntimeScopedDir,
  getTemplateRoot,
  resolveConfiguredPath,
};
