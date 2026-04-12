/**
 * 多Agent协作服务
 * 支持多个AI员工协同完成任务
 *
 * 协作模式：
 * 1. 主Agent协调 - 一个主Agent协调多个子Agent
 * 2. 并行执行 - 多个Agent同时处理子任务
 * 3. 结果汇总 - 收集并整合各Agent的结果
 */

const { ReactEngine } = require('../agents/react-engine')
const { registry } = require('../tools/registry')
const { memoryService } = require('./memory-service')
const { safeLog } = require('../lib/logger')

class MultiAgentCollaboration {
  constructor() {
    this.engines = new Map() // Agent ID -> ReactEngine 实例缓存
  }

  /**
   * 获取或创建Agent引擎
   */
  _getEngine(agentId) {
    if (!this.engines.has(agentId)) {
      this.engines.set(agentId, new ReactEngine({
        maxIterations: 5,
        confidenceThreshold: 0.6,
      }))
    }
    return this.engines.get(agentId)
  }

  /**
   * 主Agent协调模式
   * @param {object} params
   * @param {string} params.userId - 用户ID
   * @param {string} params.coordinatorAgentId - 主Agent（协调者）ID
   * @param {string[]} params.subAgentIds - 子Agent ID列表
   * @param {string} params.task - 任务描述
   * @param {string} params.sessionId - 会话ID
   */
  async coordinate(params) {
    const { userId, coordinatorAgentId, subAgentIds, task, sessionId } = params

    safeLog({ type: 'multi_agent_start', coordinator: coordinatorAgentId, subAgents: subAgentIds }, '🤝 多Agent协作开始')

    try {
      // 1. 分解任务
      const subtasks = await this._decomposeTask(task, coordinatorAgentId)

      if (subtasks.length <= 1) {
        // 简单任务，不需要协作
        const engine = this._getEngine(coordinatorAgentId)
        return await engine.run({
          userId,
          agentId: coordinatorAgentId,
          sessionId,
          message: task,
        })
      }

      // 2. 并行执行子任务
      const subtaskResults = await this._executeSubtasksInParallel(
        subtasks,
        subAgentIds,
        { userId, sessionId }
      )

      // 3. 汇总结果
      const summary = await this._summarizeResults(task, subtaskResults, coordinatorAgentId)

      // 4. 记录协作记忆
      await this._recordCollaboration(userId, coordinatorAgentId, task, subtaskResults)

      safeLog({ type: 'multi_agent_complete', subtasks: subtaskResults.length }, '🤝 多Agent协作完成')

      return {
        success: true,
        response: summary,
        subtasks: subtaskResults.length,
        details: subtaskResults,
      }
    } catch (error) {
      safeLog({ error: error.message, type: 'multi_agent_error' }, '❌ 多Agent协作失败')
      throw error
    }
  }

  /**
   * 分解任务为子任务
   */
  async _decomposeTask(task, agentId) {
    // 使用AI自动分解任务
    const { aiService } = require('../lib/ai-service')

    const prompt = `分解以下任务为多个独立的子任务，每个子任务可以由不同的AI员工独立完成。

任务：${task}

要求：
- 每个子任务应该清晰、具体，可独立执行
- 标注每个子任务应该由什么类型的AI员工处理（如：数据分析员、邮件助手、审批助手等）
- 返回JSON数组格式

例如：
["分析销售数据", "发送周报邮件", "提交请假审批"]

直接返回JSON数组，不要有其他文字。`

    try {
      const result = await aiService.complete({
        messages: [{ role: 'user', content: prompt }],
        model: 'claude-3-5-sonnet',
        maxTokens: 500,
      })

      const subtasks = JSON.parse(result.content.trim())
      return Array.isArray(subtasks) ? subtasks : [task]
    } catch (e) {
      safeLog({ error: e.message }, '⚠️ 任务分解失败，使用简单分割')
      return task.split('。').filter(s => s.trim().length > 5)
    }
  }

  /**
   * 并行执行子任务
   */
  async _executeSubtasksInParallel(subtasks, agentIds, context) {
    const { userId, sessionId } = context

    // 映射子任务到Agent（轮询分配或智能匹配）
    const assignments = subtasks.map((subtask, index) => ({
      subtask,
      agentId: agentIds[index % agentIds.length],
    }))

    // 并行执行
    const promises = assignments.map(async ({ subtask, agentId }) => {
      try {
        const engine = this._getEngine(agentId)
        const result = await engine.run({
          userId,
          agentId,
          sessionId,
          message: subtask,
        })

        return {
          subtask,
          agentId,
          success: true,
          response: result.response,
          confidence: result.confidence,
        }
      } catch (error) {
        return {
          subtask,
          agentId,
          success: false,
          error: error.message,
        }
      }
    })

    return await Promise.all(promises)
  }

  /**
   * 汇总结果
   */
  async _summarizeResults(originalTask, subtaskResults, coordinatorAgentId) {
    const { aiService } = require('../lib/ai-service')

    // 构建汇总提示
    const resultsText = subtaskResults
      .map(r => `- 任务: ${r.subtask}\n  结果: ${r.success ? r.response : `失败: ${r.error}`}`)
      .join('\n')

    const prompt = `原始任务：${originalTask}

各子任务执行结果：
${resultsText}

请作为协调者，总结以上执行结果，给出最终回复。如果有失败的子任务，需要说明。

回复要求：
1. 简洁明了
2. 突出成功结果
3. 如有失败，说明原因和后续建议`

    try {
      const result = await aiService.complete({
        messages: [{ role: 'user', content: prompt }],
        model: 'claude-3-5-sonnet',
        maxTokens: 1000,
      })

      return result.content
    } catch (e) {
      // 降级：直接拼接结果
      return subtaskResults
        .filter(r => r.success)
        .map(r => r.response)
        .join('\n\n')
    }
  }

  /**
   * 记录协作历史到记忆
   */
  async _recordCollaboration(userId, coordinatorAgentId, task, results) {
    try {
      // 记录到长期记忆
      await memoryService.addLongTermMemory({
        userId,
        agentId: coordinatorAgentId,
        content: `协作任务完成：${task.slice(0, 50)}...，参与Agent数：${results.length}，成功率：${Math.round(results.filter(r => r.success).length / results.length * 100)}%`,
        memoryType: 'collaboration',
        importance: 7,
      })
    } catch (e) {
      safeLog({ error: e.message }, '⚠️ 记录协作记忆失败')
    }
  }

  /**
   * 共享记忆给多个Agent
   * @param {string[]} agentIds - Agent ID列表
   * @param {object} context - 共享上下文
   */
  async shareContext(agentIds, context) {
    const { userId, sessionId } = context

    // 获取共享记忆
    const sharedMemory = await memoryService.getSharedContext(userId, agentIds)

    return {
      sharedMemory,
      agentCount: agentIds.length,
    }
  }

  /**
   * 创建临时任务组
   * @param {string} groupId - 任务组ID
   * @param {string[]} agentIds - 参与的Agent
   * @param {string} task - 任务描述
   */
  async createTaskGroup(groupId, agentIds, task) {
    return {
      groupId,
      agents: agentIds,
      task,
      status: 'created',
      createdAt: new Date().toISOString(),
    }
  }
}

// 单例
const multiAgentService = new MultiAgentCollaboration()

module.exports = { multiAgentService, MultiAgentCollaboration }
