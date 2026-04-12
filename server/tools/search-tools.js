/**
 * 搜索工具
 * 网页搜索、知识库检索
 */

const { BaseTool, ValidationError } = require('./base-tool')

/**
 * 网页搜索
 */
class WebSearchTool extends BaseTool {
  constructor() {
    super({
      name: 'web_search',
      description: '搜索网页信息',
      category: 'search',
      parameters: [
        { name: 'query', type: 'string', required: true, description: '搜索关键词' },
        { name: 'num_results', type: 'number', default: 10, required: false, description: '返回结果数量' },
      ],
    })
  }

  async execute(args, context) {
    const { query, num_results } = args

    // TODO: 实际调用搜索 API (如 Google, Bing, DuckDuckGo)
    // 这里返回模拟数据

    return {
      query,
      results: [
        {
          title: `关于 "${query}" 的搜索结果 1`,
          url: 'https://example.com/result-1',
          snippet: `这是关于 ${query} 的详细内容摘要...`,
        },
        {
          title: `关于 "${query}" 的搜索结果 2`,
          url: 'https://example.com/result-2',
          snippet: `这是另一个关于 ${query} 的搜索结果...`,
        },
      ],
      totalResults: 2,
    }
  }
}

/**
 * 知识库搜索
 */
class KnowledgeBaseSearchTool extends BaseTool {
  constructor() {
    super({
      name: 'knowledge_base_search',
      description: '搜索企业内部知识库',
      category: 'search',
      parameters: [
        { name: 'query', type: 'string', required: true, description: '搜索查询' },
        { name: 'category', type: 'string', required: false, description: '知识类别' },
        { name: 'limit', type: 'number', default: 10, required: false, description: '返回数量' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { query, category, limit } = args

    // 在长期记忆和情景记忆中搜索
    let where = {
      userId: context.userId,
      isActive: true,
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

    // 简单的关键词匹配
    const matchedMemories = memories.filter(m =>
      m.content.includes(query) ||
      (m.contentSummary && m.contentSummary.includes(query)) ||
      (m.tags && JSON.stringify(m.tags).includes(query))
    )

    return {
      query,
      count: matchedMemories.length,
      results: matchedMemories.map(m => ({
        id: m.id,
        content: m.content,
        contentSummary: m.contentSummary,
        category: m.category,
        tags: m.tags,
        confidence: m.confidence,
        source: m.source,
      })),
    }
  }
}

module.exports = {
  WebSearchTool,
  KnowledgeBaseSearchTool,
}
