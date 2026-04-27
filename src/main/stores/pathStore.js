const fs = require('fs');
const path = require('path');

const config = require('../config');

const repoRoot = path.resolve(__dirname, '../../..');
const LEGACY_RUNTIME_ROOT = path.normalize('data/rongyu/runtime');
const LEGACY_TEMPLATE_ROOT = path.normalize('data/rongyu/templates');
const LEGACY_RUNTIME_MIGRATION_MARKER = '.legacy-runtime-migrated';

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

function normalizeForComparison(targetPath) {
  return path
    .normalize(targetPath)
    .replace(/\\/g, '/')
    .replace(/\/+$/g, '');
}

function isLegacyRelativePath(configuredPath, legacyPath) {
  return !path.isAbsolute(configuredPath) && normalizeForComparison(configuredPath) === normalizeForComparison(legacyPath);
}

function mergeMissingEntries(sourceRoot, targetRoot) {
  if (!fs.existsSync(sourceRoot)) {
    return;
  }

  ensureDir(targetRoot);

  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    const sourcePath = path.join(sourceRoot, entry.name);
    const targetPath = path.join(targetRoot, entry.name);

    if (entry.isDirectory()) {
      if (fs.existsSync(targetPath) && !fs.statSync(targetPath).isDirectory()) {
        continue;
      }

      mergeMissingEntries(sourcePath, targetPath);
      continue;
    }

    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function maybeMigrateLegacyRuntimeRoot(targetRoot, baseRoot) {
  const configuredRuntimeRoot = config.get('paths.runtimeRoot', 'user/runtime');

  if (config.hasUserValue('paths.runtimeRoot') || configuredRuntimeRoot !== 'user/runtime') {
    return targetRoot;
  }

  const legacyRoot = resolveConfiguredPath(LEGACY_RUNTIME_ROOT, baseRoot);
  const migrationMarkerPath = path.join(targetRoot, LEGACY_RUNTIME_MIGRATION_MARKER);

  if (!fs.existsSync(legacyRoot) || fs.existsSync(migrationMarkerPath)) {
    return targetRoot;
  }

  mergeMissingEntries(legacyRoot, targetRoot);
  fs.writeFileSync(migrationMarkerPath, '');
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
    const configuredTemplateRoot = config.get('paths.templateRoot');

    if (isLegacyRelativePath(configuredTemplateRoot, LEGACY_TEMPLATE_ROOT)) {
      return resolveConfiguredPath('resources/templates', getPathContext().appRoot);
    }

    return resolveConfiguredPath(configuredTemplateRoot, getPathContext().appRoot);
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
