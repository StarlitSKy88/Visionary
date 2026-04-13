/**
 * 学习服务
 * 持续学习闭环 - 根据反馈自动调整 Agent 行为
 */

const { prisma } = require('../lib/prisma')

class LearningService {
  /**
   * 处理用户反馈并学习
   */
  async processFeedback(userId, agentId, messageId, feedback) {
    try {
      const { type, content } = feedback

      // 获取原始消息
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { session: true },
      })

      if (!message) {
        return { success: false, error: '消息不存在' }
      }

      // 解析反馈
      if (type === 'thumbs_up') {
        // 正面反馈：学习成功的模式
        await this._learnFromSuccess(userId, agentId, message)
      } else if (type === 'thumbs_down') {
        // 负面反馈：分析失败原因并记录
        await this._learnFromFailure(userId, agentId, message, content)
      } else if (type === 'correction') {
        // 纠正反馈：直接学习正确内容
        await this._learnFromCorrection(userId, agentId, message, content)
      }

      // 记录学习
      await this._recordLearning(userId, agentId, type, message, content)

      return { success: true }
    } catch (error) {
      console.error('处理反馈失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 从成功案例中学习
   */
  async _learnFromSuccess(userId, agentId, message) {
    const { chat } = require('../lib/ai-service')

    // 提取成功的模式和上下文
    try {
      const prompt = `分析以下成功的 AI 回复，提取可以复用的模式：

用户问题：${message.session?.title || '未知'}
AI 回复：${message.content}

请提取：
1. 回答风格特点（简洁/详细/正式/友好）
2. 使用的工具或方法
3. 任何值得记忆的事实或偏好

格式：JSON
{
  "style": "风格描述",
  "patterns": ["模式1", "模式2"],
  "knowledge": ["知识1", "知识2"]
}`

      const result = await chat([{ role: 'user', content: prompt }], {
        temperature: 0.3,
        maxTokens: 500,
      })

      // 解析结果
      const match = result.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])

        // 将学到的模式添加到长期记忆
        if (parsed.patterns) {
          for (const pattern of parsed.patterns) {
            await prisma.longTermMemory.create({
              data: {
                userId,
                agentId,
                content: `成功模式：${pattern}`,
                memoryType: 'feedback',
                category: 'pattern',
                tags: ['learned', 'success'],
                importance: 6,
                confidence: 70,
                source: 'feedback_learning',
                sourceMessageId: message.id,
              },
            })
          }
        }
      }
    } catch (e) {
      console.error('学习成功模式失败:', e)
    }
  }

  /**
   * 从失败案例中学习
   */
  async _learnFromFailure(userId, agentId, message, userFeedback) {
    // 记录失败情景
    await prisma.longTermMemory.create({
      data: {
        userId,
        agentId,
        content: `失败情景：${userFeedback || '用户对回复不满意'}`,
        contentSummary: message.content.substring(0, 100),
        memoryType: 'feedback',
        category: 'failure',
        tags: ['learned', 'failure'],
        importance: 8, // 失败教训高重要性
        confidence: 90,
        source: 'feedback_learning',
        sourceMessageId: message.id,
      },
    })

    // 分析失败原因并生成规则
    await this._generateFailureRules(userId, agentId, message, userFeedback)
  }

  /**
   * 从纠正中学习
   */
  async _learnFromCorrection(userId, agentId, message, correction) {
    // 直接记录正确内容
    await prisma.longTermMemory.create({
      data: {
        userId,
        agentId,
        content: `纠正：${correction}`,
        contentSummary: message.content.substring(0, 50),
        memoryType: 'fact',
        category: 'correction',
        tags: ['learned', 'correction'],
        importance: 9,
        confidence: 95,
        source: 'feedback_learning',
        sourceMessageId: message.id,
      },
    })
  }

  /**
   * 生成失败规则（使用 AI 分析）
   */
  async _generateFailureRules(userId, agentId, message, userFeedback) {
    const { chat } = require('../lib/ai-service')

    try {
      const prompt = `分析以下失败案例，生成避免再次失败的规则：

原始回复：${message.content}
用户反馈：${userFeedback || '不满意'}

请生成 1-2 条具体的执行规则，帮助 AI 未来避免类似错误。
格式：["规则1", "规则2"]

规则：`

      const result = await chat([{ role: 'user', content: prompt }], {
        temperature: 0.3,
        maxTokens: 200,
      })

      // 提取规则
      const rules = result.match(/\[(.*?)\]/s)?.[1]
        ?.split(',')
        ?.map(r => r.trim().replace(/"/g, ''))
        ?.filter(r => r.length > 5)

      if (rules) {
        for (const rule of rules) {
          await prisma.longTermMemory.create({
            data: {
              userId,
              agentId,
              content: `执行规则：${rule}`,
              memoryType: 'rule',
              category: 'constraint',
              tags: ['learned', 'rule'],
              importance: 8,
              confidence: 80,
              source: 'feedback_learning',
            },
          })
        }
      }
    } catch (e) {
      console.error('生成失败规则失败:', e)
    }
  }

  /**
   * 记录学习
   */
  async _recordLearning(userId, agentId, feedbackType, message, content) {
    await prisma.learningRecord.create({
      data: {
        userId,
        agentId,
        learningType: feedbackType === 'correction' ? 'correction' : 'feedback',
        originalContent: message.content,
        learnedContent: content || (feedbackType === 'thumbs_up' ? '正面反馈' : '负面反馈'),
        category: feedbackType === 'correction' ? 'correction' : 'pattern',
        confidence: feedbackType === 'thumbs_up' ? 70 : (feedbackType === 'thumbs_down' ? 60 : 90),
        sourceMessageId: message.id,
        sourceType: 'explicit_feedback',
      },
    })
  }

  /**
   * 获取学到的规则和偏好
   */
  async getLearnedKnowledge(userId, agentId) {
    const [patterns, rules, corrections] = await Promise.all([
      prisma.longTermMemory.findMany({
        where: { userId, agentId, isActive: true, memoryType: 'feedback', category: 'pattern' },
        orderBy: { importance: 'desc' },
        take: 10,
      }),
      prisma.longTermMemory.findMany({
        where: { userId, agentId, isActive: true, memoryType: 'rule' },
        orderBy: { importance: 'desc' },
        take: 10,
      }),
      prisma.longTermMemory.findMany({
        where: { userId, agentId, isActive: true, memoryType: 'fact', category: 'correction' },
        orderBy: { importance: 'desc' },
        take: 5,
      }),
    ])

    return {
      patterns: patterns.map(p => p.content),
      rules: rules.map(r => r.content),
      corrections: corrections.map(c => c.content),
    }
  }

  /**
   * 生成系统提示词补充（包含学到的知识）
   */
  async generateSystemPromptSupplement(userId, agentId) {
    const knowledge = await this.getLearnedKnowledge(userId, agentId)
    let supplement = ''

    if (knowledge.rules.length > 0) {
      supplement += '\n## 执行规则\n'
      supplement += knowledge.rules.map(r => `- ${r}`).join('\n')
    }

    if (knowledge.corrections.length > 0) {
      supplement += '\n## 需注意的纠正\n'
      supplement += knowledge.corrections.map(c => `- ${c}`).join('\n')
    }

    if (knowledge.patterns.length > 0) {
      supplement += '\n## 成功模式\n'
      supplement += knowledge.patterns.map(p => `- ${p}`).join('\n')
    }

    return supplement.trim()
  }

  /**
   * 被动学习：从工具执行结果中学习
   */
  async learnFromToolExecution(userId, agentId, toolName, args, result, success) {
    if (!success) {
      // 记录工具使用失败
      await prisma.learningRecord.create({
        data: {
          userId,
          agentId,
          learningType: 'feedback',
          originalContent: `工具 ${toolName} 执行失败: ${result?.error || '未知错误'}`,
          learnedContent: JSON.stringify(args),
          category: 'tool_failure',
          confidence: 80,
          sourceType: 'implicit_feedback',
          affectedTools: [toolName],
        },
      })
    }

    // 检查工具使用频率，识别常用模式
    await this._updateToolPattern(userId, agentId, toolName)
  }

  /**
   * 更新工具使用模式
   */
  async _updateToolPattern(userId, agentId, toolName) {
    // 查找现有的工具模式记录
    const existing = await prisma.longTermMemory.findFirst({
      where: {
        userId,
        agentId,
        memoryType: 'fact',
        category: 'tool_pattern',
        tags: { has: toolName },
      },
    })

    if (existing) {
      // 更新使用计数
      await prisma.longTermMemory.update({
        where: { id: existing.id },
        data: {
          useCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      })
    }
  }

  /**
   * 分析学习效果
   */
  async analyzeLearningEffectiveness(userId, agentId) {
    const records = await prisma.learningRecord.findMany({
      where: { userId, agentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // 统计各类学习的应用情况
    const appliedRecords = records.filter(r => r.isApplied)
    const byType = records.reduce((acc, r) => {
      acc[r.learningType] = (acc[r.learningType] || 0) + 1
      return acc
    }, {})

    return {
      totalRecords: records.length,
      appliedRecords: appliedRecords.length,
      byType,
      effectivenessScore: records.length > 0
        ? Math.round((appliedRecords.length / records.length) * 100)
        : 0,
    }
  }
}

// 单例
const learningService = new LearningService()

module.exports = { learningService, LearningService }
