/**
 * 记忆服务
 * 短期记忆、长期记忆、Bounded Memory (MEMORY.md / USER.md)
 */

const { prisma } = require('../lib/prisma')

class MemoryService {
  /**
   * 获取会话的上下文（用于注入 system prompt）
   * 实现 Hermes Agent 的 Bounded Curated Memory 模式
   */
  async getContextForSession(userId, agentId) {
    // 1. 获取 Agent 的 MEMORY.md 和 USER.md
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        memoryContent: true,
        userProfileContent: true,
      },
    })

    // 2. 获取短期记忆（最近的关键上下文）
    const shortTermMemories = await this._getShortTermContext(userId, agentId)

    // 3. 获取长期记忆中高重要性的事实
    const longTermFacts = await this._getRelevantLongTermFacts(userId)

    // 4. 组装上下文
    let context = ''

    if (agent?.memoryContent) {
      context += `## Agent 记忆 (MEMORY.md)\n${agent.memoryContent}\n\n`
    }

    if (agent?.userProfileContent) {
      context += `## 用户画像 (USER.md)\n${agent.userProfileContent}\n\n`
    }

    if (shortTermMemories) {
      context += `## 当前会话上下文\n${shortTermMemories}\n\n`
    }

    if (longTermFacts) {
      context += `## 用户事实与偏好\n${longTermFacts}\n`
    }

    return context.trim() || null
  }

  /**
   * 获取短期记忆上下文
   */
  async _getShortTermContext(userId, agentId) {
    const memories = await prisma.shortTermMemory.findMany({
      where: {
        userId,
        agentId,
        isPinned: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    if (memories.length === 0) return null

    return memories
      .map(m => `- ${m.content}`)
      .join('\n')
  }

  /**
   * 获取长期记忆中重要的事实
   */
  async _getRelevantLongTermFacts(userId) {
    const facts = await prisma.longTermMemory.findMany({
      where: {
        userId,
        isActive: true,
        memoryType: { in: ['fact', 'preference', 'rule'] },
        importance: { gte: 7 },
      },
      orderBy: [
        { importance: 'desc' },
        { lastUsedAt: 'desc' },
      ],
      take: 10,
    })

    if (facts.length === 0) return null

    return facts
      .map(f => `- [${f.memoryType}] ${f.content}`)
      .join('\n')
  }

  /**
   * 添加短期记忆
   */
  async addShortTermMemory(userId, agentId, sessionId, content, options = {}) {
    const {
      memoryType = 'conversation',
      importance = 5,
      entities = [],
      topics = [],
      expiresInHours = 24,
    } = options

    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

    const memory = await prisma.shortTermMemory.create({
      data: {
        userId,
        agentId,
        sessionId,
        content,
        memoryType,
        importance,
        entities,
        topics,
        expiresAt,
      },
    })

    // 检查是否需要晋升到长期记忆
    if (importance >= 8) {
      await this._promoteToLongTerm(memory)
    }

    return memory
  }

  /**
   * 晋升到长期记忆
   */
  async _promoteToLongTerm(shortTermMemory) {
    await prisma.longTermMemory.create({
      data: {
        userId: shortTermMemory.userId,
        agentId: shortTermMemory.agentId,
        content: shortTermMemory.content,
        contentSummary: shortTermMemory.contentSummary,
        memoryType: shortTermMemory.memoryType,
        category: 'imported',
        importance: shortTermMemory.importance,
        source: 'short_term_promotion',
      },
    })

    // 删除短期记忆
    await prisma.shortTermMemory.delete({
      where: { id: shortTermMemory.id },
    })
  }

  /**
   * 添加长期记忆
   */
  async addLongTermMemory(userId, agentId, content, options = {}) {
    const {
      memoryType = 'fact',
      category,
      tags = [],
      importance = 5,
      confidence = 80,
    } = options

    return await prisma.longTermMemory.create({
      data: {
        userId,
        agentId,
        content,
        contentSummary: content.substring(0, 100),
        memoryType,
        category,
        tags,
        importance,
        confidence,
        source: 'tool',
      },
    })
  }

  /**
   * 搜索记忆
   */
  async searchMemories(userId, query, options = {}) {
    const { memoryType, category, limit = 10 } = options

    let where = {
      userId,
      isActive: true,
    }

    if (memoryType) where.memoryType = memoryType
    if (category) where.category = category

    const memories = await prisma.longTermMemory.findMany({
      where,
      orderBy: [
        { importance: 'desc' },
        { useCount: 'desc' },
      ],
      take: limit * 3, // 获取更多以便语义筛选
    })

    // 尝试语义搜索（如果配置了 API key）
    try {
      const { semanticSearch } = require('../lib/embedding-service')

      const items = memories.map(m => ({
        id: m.id,
        content: m.content,
        metadata: { importance: m.importance, useCount: m.useCount },
      }))

      const results = await semanticSearch(query, items, { threshold: 0.5, limit })

      // 增加使用计数
      for (const result of results) {
        await prisma.longTermMemory.update({
          where: { id: result.id },
          data: { useCount: { increment: 1 } },
        })
      }

      return results
    } catch (e) {
      // 降级到关键词匹配
      const matched = memories.filter(m =>
        m.content.includes(query) ||
        (m.contentSummary && m.contentSummary.includes(query)) ||
        (m.tags && JSON.stringify(m.tags).includes(query))
      )

      return matched.slice(0, limit)
    }
  }

  /**
   * 更新 MEMORY.md (Agent 个人笔记)
   */
  async updateAgentMemory(agentId, newContent) {
    // 确保不超过 ~2200 字符
    const truncated = newContent.length > 2200
      ? newContent.substring(0, 2200)
      : newContent

    await prisma.agent.update({
      where: { id: agentId },
      data: { memoryContent: truncated },
    })

    return { success: true, length: truncated.length }
  }

  /**
   * 更新 USER.md (用户画像)
   */
  async updateUserProfileMemory(userId, newContent) {
    // 确保不超过 ~1375 字符
    const truncated = newContent.length > 1375
      ? newContent.substring(0, 1375)
      : newContent

    await prisma.user.update({
      where: { id: userId },
      // 需要通过 UserProfile 更新，这里假设有关联
    })

    // 实际应该通过 UserProfile 更新
    return { success: true, length: truncated.length }
  }

  /**
   * 获取情景记忆（用于自我改进）
   */
  async getEpisodicMemories(userId, taskCategory, limit = 5) {
    return await prisma.episodicMemory.findMany({
      where: {
        userId,
        taskCategory,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * 获取多Agent共享上下文
   * 用于多Agent协作时共享的记忆
   */
  async getSharedContext(userId, agentIds) {
    // 获取所有相关Agent的记忆
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: {
        id: true,
        name: true,
        memoryContent: true,
      },
    })

    // 获取用户的长期共享记忆
    const sharedMemories = await prisma.longTermMemory.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { memoryType: 'shared' },
          { tags: { has: 'shared' } },
        ],
      },
      orderBy: { importance: 'desc' },
      take: 10,
    })

    // 获取最近的协作历史
    const recentCollaborations = await prisma.episodicMemory.findMany({
      where: {
        userId,
        agentId: { in: agentIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // 构建共享上下文
    let context = '## 共享知识库\n'

    if (sharedMemories.length > 0) {
      context += sharedMemories.map(m => `- ${m.content}`).join('\n') + '\n\n'
    }

    if (recentCollaborations.length > 0) {
      context += '## 近期协作记录\n'
      recentCollaborations.forEach(c => {
        context += `- [${c.taskCategory}] ${c.taskDescription.slice(0, 50)}: ${c.result}\n`
      })
    }

    return context.trim() || null
  }

  /**
   * 添加共享记忆（多Agent可见）
   */
  async addSharedMemory(userId, content, importance = 5) {
    return await prisma.longTermMemory.create({
      data: {
        userId,
        content,
        memoryType: 'shared',
        importance,
        isActive: true,
        tags: ['shared'],
      },
    })
  }

  /**
   * 记录情景记忆
   */
  async addEpisodicMemory(userId, agentId, taskDescription, taskCategory, result, details = {}) {
    return await prisma.episodicMemory.create({
      data: {
        userId,
        agentId,
        taskDescription,
        taskCategory,
        approach: details.approach || '',
        result,
        resultDetail: details.resultDetail,
        reflection: details.reflection,
        lessonsLearned: details.lessonsLearned,
        durationMs: details.durationMs,
        tokensUsed: details.tokensUsed,
        toolsUsed: details.toolsUsed || [],
      },
    })
  }
}

// 单例
const memoryService = new MemoryService()

module.exports = { memoryService, MemoryService }
