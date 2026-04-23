function primePathContext(app) {
  process.env.AGENTFLOW_APP_ROOT = app.getAppPath();
  process.env.AGENTFLOW_USER_DATA = app.getPath('userData');
  process.env.AGENTFLOW_IS_PACKAGED = app.isPackaged ? '1' : '0';
}

module.exports = {
  primePathContext,
};
