/**
 * ReAct Engine - 主循环
 * Think → Plan → Execute → Reflect → (loop if needed) → Done
 */

const { registry } = require('../tools/registry')
const { aiService } = require('../lib/ai-service')
const { prisma } = require('../lib/prisma')
const { memoryService } = require('../services/memory-service')

class ReactEngine {
  constructor(config = {}) {
    this.maxIterations = config.maxIterations || 10
    this.maxTokensPerIteration = config.maxTokensPerIteration || 4000
    this.confidenceThreshold = config.confidenceThreshold || 0.7
  }

  /**
   * 运行 ReAct 主循环
   * @param {object} params
   * @param {string} params.userId - 用户 ID
   * @param {string} params.agentId - Agent ID
   * @param {string} params.sessionId - 会话 ID
   * @param {string} params.message - 用户消息
   * @param {string[]} [params.agentCapabilities] - Agent 能力列表
   * @returns {Promise<object>} 最终回复
   */
  async run(params) {
    const { userId, agentId, sessionId, message, agentCapabilities = [] } = params

    // 获取可用工具
    const tools = registry.getToolsForAgent(agentCapabilities)
    const toolsSpec = registry.getToolsSpec()

    // 加载记忆上下文
    const memoryContext = await memoryService.getContextForSession(userId, agentId)

    // 构建系统提示
    const systemPrompt = this._buildSystemPrompt(agentId, memoryContext)

    // 初始化状态
    let iteration = 0
    let thoughtHistory = []
    let toolResults = []
    let finalResponse = null
    let confidence = 0

    // 创建助手消息
    const assistantMsg = await prisma.message.create({
      data: {
        sessionId,
        userId,
        agentId,
        role: 'assistant',
        content: '',
        contentType: 'text',
      },
    })

    while (iteration < this.maxIterations) {
      iteration++

      // 1. Think - 让 AI 分析情况
      const thinkResult = await this._think(
        message,
        systemPrompt,
        thoughtHistory,
        toolResults,
        toolsSpec
      )

      thoughtHistory.push({
        iteration,
        thought: thinkResult.thought,
        confidence: thinkResult.confidence,
      })

      // 2. 判断是否结束
      if (thinkResult.isDone) {
        finalResponse = thinkResult.response
        confidence = thinkResult.confidence || 1.0
        break
      }

      // 3. Plan - 分解任务（如需要）
      const plan = thinkResult.plan || { action: 'respond', args: {} }

      // 4. Execute - 执行工具或回复
      if (plan.action === 'tool_call' && plan.toolName) {
        const toolResult = await this._executeTool(
          plan.toolName,
          plan.args,
          { userId, agentId, sessionId, prisma }
        )

        toolResults.push({
          iteration,
          toolName: plan.toolName,
          args: plan.args,
          result: toolResult,
          success: !toolResult.error,
        })

        // 记录工具执行
        await this._logToolExecution(userId, agentId, sessionId, assistantMsg.id, plan.toolName, plan.args, toolResult)

        // 将工具结果反馈给 AI
        const reflectResult = await this._reflect(
          message,
          systemPrompt,
          thoughtHistory,
          toolResults,
          toolsSpec
        )

        if (reflectResult.isDone) {
          finalResponse = reflectResult.response
          confidence = reflectResult.confidence || 0.8
          break
        }

        // 继续下一次迭代
        continue
      }

      // 直接回复
      finalResponse = thinkResult.response
      confidence = thinkResult.confidence || 0.9
      break
    }

    // 更新助手消息
    await prisma.message.update({
      where: { id: assistantMsg.id },
      data: {
        content: finalResponse || '抱歉，我需要更多时间处理这个问题。',
        executionInfo: {
          iterations: iteration,
          thoughtHistory,
          toolResults,
          confidence,
        },
      },
    })

    // 记录情景记忆（如果完成了一个任务）
    if (toolResults.length > 0) {
      await this._recordEpisodicMemory(
        userId,
        agentId,
        message,
        toolResults,
        confidence
      )
    }

    return {
      response: finalResponse,
      iterations: iteration,
      toolCalls: toolResults.length,
      confidence,
      thoughtHistory,
    }
  }

  /**
   * Think - 分析情况，决定下一步
   */
  async _think(message, systemPrompt, history, toolResults, toolsSpec) {
    const context = this._buildContext(history, toolResults)

    const prompt = `${systemPrompt}

## 当前用户消息
${message}

## 上下文
${context}

## 可用工具
${JSON.stringify(toolsSpec, null, 2)}

请分析用户消息，决定：
1. 是否需要调用工具？
2. 如果需要，调用哪个工具，参数是什么？
3. 如果不需要，直接回复用户

以 JSON 格式返回：
{
  "thought": "你的思考过程",
  "isDone": true/false,
  "confidence": 0.0-1.0,
  "response": "直接回复内容（如果 isDone=true）",
  "plan": {"action": "tool_call/respond", "toolName": "...", "args": {...}}
}`

    const result = await aiService.complete({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-3-5-sonnet',
      maxTokens: this.maxTokensPerIteration,
    })

    try {
      const parsed = JSON.parse(result.content)
      return parsed
    } catch {
      return {
        thought: result.content,
        isDone: true,
        confidence: 0.5,
        response: result.content,
        plan: { action: 'respond' },
      }
    }
  }

  /**
   * Reflect - 反思工具执行结果，决定是否继续
   */
  async _reflect(message, systemPrompt, history, toolResults, toolsSpec) {
    const context = this._buildContext(history, toolResults)

    const prompt = `${systemPrompt}

## 用户消息
${message}

## 执行历史
${context}

工具执行已完成。请评估：
1. 结果是否满足用户需求？
2. 是否需要更多信息？
3. 还是可以直接回复用户？

以 JSON 格式返回：
{
  "thought": "反思过程",
  "isDone": true/false,
  "confidence": 0.0-1.0,
  "response": "回复内容（如果 isDone=true）"
}`

    const result = await aiService.complete({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-3-5-sonnet',
      maxTokens: 1000,
    })

    try {
      return JSON.parse(result.content)
    } catch {
      return { isDone: true, confidence: 0.5, response: result.content }
    }
  }

  /**
   * 执行工具
   */
  async _executeTool(toolName, args, context) {
    const tool = registry.getTool(toolName)
    if (!tool) {
      return { error: `工具不存在: ${toolName}` }
    }

    try {
      const result = await tool.execute(args, context)
      return { success: true, data: result }
    } catch (error) {
      return { error: error.message, toolName }
    }
  }

  /**
   * 构建上下文
   */
  _buildContext(history, toolResults) {
    let ctx = '## 思考历史\n'
    for (const h of history) {
      ctx += `- 迭代${h.iteration}: ${h.thought}\n`
    }

    if (toolResults.length > 0) {
      ctx += '\n## 工具执行结果\n'
      for (const t of toolResults) {
        ctx += `- ${t.toolName}: ${t.success ? JSON.stringify(t.result) : t.result.error}\n`
      }
    }

    return ctx
  }

  /**
   * 构建系统提示
   */
  async _buildSystemPrompt(agentId, memoryContext) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } })
    if (!agent) {
      return '你是一个 AI 助手。'
    }

    let prompt = `你是 ${agent.name}。`
    if (agent.systemPrompt) {
      prompt += `\n\n${agent.systemPrompt}`
    }
    if (memoryContext) {
      prompt += `\n\n## 记忆上下文\n${memoryContext}`
    }

    return prompt
  }

  /**
   * 记录工具执行日志
   */
  async _logToolExecution(userId, agentId, sessionId, messageId, toolName, args, result) {
    try {
      await prisma.toolExecution.create({
        data: {
          sessionId,
          messageId,
          agentId,
          userId,
          toolName,
          toolCategory: registry.getTool(toolName)?.category,
          arguments: args,
          result: result,
          status: result.error ? 'failed' : 'success',
        },
      })
    } catch (err) {
      console.error('Failed to log tool execution:', err)
    }
  }

  /**
   * 记录情景记忆
   */
  async _recordEpisodicMemory(userId, agentId, task, toolResults, confidence) {
    try {
      await prisma.episodicMemory.create({
        data: {
          userId,
          agentId,
          taskDescription: task,
          taskCategory: this._inferTaskCategory(toolResults),
          approach: JSON.stringify(toolResults.map(t => t.toolName)),
          result: confidence > 0.7 ? 'success' : 'partial',
          resultDetail: `Confidence: ${confidence}`,
          tokensUsed: toolResults.length * 100,
          toolsUsed: toolResults.map(t => t.toolName),
        },
      })
    } catch (err) {
      console.error('Failed to record episodic memory:', err)
    }
  }

  _inferTaskCategory(toolResults) {
    if (toolResults.length === 0) return 'general'
    const categories = toolResults.map(t => registry.getTool(t.toolName)?.category)
    const mostCommon = categories.sort((a, b) =>
      categories.filter(v => v === b).length - categories.filter(v => v === a).length
    )[0]
    return mostCommon || 'general'
  }
}

module.exports = { ReactEngine }
