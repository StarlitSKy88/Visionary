/**
 * Market Analyst Agent - 市场分析Agent
 * 分析用户提供的7维度数据，输出市场机会、客户定位、市场趋势和竞争格局
 * 结合人格类型给出个性化市场建议
 */

const ai = require('../lib/ai-service')
const search = require('../lib/search-service')

/**
 * 生成市场分析
 * @param {object} sessionData - 包含7维度答案的session数据
 * @param {object} options - { lang: 'zh'|'en', personality: object }
 * @returns {Promise<object>} MarketAnalysis
 */
async function generate(sessionData, options = {}) {
  const { lang = 'zh', personality = null } = options
  const { dimension_answers, lang: sessionLang } = sessionData

  // 从dimension_answers构建用户数据上下文
  const userData = {}
  for (const ans of dimension_answers || []) {
    if (!ans.skipped) {
      userData[ans.dimension] = ans.answer
    }
  }

  // T1: 如果用户提供了行业关键词，尝试搜索实时行业情报
  let industryIntel = null
  const industryKeyword = extractIndustryKeyword(userData)
  if (industryKeyword && process.env.ENABLE_SEARCH === 'true') {
    try {
      industryIntel = await search.searchIndustryIntel(industryKeyword, lang)
    } catch (e) {
      console.warn('Industry intel search failed:', e)
    }
  }

  const prompt = buildAnalysisPrompt(userData, lang || sessionLang, industryIntel, personality)

  // P2: 量化标注 - 添加置信度和数据来源
  const schema = {
    type: 'object',
    properties: {
      opportunity: {
        type: 'string',
        description: lang === 'zh' ? '基于用户数据的市场机会分析' : 'Market opportunity analysis based on user data',
      },
      opportunity_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      opportunity_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
      target_customer: {
        type: 'string',
        description: lang === 'zh' ? '目标客户群体描述' : 'Target customer segment description',
      },
      target_customer_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      target_customer_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
      market_trend: {
        type: 'string',
        description: lang === 'zh' ? '与用户情况相关的市场趋势' : 'Market trends relevant to user situation',
      },
      market_trend_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      market_trend_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
      competitive_landscape: {
        type: 'string',
        description: lang === 'zh' ? '竞争格局分析' : 'Competitive landscape analysis',
      },
      competitive_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      competitive_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
    },
    required: ['opportunity', 'target_customer', 'market_trend', 'competitive_landscape'],
  }

  const result = await ai.chatJSON([{ role: 'user', content: prompt }], schema, {
    taskType: 'market-analyst',
  })

  return result
}

/**
 * T1: 从用户数据中提取行业关键词
 * @param {object} userData - 用户数据
 * @returns {string|null} 行业关键词
 */
function extractIndustryKeyword(userData) {
  // 从位置/流量信息中提取行业关键词
  const location = userData.location || ''
  const painPoint = userData.pain_point || ''
  const competition = userData.competition || ''

  // 常见行业关键词模式
  const industryPatterns = [
    // 餐饮类
    { pattern: /奶茶|茶饮|饮品|咖啡/i, keyword: '奶茶店' },
    { pattern: /餐厅|饭店|餐馆|餐饮/i, keyword: '餐厅' },
    { pattern: /小吃|炸鸡|汉堡|快餐/i, keyword: '快餐小吃' },
    { pattern: /火锅|麻辣/i, keyword: '火锅' },
    { pattern: /烧烤|烤肉/i, keyword: '烧烤' },
    { pattern: /面馆|拉面|米粉/i, keyword: '面馆' },
    { pattern: /烘焙|蛋糕|面包|甜品/i, keyword: '烘焙店' },
    { pattern: /水果|果切/i, keyword: '水果店' },

    // 零售类
    { pattern: /便利店|超市|小卖部/i, keyword: '便利店' },
    { pattern: /服装|女装|男装|童装/i, keyword: '服装店' },
    { pattern: /鞋|包包|箱包/i, keyword: '鞋包店' },
    { pattern: /化妆品|美妆|护肤/i, keyword: '化妆品店' },
    { pattern: /手机|通讯|数码/i, keyword: '手机店' },
    { pattern: /电器|家电|家具/i, keyword: '电器店' },
    { pattern: /书店|文具|办公/i, keyword: '文具书店' },

    // 服务类
    { pattern: /理发|美发|美容|美甲/i, keyword: '美容美发' },
    { pattern: /按摩|足疗| spa |养生/i, keyword: '按摩养生' },
    { pattern: /洗衣|干洗|洗护/i, keyword: '洗衣店' },
    { pattern: /快递|物流|收发/i, keyword: '快递驿站' },
    { pattern: /培训|教育|辅导/i, keyword: '培训机构' },
    { pattern: /摄影|拍照|冲印/i, keyword: '摄影店' },
    { pattern: /宠物|猫狗|兽/i, keyword: '宠物店' },

    // 医疗健康类
    { pattern: /药店|药房|药品/i, keyword: '药店' },
    { pattern: /诊所|门诊|医疗/i, keyword: '诊所' },

    // 娱乐类
    { pattern: /网吧|电竞|游戏/i, keyword: '网吧' },
    { pattern: /KTV|唱歌|娱乐/i, keyword: 'KTV' },
    { pattern: /健身房|瑜伽|运动/i, keyword: '健身房' },
  ]

  // 合并所有文本进行匹配
  const combinedText = `${location} ${painPoint} ${competition}`

  for (const { pattern, keyword } of industryPatterns) {
    if (pattern.test(combinedText)) {
      return keyword
    }
  }

  return null
}

/**
 * 构建分析提示词
 * @param {object} userData - 用户数据
 * @param {string} lang - 语言
 * @param {object} industryIntel - T1: 搜索的行业情报（可选）
 * @param {object} personality - 人格数据（可选）
 */
function buildAnalysisPrompt(userData, lang, industryIntel = null, personality = null) {
  const t = lang === 'en' ? {
    intro: 'Based on the following user-provided information and real-time industry intelligence, analyze the market:',
    location: 'Store Location',
    scale: 'Business Scale',
    financial: 'Financial Situation',
    competition: 'Competition',
    pain_point: 'Main Pain Point',
    resource: 'Available Resources',
    experience: 'Business Experience',
    industryIntel: 'Real-time Industry Intelligence',
    output: 'Output your analysis in the following JSON format (only JSON, no other text):',
  } : {
    intro: '基于以下用户提供的原始信息和实时行业情报，分析市场：',
    location: '位置/流量',
    scale: '规模',
    financial: '财务状况',
    competition: '竞争情况',
    pain_point: '痛点',
    resource: '资源',
    experience: '经验',
    industryIntel: '实时行业情报',
    output: '请按以下JSON格式输出（只输出JSON，不要有其他文字）：',
  }

  const parts = []

  // 位置/流量
  if (userData.location) {
    parts.push(`${t.location}：${userData.location}`)
  }

  // 规模
  if (userData.scale) {
    parts.push(`${t.scale}：${userData.scale}`)
  }

  // 财务
  if (userData.financial) {
    parts.push(`${t.financial}：${userData.financial}`)
  }

  // 竞争
  if (userData.competition) {
    parts.push(`${t.competition}：${userData.competition}`)
  }

  // 痛点
  if (userData.pain_point) {
    parts.push(`${t.pain_point}：${userData.pain_point}`)
  }

  // 资源（可选）
  if (userData.resource) {
    parts.push(`${t.resource}：${userData.resource}`)
  }

  // 经验（可选）
  if (userData.experience) {
    parts.push(`${t.experience}：${userData.experience}`)
  }

  // T1: 如果有行业情报，添加到提示词中
  if (industryIntel && industryIntel.summary) {
    parts.push(`\n${t.industryIntel}：\n${industryIntel.summary}`)
  }

  // 人格增强：如果有人格数据，结合人格特点给出个性化建议
  if (personality) {
    const personalitySection = lang === 'en'
      ? `\n\nPersonality Type: ${personality.name} (${personality.title})
Suitable for: ${personality.good_for}
Avoid: ${personality.avoid}
Note: When analyzing market opportunities, consider how this personality type can best leverage their strengths.`
      : `\n\n人格类型：${personality.name}（${personality.title}）
适合的赚钱方式：${personality.good_for}
需要避免的：${personality.avoid}
提示：分析市场机会时，请考虑这种人格类型如何发挥自身优势。`
    parts.push(personalitySection)
  }

  // P2: 要求输出置信度和数据来源
  return `${t.intro}\n\n${parts.join('\n')}\n\n${t.output}\n{\n  "opportunity": "...",\n  "opportunity_confidence": 0.8,\n  "opportunity_source": "${lang === 'zh' ? '基于用户提供的[具体来源]' : 'Based on user-provided [source]'}",
  "target_customer": "...",\n  "target_customer_confidence": 0.9,\n  "target_customer_source": "${lang === 'zh' ? '基于用户提供的[位置/规模等]' : 'Based on user-provided [location/scale etc]'}",
  "market_trend": "...",\n  "market_trend_confidence": 0.7,\n  "market_trend_source": "${lang === 'zh' ? '基于用户提供的[财务/竞争等数据]' : 'Based on user-provided [financial/competition data]'}",
  "competitive_landscape": "...",\n  "competitive_confidence": 0.85,\n  "competitive_source": "${lang === 'zh' ? '基于用户提供的[竞争信息]' : 'Based on user-provided [competition info]'}"
}`
}

module.exports = { generate }