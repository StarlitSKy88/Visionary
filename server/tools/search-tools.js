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
    const { query, num_results = 10 } = args

    try {
      // 使用 DuckDuckGo Instant Answer API (无需 API key)
      const encodedQuery = encodeURIComponent(query)
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`

      const response = await fetch(ddgUrl, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`搜索请求失败: ${response.status}`)
      }

      const data = await response.json()

      // 解析 DuckDuckGo 结果
      const results = []

      // Topic 摘要
      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL || '',
          snippet: data.AbstractText,
          source: 'DuckDuckGo',
        })
      }

      // Related Topics
      if (data.RelatedTopics && results.length < num_results) {
        for (const topic of data.RelatedTopics.slice(0, num_results)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: query,
              url: topic.FirstURL,
              snippet: topic.Text,
              source: 'DuckDuckGo',
            })
          }
        }
      }

      // 如果没有结果，返回提示
      if (results.length === 0) {
        return {
          query,
          results: [{
            title: `搜索: ${query}`,
            url: `https://duckduckgo.com/?q=${encodedQuery}`,
            snippet: `在 DuckDuckGo 上搜索 "${query}" 的结果`,
            source: 'DuckDuckGo',
          }],
          totalResults: 1,
        }
      }

      return {
        query,
        results: results.slice(0, num_results),
        totalResults: results.length,
      }
    } catch (error) {
      // 搜索失败时返回错误信息和备用链接
      return {
        query,
        error: `搜索失败: ${error.message}`,
        results: [{
          title: `搜索: ${query}`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: `请手动访问 DuckDuckGo 搜索 "${query}"`,
          source: '备用',
        }],
        totalResults: 1,
      }
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
