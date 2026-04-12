/**
 * Session Search - 会话搜索服务
 * 支持自然语言查询历史会话
 */

const { prisma } = require('../lib/prisma')
const { aiService } = require('../lib/ai-service')

class SessionSearch {
  /**
   * 搜索会话
   */
  async search(userId, query, options = {}) {
    const { limit = 10, sessionId = null } = options

    // 1. 理解用户查询意图
    const queryUnderstanding = await this._understandQuery(query)

    // 2. 构建搜索条件
    const where = {
      userId,
    }

    if (sessionId) {
      where.sessionId = sessionId
    }

    // 3. 获取消息
    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit * 2, // 获取更多以便过滤
      include: {
        session: { select: { id: true, title: true } },
      },
    })

    // 4. 语义匹配
    const matchedMessages = await this._semanticMatch(messages, queryUnderstanding)

    return {
      query,
      understanding: queryUnderstanding,
      results: matchedMessages.slice(0, limit).map(m => ({
        messageId: m.id,
        sessionId: m.sessionId,
        sessionTitle: m.session?.title,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        relevance: m.relevance || 0,
      })),
    }
  }

  /**
   * 理解查询意图
   */
  async _understandQuery(query) {
    const prompt = `分析以下搜索查询：

"${query}"

请提取：
1. 关键实体（人名、日期、项目名等）
2. 查询类型（时间范围、主题搜索、人物对话等）
3. 意图（查找什么信息）

以JSON格式返回：
{
  "entities": [],
  "queryType": "topic/date/person/mixed",
  "intent": "查询意图描述"
}`

    const result = await aiService.chat(
      [{ role: 'user', content: prompt }],
      { taskType: 'query-understanding' }
    )

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (jsonMatch) return JSON.parse(jsonMatch[0])
    } catch {}

    return {
      entities: [],
      queryType: 'mixed',
      intent: query,
    }
  }

  /**
   * 语义匹配（简化版本）
   */
  async _semanticMatch(messages, queryUnderstanding) {
    // 简单关键词匹配 + 排序
    const keywords = queryUnderstanding.entities || []
    if (queryUnderstanding.intent) {
      keywords.push(...queryUnderstanding.intent.split(' '))
    }

    const scored = messages.map(m => {
      let score = 0
      const content = (m.content || '').toLowerCase()

      // 标题匹配
      if (m.session?.title) {
        const title = m.session.title.toLowerCase()
        for (const kw of keywords) {
          if (title.includes(kw.toLowerCase())) score += 2
        }
      }

      // 内容匹配
      for (const kw of keywords) {
        if (content.includes(kw.toLowerCase())) score += 1
      }

      return { ...m, relevance: score }
    })

    return scored
      .filter(m => m.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
  }

  /**
   * 获取会话摘要
   */
  async getSessionSummary(sessionId) {
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        content: true,
        createdAt: true,
      },
    })

    if (messages.length === 0) {
      return null
    }

    // 生成摘要
    const firstMsg = messages[0]
    const lastMsg = messages[messages.length - 1]

    return {
      sessionId,
      messageCount: messages.length,
      firstMessage: firstMsg.content.substring(0, 100),
      lastMessageTime: lastMsg.createdAt,
      duration: new Date(lastMsg.createdAt) - new Date(firstMsg.createdAt),
    }
  }
}

module.exports = { SessionSearch }
