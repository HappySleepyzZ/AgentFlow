/**
 * 节点注册表
 * 职责：注册节点类型、提供 Handler 和 Schema
 * 限制：≤100 行，禁止写节点实现逻辑
 */

const fs = require('fs');
const path = require('path');

const nodesDir = path.join(__dirname, 'nodes');
const schemasDir = path.join(__dirname, '../schemas');

class NodeRegistry {
  constructor() {
    this.handlers = {};
    this.schemas = {};
    this.loadAllNodes();
  }
  
  loadAllNodes() {
    // 加载所有节点 Handler
    const nodeFiles = fs.readdirSync(nodesDir).filter(f => f.endsWith('.js'));
    for (const file of nodeFiles) {
      const nodeType = file.replace('.js', '');
      const handler = require(path.join(nodesDir, file));
      this.handlers[nodeType] = handler;
    }
    
    // 加载所有节点 Schema
    const schemaFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.schema.json'));
    for (const file of schemaFiles) {
      const nodeType = file.replace('.schema.json', '');
      const schema = JSON.parse(fs.readFileSync(path.join(schemasDir, file), 'utf8'));
      this.schemas[nodeType] = schema;
    }
  }
  
  getHandler(nodeType) {
    if (!this.handlers[nodeType]) {
      throw new Error(`Unknown node type: ${nodeType}`);
    }
    return this.handlers[nodeType];
  }
  
  getSchema(nodeType) {
    return this.schemas[nodeType];
  }
  
  getAllNodeTypes() {
    return Object.keys(this.handlers);
  }
}

module.exports = new NodeRegistry();