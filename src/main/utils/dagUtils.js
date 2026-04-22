/**
 * DAG 检测工具
 * 职责：拓扑排序检测循环依赖
 * 限制：≤50 行
 */

module.exports = {
  isDAG: (nodes, edges) => {
    const visited = new Set();
    const recStack = new Set();
    
    const dfs = (nodeId) => {
      if (recStack.has(nodeId)) return true; // 存在环
      if (visited.has(nodeId)) return false;
      
      visited.add(nodeId);
      recStack.add(nodeId);
      
      const downstream = edges.filter(e => e.source === nodeId);
      for (const edge of downstream) {
        if (dfs(edge.target)) return true;
      }
      
      recStack.delete(nodeId);
      return false;
    };
    
    for (const node of nodes) {
      if (dfs(node.id)) return false;
    }
    
    return true;
  },
};