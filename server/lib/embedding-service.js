/**
 * 向量嵌入服务
 * 使用 OpenAI text-embedding-3 实现语义搜索
 *
 * 用于记忆的语义检索，替代简单的关键词匹配
 */

const { safeLog } = require('./logger')

// OpenAI Embedding API
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_URL = 'https://api.openai.com/v1/embeddings'

// 向量维度（text-embedding-3-small 支持 1536，text-embedding-3 支持 3072）
const EMBEDDING_DIMENSIONS = 1536

/**
 * 生成文本嵌入向量
 * @param {string} text - 要嵌入的文本
 * @returns {Promise<number[]>} 嵌入向量
 */
async function generateEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    safeLog({ type: 'embedding_no_key' }, '⚠️ 未配置 OPENAI_API_KEY，使用模拟向量')
    return generateSimulatedEmbedding(text)
  }

  try {
    // 使用 OpenRouter 或 OpenAI API
    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://api.openai.com/v1'
    const url = `${baseUrl}/embeddings`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.slice(0, 8000), // 限制输入长度
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Embedding API 失败: ${response.status} ${err}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    safeLog({ error: error.message }, '⚠️ Embedding 生成失败，使用模拟向量')
    return generateSimulatedEmbedding(text)
  }
}

/**
 * 生成模拟嵌入向量（用于没有 API Key 的情况）
 * 基于文本特征的简单哈希
 */
function generateSimulatedEmbedding(text) {
  // 简单的基于字符的哈希，生成伪随机但确定的向量
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0)

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i)
    const index = (charCode * (i + 1)) % EMBEDDING_DIMENSIONS
    vector[index] += charCode / 255
  }

  // 归一化
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  return vector.map(v => v / (magnitude || 1))
}

/**
 * 计算余弦相似度
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error('向量维度不匹配')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1)
  return Math.max(-1, Math.min(1, similarity)) // 限制在 [-1, 1]
}

/**
 * 语义搜索
 * @param {string} query - 查询文本
 * @param {Array<{id: string, content: string, metadata?: object}>} items - 要搜索的条目
 * @param {number} threshold - 相似度阈值 (0-1)
 * @param {number} limit - 返回数量
 * @returns {Promise<Array<{id, content, metadata, score}>>}
 */
async function semanticSearch(query, items, { threshold = 0.5, limit = 5 } = {}) {
  if (!items.length) {
    return []
  }

  // 生成查询向量
  const queryVector = await generateEmbedding(query)

  // 计算每个条目的相似度
  const results = []

  for (const item of items) {
    // 为每个item生成向量
    const itemVector = await generateEmbedding(item.content)

    const score = cosineSimilarity(queryVector, itemVector)

    if (score >= threshold) {
      results.push({
        id: item.id,
        content: item.content,
        metadata: item.metadata || {},
        score: Math.round(score * 1000) / 1000, // 保留3位小数
      })
    }
  }

  // 按相似度排序
  results.sort((a, b) => b.score - a.score)

  // 返回 top N
  return results.slice(0, limit)
}

/**
 * 批量生成嵌入（用于预处理）
 * @param {string[]} texts - 文本数组
 * @returns {Promise<number[][]>} 嵌入向量数组
 */
async function batchGenerateEmbeddings(texts) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    // 模拟模式
    return texts.map(text => generateSimulatedEmbedding(text))
  }

  try {
    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://api.openai.com/v1'
    const url = `${baseUrl}/embeddings`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts.map(t => t.slice(0, 8000)),
      }),
    })

    if (!response.ok) {
      throw new Error(`Batch embedding 失败: ${response.status}`)
    }

    const data = await response.json()
    return data.data.map(item => item.embedding)
  } catch (error) {
    safeLog({ error: error.message }, '⚠️ 批量 Embedding 失败')
    return texts.map(text => generateSimulatedEmbedding(text))
  }
}

module.exports = {
  generateEmbedding,
  cosineSimilarity,
  semanticSearch,
  batchGenerateEmbeddings,
  EMBEDDING_DIMENSIONS,
}
