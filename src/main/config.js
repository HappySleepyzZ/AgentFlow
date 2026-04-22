/**
 * 配置加载模块
 * 职责：加载配置文件、提供 get/set 接口
 * 限制：≤50 行，禁止硬编码配置
 */

const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '../../config');
const defaultConfig = JSON.parse(fs.readFileSync(path.join(configDir, 'default.json'), 'utf8'));
let userConfig = {};

try {
  userConfig = JSON.parse(fs.readFileSync(path.join(configDir, 'user.json'), 'utf8'));
} catch (e) {
  // 用户配置不存在，使用默认配置
}

function saveUserConfig() {
  fs.writeFileSync(path.join(configDir, 'user.json'), JSON.stringify(userConfig, null, 2));
}

module.exports = {
  get: (key) => userConfig[key] || defaultConfig[key],
  set: (key, value) => {
    userConfig[key] = value;
    saveUserConfig();
  },
  getAll: () => ({ ...defaultConfig, ...userConfig }),
};