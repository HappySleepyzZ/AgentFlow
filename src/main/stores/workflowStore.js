const fs = require('fs');
const path = require('path');

const { getScopedDir } = require('./pathStore');

function getWorkflowPath(id) {
  return path.join(getScopedDir('workflows'), `${id}.flow.json`);
}

module.exports = {
  load(id) {
    return JSON.parse(fs.readFileSync(getWorkflowPath(id), 'utf8'));
  },
  save(workflow) {
    fs.writeFileSync(getWorkflowPath(workflow.id), JSON.stringify(workflow, null, 2));
    return { success: true };
  },
};
