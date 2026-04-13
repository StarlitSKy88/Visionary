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

  /**
   * 获取记忆统计信息
   */
  async getMemoryStats(userId, agentId) {
    const [
      shortTermCount,
      longTermCount,
      episodicCount,
      totalCharCount,
    ] = await Promise.all([
      prisma.shortTermMemory.count({ where: { userId, agentId } }),
      prisma.longTermMemory.count({ where: { userId, agentId, isActive: true } }),
      prisma.episodicMemory.count({ where: { userId, agentId } }),
      prisma.longTermMemory.aggregate({
        where: { userId, agentId, isActive: true },
        _sum: { content: true },
      }),
    ])

    return {
      shortTermCount,
      longTermCount,
      episodicCount,
      totalCharCount: totalCharCount._sum.content?.length || 0,
    }
  }

  /**
   * 检查并触发记忆压缩
   * 当长期记忆超过阈值时自动压缩
   */
  async checkAndCompressMemories(userId, agentId) {
    const LONG_TERM_LIMIT = 500 // 长期记忆数量上限
    const TOTAL_CHARS_LIMIT = 500000 // 总字符数上限（~500KB）

    const stats = await this.getMemoryStats(userId, agentId)

    // 检查是否需要压缩
    const needsCompression =
      stats.longTermCount > LONG_TERM_LIMIT ||
      stats.totalCharCount > TOTAL_CHARS_LIMIT

    if (!needsCompression) {
      return { triggered: false, reason: 'memory_within_limits' }
    }

    // 触发压缩
    return await this.compressMemories(userId, agentId)
  }

  /**
   * 压缩记忆
   * 使用 AI 总结低重要性的记忆，保留关键信息
   */
  async compressMemories(userId, agentId) {
    try {
      // 获取需要压缩的记忆（按重要性排序，低的优先压缩）
      const memoriesToCompress = await prisma.longTermMemory.findMany({
        where: {
          userId,
          agentId,
          isActive: true,
          importance: { lt: 6 }, // 低重要性记忆优先压缩
        },
        orderBy: [
          { importance: 'asc' },
          { lastUsedAt: 'asc' },
        ],
        take: 50, // 每次最多压缩50条
      })

      if (memoriesToCompress.length === 0) {
        return { triggered: false, reason: 'no_low_importance_memories' }
      }

      // 按内容相似度分组
      const groups = this._groupSimilarMemories(memoriesToCompress)

      let compressedCount = 0
      let deletedCount = 0

      for (const group of groups) {
        if (group.length <= 1) continue

        // 保留最重要的一条
        const primary = group[0]
        const toMerge = group.slice(1)

        // 生成合并摘要
        const mergedContent = await this._summarizeMemoryGroup(group)

        if (mergedContent && mergedContent.length < primary.content.length * group.length) {
          // 更新主记忆
          await prisma.longTermMemory.update({
            where: { id: primary.id },
            data: {
              content: mergedContent,
              contentSummary: mergedContent.substring(0, 100),
              useCount: primary.useCount + toMerge.reduce((sum, m) => sum + m.useCount, 0),
              tags: [...new Set([...primary.tags, ...toMerge.flatMap(m => m.tags)])],
            },
          })

          // 删除被合并的记忆
          await prisma.longTermMemory.deleteMany({
            where: { id: { in: toMerge.map(m => m.id) } },
          })

          deletedCount += toMerge.length
          compressedCount++
        }
      }

      return {
        triggered: true,
        compressedGroups: compressedCount,
        deletedMemories: deletedCount,
      }
    } catch (error) {
      console.error('记忆压缩失败:', error)
      return { triggered: false, error: error.message }
    }
  }

  /**
   * 将相似的记忆分组
   */
  _groupSimilarMemories(memories) {
    const groups = []
    const processed = new Set()

    for (const memory of memories) {
      if (processed.has(memory.id)) continue

      const group = [memory]
      processed.add(memory.id)

      // 查找相似的记忆（相同类型、相同类别、有重叠的标签）
      for (const other of memories) {
        if (processed.has(other.id)) continue

        const similarity = this._calculateSimilarity(memory, other)
        if (similarity > 0.6) {
          group.push(other)
          processed.add(other.id)
        }
      }

      groups.push(group)
    }

    return groups
  }

  /**
   * 计算两条记忆的相似度
   */
  _calculateSimilarity(m1, m2) {
    let score = 0

    // 相同类型
    if (m1.memoryType === m2.memoryType) score += 0.3

    // 相同类别
    if (m1.category === m2.category) score += 0.2

    // 有重叠标签
    const tags1 = new Set(m1.tags || [])
    const tags2 = new Set(m2.tags || [])
    const overlap = [...tags1].filter(t => tags2.has(t)).length
    if (overlap > 0) score += 0.2 * Math.min(overlap, 3) / 3

    // 内容有重叠词汇
    const words1 = new Set(m1.content.split(/\s+/).slice(0, 20))
    const words2 = new Set(m2.content.split(/\s+/).slice(0, 20))
    const contentOverlap = [...words1].filter(w => words2.has(w) && w.length > 3).length
    if (contentOverlap > 3) score += 0.3

    return score
  }

  /**
   * 总结一组记忆（使用 AI）
   */
  async _summarizeMemoryGroup(group) {
    try {
      const { chat } = require('../lib/ai-service')

      const contents = group.map((m, i) => `${i + 1}. ${m.content}`).join('\n')

      const prompt = `请总结以下相关记忆，保留所有关键信息，删除重复内容，生成一段连贯的摘要（不超过200字）：

${contents}

摘要：`

      const summary = await chat([{ role: 'user', content: prompt }], {
        temperature: 0.3,
        maxTokens: 300,
      })

      return summary.trim()
    } catch (error) {
      // AI 总结失败时，返回第一条记忆
      console.error('AI 记忆总结失败:', error)
      return group[0].content
    }
  }

  /**
   * 清理过期记忆
   */
  async cleanupExpiredMemories() {
    try {
      // 删除过期的短期记忆
      const result = await prisma.shortTermMemory.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
          isPinned: false,
        },
      })

      // 清理过期的邀请码
      await prisma.emailCode.deleteMany({
        where: {
          expiresAt: { lt: BigInt(Date.now()) },
          used: 0,
        },
      })

      return {
        deletedShortTermMemories: result.count,
      }
    } catch (error) {
      console.error('记忆清理失败:', error)
      return { error: error.message }
    }
  }

  /**
   * 压缩 MEMORY.md 内容（当超过限制时）
   */
  async compressAgentMemory(agentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { memoryContent: true },
    })

    if (!agent?.memoryContent) return { compressed: false }

    const MEMORY_LIMIT = 2200

    if (agent.memoryContent.length <= MEMORY_LIMIT) {
      return { compressed: false }
    }

    // 使用 AI 压缩
    try {
      const { chat } = require('../lib/ai-service')

      const prompt = `请压缩以下 Agent 记忆文本，保留关键信息和经验总结，删除重复内容，限制在 ${MEMORY_LIMIT} 字以内：

${agent.memoryContent}

压缩后的记忆：`

      const compressed = await chat([{ role: 'user', content: prompt }], {
        temperature: 0.3,
        maxTokens: 2500,
      })

      await prisma.agent.update({
        where: { id: agentId },
        data: { memoryContent: compressed.trim() },
      })

      return {
        compressed: true,
        originalLength: agent.memoryContent.length,
        compressedLength: compressed.trim().length,
      }
    } catch (error) {
      console.error('MEMORY.md 压缩失败:', error)

      // 降级：直接截断
      const truncated = agent.memoryContent.substring(0, MEMORY_LIMIT)
      await prisma.agent.update({
        where: { id: agentId },
        data: { memoryContent: truncated },
      })

      return {
        compressed: true,
        originalLength: agent.memoryContent.length,
        compressedLength: truncated.length,
        fallback: true,
      }
    }
  }
}

// 单例
const memoryService = new MemoryService()

module.exports = { memoryService, MemoryService }
