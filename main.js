/**
 * AgentFlow 主进程入口
 * 职责：启动应用、创建窗口、注册 IPC
 * 限制：≤100 行，禁止写业务逻辑
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const config = require('./src/main/config');
const { primePathContext } = require('./src/main/bootstrapPathContext');
const ipcHandlers = require('./src/main/ipcHandlers');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: config.get('window.width') || 1200,
    height: config.get('window.height') || 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('src/renderer/index.html');
  
  // 开发模式打开 DevTools
  if (config.get('devMode')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  primePathContext(app);
  createWindow();
  ipcHandlers.register(ipcMain);
  
  // ⭐ 首次打开自动加载模板
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('template:load-default');
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
