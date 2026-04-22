const workflowService = require('./services/workflowService');

module.exports = {
  loadWorkflow(id) {
    return workflowService.loadWorkflow(id);
  },
  saveWorkflow(workflow) {
    return workflowService.saveWorkflow(workflow);
  },
  getAllTemplates() {
    return workflowService.getAllTemplates();
  },
  getDefaultTemplate() {
    return workflowService.getDefaultTemplate();
  },
};
