/**
 * Workflow 执行引擎
 * 职责：执行 workflow、管理节点状态、处理错误
 * 限制：≤200 行，允许写执行逻辑
 */

const registry = require('./registry');
const dagUtils = require('./utils/dagUtils');

class WorkflowRunner {
  constructor() {
    this.activeRuns = new Map();
  }
  
  async runWorkflow(wf) {
    // ⭐ DAG 检测（循环依赖检测）
    if (!dagUtils.isDAG(wf.nodes, wf.edges)) {
      throw new Error('Workflow 存在循环依赖，请检查连线');
    }
    
    const runId = `run_${Date.now()}`;
    const states = this.initializeStates(wf);
    const queue = this.getReadyNodes(wf, states);
    
    this.activeRuns.set(runId, { wf, states, queue, stopped: false });
    
    // 同步遍历执行
    while (queue.length > 0 && !this.activeRuns.get(runId).stopped) {
      const node = queue.shift();
      await this.executeNode(node, states, wf, runId);
    }
    
    this.activeRuns.delete(runId);
    return this.getResults(states);
  }
  
  stopWorkflow(runId) {
    const run = this.activeRuns.get(runId);
    if (run) {
      run.stopped = true;
    }
  }
  
  initializeStates(wf) {
    const states = {};
    for (const node of wf.nodes) {
      states[node.id] = {
        pendingInEdges: this.countInEdges(node, wf.edges),
        received: {},
        status: 'pending',
      };
    }
    return states;
  }
  
  getReadyNodes(wf, states) {
    return wf.nodes.filter(n => states[n.id].pendingInEdges === 0);
  }
  
  countInEdges(node, edges) {
    return edges.filter(e => e.target === node.id).length;
  }
  
  async executeNode(node, states, wf, runId) {
    states[node.id].status = 'running';
    
    try {
      const handler = registry.getHandler(node.type);
      const output = await handler.execute(states[node.id].received, node.params);
      
      states[node.id].status = 'done';
      states[node.id].output = output;
      
      // 激活下游节点
      this.activateDownstream(node, states, wf);
    } catch (error) {
      states[node.id].status = 'failed';
      states[node.id].error = error.message;
      
      // ⭐ 失败传播：标记下游为 skipped
      this.markDownstreamSkipped(node.id, states, wf);
    }
  }
  
  activateDownstream(node, states, wf) {
    const downstreamEdges = wf.edges.filter(e => e.source === node.id);
    for (const edge of downstreamEdges) {
      const targetState = states[edge.target];
      targetState.received[edge.targetPort] = states[node.id].output[edge.sourcePort];
      targetState.pendingInEdges--;
      
      if (targetState.pendingInEdges === 0 && targetState.status === 'pending') {
        // 加入执行队列
        this.activeRuns.get(this.findRunId(states)).queue.push(wf.nodes.find(n => n.id === edge.target));
      }
    }
  }
  
  markDownstreamSkipped(nodeId, states, wf) {
    const downstreamEdges = wf.edges.filter(e => e.source === nodeId);
    for (const edge of downstreamEdges) {
      const targetState = states[edge.target];
      if (targetState.status === 'pending') {
        targetState.status = 'skipped';
        // 递归传播
        this.markDownstreamSkipped(edge.target, states, wf);
      }
    }
  }
  
  getResults(states) {
    const results = {};
    for (const [id, state] of Object.entries(states)) {
      results[id] = {
        status: state.status,
        output: state.output,
        error: state.error,
      };
    }
    return results;
  }
  
  findRunId(states) {
    for (const [runId, run] of this.activeRuns.entries()) {
      if (run.states === states) return runId;
    }
    return null;
  }
}

module.exports = new WorkflowRunner();