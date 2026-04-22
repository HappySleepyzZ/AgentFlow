/**
 * IPC 处理器注册模块
 * 职责：注册所有 IPC 处理函数
 * 限制：≤150 行，禁止写业务逻辑（仅调用 Service）
 */

const workflowService = require('./api');
const runner = require('./runner');
const registry = require('./registry');

module.exports = {
  register: (ipcMain) => {
    // Workflow 相关
    ipcMain.handle('workflow:load', async (event, id) => {
      return await workflowService.loadWorkflow(id);
    });
    
    ipcMain.handle('workflow:save', async (event, wf) => {
      return await workflowService.saveWorkflow(wf);
    });
    
    ipcMain.handle('workflow:run', async (event, wf) => {
      return await runner.runWorkflow(wf);
    });
    
    ipcMain.handle('workflow:stop', async (event, runId) => {
      return await runner.stopWorkflow(runId);
    });
    
    // Node 相关
    ipcMain.handle('node:get-types', async () => {
      return registry.getAllNodeTypes();
    });
    
    ipcMain.handle('node:get-schema', async (event, nodeType) => {
      return registry.getSchema(nodeType);
    });
    
    // Template 相关
    ipcMain.handle('template:get-all', async () => {
      return workflowService.getAllTemplates();
    });
    
    ipcMain.on('template:load-default', (event) => {
      // ⭐ 首次打开自动加载模板
      const template = workflowService.getDefaultTemplate();
      event.reply('template:loaded', template);
    });
  },
};