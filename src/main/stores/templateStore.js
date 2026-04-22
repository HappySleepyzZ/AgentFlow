const fs = require('fs');
const path = require('path');

const { getTemplateRoot } = require('./pathStore');

function getTemplateDir() {
  return getTemplateRoot();
}

function getTemplatePath(id) {
  return path.join(getTemplateDir(), `${id}.json`);
}

module.exports = {
  list() {
    return fs
      .readdirSync(getTemplateDir())
      .filter((filename) => filename.endsWith('.json'))
      .map((filename) => {
        const content = JSON.parse(fs.readFileSync(path.join(getTemplateDir(), filename), 'utf8'));
        return {
          id: filename.replace('.json', ''),
          name: content.name,
          level: content.level,
        };
      });
  },
  load(id) {
    return JSON.parse(fs.readFileSync(getTemplatePath(id), 'utf8'));
  },
};
