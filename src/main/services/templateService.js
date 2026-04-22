const templateStore = require('../stores/templateStore');

module.exports = {
  getAllTemplates() {
    return templateStore.list();
  },
  getDefaultTemplate() {
    return templateStore.load('hello_world');
  },
};
