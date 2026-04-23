const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '../../config');

function readJson(filename, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(path.join(configDir, filename), 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function mergeDeep(base, override) {
  const result = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (isObject(value) && isObject(base[key])) {
      result[key] = mergeDeep(base[key], value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function getByPath(target, key) {
  return key.split('.').reduce((value, part) => {
    if (value == null) return undefined;
    return value[part];
  }, target);
}

function setByPath(target, key, value) {
  const parts = key.split('.');
  let cursor = target;

  while (parts.length > 1) {
    const part = parts.shift();
    if (!isObject(cursor[part])) cursor[part] = {};
    cursor = cursor[part];
  }

  cursor[parts[0]] = value;
}

const defaultConfig = readJson('default.json');
let userConfig = readJson('user.json');

function buildConfig() {
  return {
    ...mergeDeep(defaultConfig, userConfig),
    llm: readJson('llm.json'),
    agents: readJson('agents.json'),
    feishu: readJson('feishu.json'),
  };
}

function saveUserConfig() {
  fs.writeFileSync(path.join(configDir, 'user.json'), JSON.stringify(userConfig, null, 2));
}

module.exports = {
  get(key, fallback) {
    const value = getByPath(buildConfig(), key);
    return value === undefined ? fallback : value;
  },
  hasUserValue(key) {
    return getByPath(userConfig, key) !== undefined;
  },
  set(key, value) {
    setByPath(userConfig, key, value);
    saveUserConfig();
  },
  getAll() {
    return buildConfig();
  },
};
