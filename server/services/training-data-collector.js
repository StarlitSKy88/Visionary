/**
 * 训练数据收集服务
 * 从用户反馈和成功对话中构建高质量训练对
 */

const { prisma } = require('../lib/prisma')

class TrainingDataCollector {
  /**
   * 构建训练对并存储
   * @param {string} userId
   * @param {string} agentId
   * @param {string} sourceType - 'thumbs_up' | 'correction' | 'implicit_success'
   * @param {object} data - {prompt, completion, messageId, quality}
   */
  async buildTrainingPair(userId, agentId, sourceType, data) {
    const { prompt, completion, messageId, quality } = data

    // 质量过滤：低于 60 分的不用于训练
    if (quality && quality < 60) {
      return null
    }

    // 构建符合 OpenAI 格式的训练对
    const trainingPair = {
      prompt: this._formatPrompt(prompt, agentId),
      completion: this._formatCompletion(completion),
    }

    // 验证格式
    if (!this._validateTrainingPair(trainingPair)) {
      return null
    }

    // 存储到数据库
    return prisma.fineTuningTrainingData.create({
      data: {
        userId,
        agentId,
        prompt: trainingPair.prompt,
        completion: trainingPair.completion,
        sourceType,
        sourceMessageId: messageId,
        qualityScore: quality || 70,
      },
    })
  }

  /**
   * 从消息构建训练对（用于 thumbs_up 反馈）
   */
  async buildFromSuccessFeedback(userId, agentId, message, quality = 70) {
    // 获取对话上下文作为 prompt
    const sessionMessages = await prisma.message.findMany({
      where: { sessionId: message.sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })

    // 构建 prompt（用户最后的提问）
    const userMessages = sessionMessages.filter(m => m.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || ''

    // 构建 prompt 包含上下文
    const contextPrompt = this._buildContextPrompt(sessionMessages, lastUserMessage)

    return this.buildTrainingPair(userId, agentId, 'thumbs_up', {
      prompt: contextPrompt,
      completion: message.content,
      messageId: message.id,
      quality,
    })
  }

  /**
   * 从纠正反馈构建训练对
   */
  async buildFromCorrection(userId, agentId, originalMessage, correction, quality = 90) {
    // 获取对话上下文
    const sessionMessages = await prisma.message.findMany({
      where: { sessionId: originalMessage.sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })

    const userMessages = sessionMessages.filter(m => m.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || ''

    const contextPrompt = this._buildContextPrompt(sessionMessages, lastUserMessage)

    return this.buildTrainingPair(userId, agentId, 'correction', {
      prompt: contextPrompt,
      completion: correction,
      messageId: originalMessage.id,
      quality,
    })
  }

  /**
   * 批量收集某 Agent 的高质量训练数据
   */
  async collectAgentTrainingData(agentId, options = {}) {
    const { minQuality = 70, limit = 100 } = options

    return prisma.fineTuningTrainingData.findMany({
      where: {
        agentId,
        isApproved: true,
        isUsed: false,
        qualityScore: { gte: minQuality },
      },
      orderBy: { qualityScore: 'desc' },
      take: limit,
    })
  }

  /**
   * 导出为 JSONL 格式（用于微调 API）
   */
  async exportToJSONL(agentId, options = {}) {
    const data = await this.collectAgentTrainingData(agentId, options)
    return data
      .map(d => JSON.stringify({
        prompt: d.prompt,
        completion: d.completion,
      }))
      .join('\n')
  }

  /**
   * 准备微调用数据集
   */
  async prepareDataset(agentId) {
    const data = await this.collectAgentTrainingData(agentId, { minQuality: 70, limit: 200 })

    if (data.length < 10) {
      throw new Error(`训练数据不足: 至少需要 10 条，当前只有 ${data.length} 条`)
    }

    // 标记为已使用
    await prisma.fineTuningTrainingData.updateMany({
      where: { id: { in: data.map(d => d.id) } },
      data: { isUsed: true },
    })

    return {
      count: data.length,
      jsonl: await this.exportToJSONL(agentId, { minQuality: 70, limit: 200 }),
    }
  }

  /**
   * 获取训练数据统计
   */
  async getTrainingDataStats(agentId) {
    const [total, approved, used, avgQuality] = await Promise.all([
      prisma.fineTuningTrainingData.count({ where: { agentId } }),
      prisma.fineTuningTrainingData.count({ where: { agentId, isApproved: true } }),
      prisma.fineTuningTrainingData.count({ where: { agentId, isUsed: true } }),
      prisma.fineTuningTrainingData.aggregate({
        where: { agentId },
        _avg: { qualityScore: true },
      }),
    ])

    return {
      total,
      approved,
      used,
      available: approved - used,
      avgQuality: avgQuality._avg.qualityScore || 0,
      readyForFineTuning: approved - used >= 10,
    }
  }

  /**
   * 审批训练数据（提高质量）
   */
  async approveTrainingData(id, approved = true) {
    return prisma.fineTuningTrainingData.update({
      where: { id },
      data: { isApproved: approved },
    })
  }

  // ==================== 私有方法 ====================

  /**
   * 格式化 Prompt
   */
  _formatPrompt(prompt, agentId) {
    // 确保 prompt 以问题或指令结尾
    if (!prompt.trim().endsWith('?') && !prompt.trim().endsWith('？')) {
      return prompt.trim()
    }
    return prompt.trim()
  }

  /**
   * 格式化 Completion
   */
  _formatCompletion(completion) {
    // 确保 completion 以结束标记结尾
    let formatted = completion.trim()
    if (!formatted.endsWith('###') && !formatted.endsWith(' END')) {
      formatted += ' ###'
    }
    return formatted
  }

  /**
   * 验证训练对格式
   */
  _validateTrainingPair(pair) {
    if (!pair.prompt || pair.prompt.length < 10) return false
    if (!pair.completion || pair.completion.length < 5) return false
    if (pair.prompt.length > 2000) return false
    if (pair.completion.length > 2000) return false
    return true
  }

  /**
   * 构建带上下文的 Prompt
   */
  _buildContextPrompt(sessionMessages, currentQuestion) {
    // 取最近几轮对话作为上下文
    const recentMessages = sessionMessages.slice(-6)
    const contextParts = []

    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        contextParts.push(`用户: ${msg.content}`)
      } else if (msg.role === 'assistant') {
        contextParts.push(`助手: ${msg.content}`)
      }
    }

    if (contextParts.length > 0) {
      return `【对话上下文】\n${contextParts.join('\n')}\n\n【当前问题】\n${currentQuestion}`
    }

    return currentQuestion
  }
}

// 单例
const trainingDataCollector = new TrainingDataCollector()

module.exports = { trainingDataCollector, TrainingDataCollector }
