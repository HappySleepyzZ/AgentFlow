/**
 * Workflow API 模块
 * 职责：加载/保存 workflow、模板管理
 * 限制：≤150 行，禁止写执行逻辑
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

const dataDir = path.join(__dirname, '../../data');
const workflowsDir = path.join(dataDir, 'workflows');
const templatesDir = path.join(dataDir, 'templates');

module.exports = {
  loadWorkflow: async (id) => {
    const filePath = path.join(workflowsDir, `${id}.flow.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  },
  
  saveWorkflow: async (wf) => {
    const filePath = path.join(workflowsDir, `${wf.id}.flow.json`);
    fs.writeFileSync(filePath, JSON.stringify(wf, null, 2));
    return { success: true };
  },
  
  getAllTemplates: async () => {
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
    return files.map(f => {
      const content = JSON.parse(fs.readFileSync(path.join(templatesDir, f), 'utf8'));
      return { id: f.replace('.json', ''), name: content.name, level: content.level };
    });
  },
  
  getDefaultTemplate: () => {
    // ⭐ 首次打开自动加载模板 1：Hello World
    const filePath = path.join(templatesDir, 'hello_world.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  },
};