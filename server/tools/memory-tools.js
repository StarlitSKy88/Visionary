/**
 * 记忆工具
 * 添加、替换、删除、搜索记忆 (Hermes Agent 风格)
 */

const { BaseTool, ValidationError, ToolExecutionError } = require('./base-tool')

/**
 * 添加记忆
 */
class MemoryAddTool extends BaseTool {
  constructor() {
    super({
      name: 'memory_add',
      description: '添加新的长期记忆',
      category: 'memory',
      parameters: [
        { name: 'content', type: 'string', required: true, description: '记忆内容' },
        { name: 'memory_type', type: 'string', default: 'fact', required: false, description: '记忆类型: fact/preference/rule/habit/feedback' },
        { name: 'category', type: 'string', required: false, description: '自定义分类' },
        { name: 'tags', type: 'string', required: false, description: '标签 (逗号分隔)' },
        { name: 'importance', type: 'number', default: 5, required: false, description: '重要性 1-10' },
        { name: 'confidence', type: 'number', default: 80, required: false, description: '置信度 0-100' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { content, memory_type, category, tags, importance, confidence } = args

    const parsedTags = tags
      ? tags.split(',').map(t => t.trim()).filter(Boolean)
      : []

    const memory = await prisma.longTermMemory.create({
      data: {
        userId: context.userId,
        agentId: context.agentId,
        content,
        contentSummary: content.substring(0, 100),
        memoryType: memory_type || 'fact',
        category,
        tags: parsedTags,
        importance: importance || 5,
        confidence: confidence || 80,
        source: 'tool',
      },
    })

    return {
      success: true,
      memoryId: memory.id,
      message: `已添加记忆 (ID: ${memory.id})`,
      memory: {
        id: memory.id,
        content: memory.content,
        memoryType: memory.memoryType,
        category: memory.category,
        importance: memory.importance,
      },
    }
  }
}

/**
 * 替换记忆
 */
class MemoryReplaceTool extends BaseTool {
  constructor() {
    super({
      name: 'memory_replace',
      description: '替换记忆内容（substring 匹配）',
      category: 'memory',
      parameters: [
        { name: 'memory_id', type: 'string', required: true, description: '记忆 ID' },
        { name: 'new_content', type: 'string', required: true, description: '新的记忆内容' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { memory_id, new_content } = args

    const memory = await prisma.longTermMemory.findUnique({
      where: { id: memory_id },
    })

    if (!memory) {
      throw new ToolExecutionError(`记忆不存在: ${memory_id}`, this.name)
    }

    const updated = await prisma.longTermMemory.update({
      where: { id: memory_id },
      data: {
        content: new_content,
        contentSummary: new_content.substring(0, 100),
        updatedAt: new Date(),
      },
    })

    return {
      success: true,
      memoryId: updated.id,
      message: `已替换记忆 (ID: ${memory_id})`,
      memory: {
        id: updated.id,
        content: updated.content,
        contentSummary: updated.contentSummary,
      },
    }
  }
}

/**
 * 删除记忆
 */
class MemoryRemoveTool extends BaseTool {
  constructor() {
    super({
      name: 'memory_remove',
      description: '删除记忆（substring 匹配）',
      category: 'memory',
      parameters: [
        { name: 'memory_id', type: 'string', required: true, description: '记忆 ID' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { memory_id } = args

    const memory = await prisma.longTermMemory.findUnique({
      where: { id: memory_id },
    })

    if (!memory) {
      throw new ToolExecutionError(`记忆不存在: ${memory_id}`, this.name)
    }

    await prisma.longTermMemory.delete({
      where: { id: memory_id },
    })

    return {
      success: true,
      message: `已删除记忆 (ID: ${memory_id})`,
    }
  }
}

/**
 * 搜索记忆
 */
class MemorySearchTool extends BaseTool {
  constructor() {
    super({
      name: 'memory_search',
      description: '搜索长期记忆',
      category: 'memory',
      parameters: [
        { name: 'query', type: 'string', required: true, description: '搜索查询' },
        { name: 'memory_type', type: 'string', required: false, description: '记忆类型筛选' },
        { name: 'category', type: 'string', required: false, description: '分类筛选' },
        { name: 'limit', type: 'number', default: 10, required: false, description: '返回数量' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { query, memory_type, category, limit } = args

    let where = {
      userId: context.userId,
      isActive: true,
    }

    if (memory_type) {
      where.memoryType = memory_type
    }
    if (category) {
      where.category = category
    }

    const memories = await prisma.longTermMemory.findMany({
      where,
      orderBy: [
        { importance: 'desc' },
        { useCount: 'desc' },
      ],
      take: limit,
    })

    // 简单关键词匹配
    const matchedMemories = memories.filter(m =>
      m.content.includes(query) ||
      (m.contentSummary && m.contentSummary.includes(query)) ||
      (m.tags && JSON.stringify(m.tags).includes(query))
    )

    // 增加使用计数
    for (const memory of matchedMemories) {
      await prisma.longTermMemory.update({
        where: { id: memory.id },
        data: {
          useCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      })
    }

    return {
      query,
      count: matchedMemories.length,
      memories: matchedMemories.map(m => ({
        id: m.id,
        content: m.content,
        contentSummary: m.contentSummary,
        memoryType: m.memoryType,
        category: m.category,
        tags: m.tags,
        importance: m.importance,
        confidence: m.confidence,
        useCount: m.useCount,
        lastUsedAt: m.lastUsedAt,
      })),
    }
  }
}

module.exports = {
  MemoryAddTool,
  MemoryReplaceTool,
  MemoryRemoveTool,
  MemorySearchTool,
}
