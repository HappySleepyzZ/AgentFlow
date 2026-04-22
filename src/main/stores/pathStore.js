const fs = require('fs');
const path = require('path');

const config = require('../config');

function resolvePath(relativeRoot) {
  return path.resolve(path.join(__dirname, '../../..', relativeRoot));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function getDataRoot() {
  return resolvePath(config.get('paths.dataRoot', 'data/rongyu'));
}

function getRuntimeRoot() {
  return ensureDir(resolvePath(config.get('paths.runtimeRoot', 'data/rongyu/runtime')));
}

function getTemplateRoot() {
  return ensureDir(resolvePath(config.get('paths.templateRoot', 'data/rongyu/templates')));
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
