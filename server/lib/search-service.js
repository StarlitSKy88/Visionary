/**
 * Search Service - T1: 调研/搜索工具
 * 为AI Agent提供实时搜索能力，获取行业数据、竞争对手信息、市场趋势等
 *
 * 当前实现：基于免费搜索API的简单封装
 * 后续可扩展：SerpAPI、DuckDuckGo API、Brave Search等
 */

const https = require('https')
const http = require('http')

// 搜索配置
const SEARCH_CONFIG = {
  // T1: 搜索API配置（当前使用 DuckDuckGo Lite HTML 解析）
  // 后续可切换到 SerpAPI/Brave Search 等付费API以获得更稳定的结果
  provider: process.env.SEARCH_PROVIDER || 'duckduckgo',
  maxResults: 5,
  timeout: 10000,
}

/**
 * 搜索结果
 * @typedef {Object} SearchResult
 * @property {string} title
 * @property {string} url
 * @property {string} snippet
 */

/**
 * 执行搜索
 * @param {string} query - 搜索关键词
 * @param {object} options - { lang, maxResults }
 * @returns {Promise<SearchResult[]>}
 */
async function search(query, options = {}) {
  const { lang = 'zh', maxResults = SEARCH_CONFIG.maxResults } = options

  try {
    // T1: 根据提供商执行搜索
    switch (SEARCH_CONFIG.provider) {
      case 'duckduckgo':
        return await searchDuckDuckGo(query, lang, maxResults)
      case 'brave':
        return await searchBrave(query, lang, maxResults)
      default:
        return await searchDuckDuckGo(query, lang, maxResults)
    }
  } catch (error) {
    console.error('Search error:', error)
    return []
  }
}

/**
 * DuckDuckGo 搜索（免费版，通过HTML解析）
 * 注意：这是临时实现，生产环境建议使用SerpAPI等付费服务
 */
async function searchDuckDuckGo(query, lang, maxResults) {
  const results = []

  // 编码查询
  const encodedQuery = encodeURIComponent(query)
  const url = `https://lite.duckduckgo.com/lite/?q=${encodedQuery}&kl=${lang === 'zh' ? 'cn-zh' : 'us-en'}`

  try {
    const html = await fetchUrl(url)

    // 简单的HTML解析 - 提取搜索结果
    // 注意：这个解析比较脆弱，可能需要根据DuckDuckGo的实际HTML结构调整
    const snippetRegex = /<a class="result__snippet"[^>]*>([^<]+)<\/a>/gi
    const urlRegex = /<a class="result__url"[^>]*>([^<]+)<\/a>/gi
    const titleRegex = /<a class="result__a"[^>]*>([^<]+)<\/a>/gi

    const snippets = []
    const urls = []
    const titles = []

    let match
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < maxResults) {
      snippets.push(stripHtml(match[1]))
    }

    while ((match = urlRegex.exec(html)) !== null && urls.length < maxResults) {
      urls.push(stripHtml(match[1]))
    }

    while ((match = titleRegex.exec(html)) !== null && titles.length < maxResults) {
      titles.push(stripHtml(match[1]))
    }

    // 组合结果
    for (let i = 0; i < Math.min(maxResults, titles.length); i++) {
      results.push({
        title: titles[i] || '',
        url: urls[i] || '',
        snippet: snippets[i] || '',
      })
    }
  } catch (error) {
    console.error('DuckDuckGo search error:', error)
  }

  return results
}

/**
 * Brave Search API 搜索
 * 需要 BRAVE_API_KEY 环境变量
 */
async function searchBrave(query, lang, maxResults) {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) {
    console.warn('Brave API key not configured, falling back to DuckDuckGo')
    return searchDuckDuckGo(query, lang, maxResults)
  }

  const encodedQuery = encodeURIComponent(query)
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodedQuery}&count=${maxResults}`

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'X-Subscription-Token': apiKey,
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          const results = (json.web?.results || []).map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.description,
          }))
          resolve(results.slice(0, maxResults))
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(SEARCH_CONFIG.timeout, () => {
      req.destroy()
      reject(new Error('Search timeout'))
    })
  })
}

/**
 * 获取URL内容
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http

    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    }, (res) => {
      // 处理重定向
      if (res.statusCode === 303 || res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location
        if (redirectUrl) {
          fetchUrl(redirectUrl).then(resolve).catch(reject)
          return
        }
      }

      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    })

    req.on('error', reject)
    req.setTimeout(SEARCH_CONFIG.timeout, () => {
      req.destroy()
      reject(new Error('Fetch timeout'))
    })
  })
}

/**
 * 去除HTML标签
 */
function stripHtml(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/**
 * T1: 搜索行业情报
 * @param {string} industry - 行业名称
 * @param {string} lang - 语言
 * @returns {Promise<object>} 行业情报
 */
async function searchIndustryIntel(industry, lang = 'zh') {
  const query = lang === 'zh'
    ? `${industry}行业现状 市场趋势 竞争格局`
    : `${industry} industry market trends competition`

  const results = await search(query, { lang, maxResults: 5 })

  // 构建情报摘要
  const summary = results.length > 0
    ? results.map(r => `[${r.title}](${r.url}): ${r.snippet}`).join('\n\n')
    : ''

  return {
    industry,
    query,
    results,
    summary,
    searchedAt: new Date().toISOString(),
  }
}

/**
 * T1: 搜索竞争对手信息
 * @param {string} competitor - 竞争对手名称
 * @param {string} lang - 语言
 * @returns {Promise<object>} 竞争对手信息
 */
async function searchCompetitor(competitor, lang = 'zh') {
  const query = lang === 'zh'
    ? `${competitor} 商业模式 经营策略 特色服务`
    : `${competitor} business model strategy services`

  const results = await search(query, { lang, maxResults: 5 })

  return {
    competitor,
    query,
    results,
    searchedAt: new Date().toISOString(),
  }
}

/**
 * T1: 搜索市场趋势
 * @param {string} industry - 行业
 * @param {string} lang - 语言
 * @returns {Promise<object>} 市场趋势
 */
async function searchMarketTrend(industry, lang = 'zh') {
  const query = lang === 'zh'
    ? `${industry}行业 2024 2025 市场趋势 最新动态`
    : `${industry} market trends 2024 2025 latest news`

  const results = await search(query, { lang, maxResults: 5 })

  return {
    industry,
    query,
    results,
    searchedAt: new Date().toISOString(),
  }
}

module.exports = {
  search,
  searchIndustryIntel,
  searchCompetitor,
  searchMarketTrend,
}
