const templateService = require('./services/templateService');
const workflowService = require('./services/workflowService');

module.exports = {
  loadWorkflow(id) {
    return workflowService.loadWorkflow(id);
  },
  saveWorkflow(workflow) {
    return workflowService.saveWorkflow(workflow);
  },
  getAllTemplates() {
    return templateService.getAllTemplates();
  },
  getDefaultTemplate() {
    return templateService.getDefaultTemplate();
  },
};
