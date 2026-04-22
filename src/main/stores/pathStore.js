const fs = require('fs');
const path = require('path');

const config = require('../config');

function getDataRoot() {
  const relativeRoot = config.get('paths.dataRoot', 'data/rongyu');
  return path.resolve(path.join(__dirname, '../../..', relativeRoot));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function getScopedDir(scope) {
  return ensureDir(path.join(getDataRoot(), scope));
}

module.exports = {
  ensureDir,
  getDataRoot,
  getScopedDir,
};
