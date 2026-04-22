const workflowStore = require('../stores/workflowStore');

module.exports = {
  loadWorkflow(id) {
    return workflowStore.load(id);
  },
  saveWorkflow(workflow) {
    return workflowStore.save(workflow);
  },
};
