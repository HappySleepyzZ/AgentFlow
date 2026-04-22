const templateStore = require('../stores/templateStore');
const workflowStore = require('../stores/workflowStore');

module.exports = {
  loadWorkflow(id) {
    return workflowStore.load(id);
  },
  saveWorkflow(workflow) {
    return workflowStore.save(workflow);
  },
  getAllTemplates() {
    return templateStore.list();
  },
  getDefaultTemplate() {
    return templateStore.load('hello_world');
  },
};
