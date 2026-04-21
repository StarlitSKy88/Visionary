/**
 * ScopeGuard - 边界控制器
 * 控制追问范围，判断问题是否与报告相关
 */

const ai = require('./lib/ai-service')

// 黑名单行业（硬性拒绝）
// C3: 完善黑名单 - 补充灰色行业
const BLACKLISTED_INDUSTRIES = [
  // 赌博博彩
  '赌博', '博彩', '赌场', 'gambling', '赌钱', '赌徒',
  // 色情相关
  '色情', '成人内容', 'porn', 'adult', '色情直播', 'live streaming adult',
  // 毒品
  '毒品', '吸毒', 'drug', '制毒', '贩毒',
  // 虚拟货币
  '虚拟货币', '加密货币', 'crypto', 'bitcoin', '虚拟币', 'token',
  // 野生动物
  '野生动物', '非法狩猎', 'wildlife', '保护动物',
  // 传销直销
  '传销', '直销', 'pyramid', '微商传销',
  // 电子烟 (C3新增)
  '电子烟', '烟弹', ' vape', 'vape',
  // 无证餐饮 (C3新增)
  '无证餐饮', '黑作坊', '黑餐厅', '无证经营',
  // 催收 (C3新增)
  '催收', '讨债', '上门催收', '暴力催收',
  // 禁售药品 (C3新增)
  '禁售药品', '处方药', '管制药品', '精神类药品',
  // 烟花爆竹
  '烟花爆竹', '黑火药', '爆炸物',
  // 色情赌博游戏
  '色情游戏', '赌博游戏', '博彩软件',
]

// 边界判断结果
const RESULT = {
  IN_SCOPE: 'in_scope',
  OUT_OF_SCOPE: 'out_of_scope',
  NEEDS_CLARIFICATION: 'needs_clarification',
  BLACKLISTED: 'blacklisted',
}

/**
 * 判断行业是否在黑名单
 */
function isBlacklisted(industry) {
  if (!industry) return false
  const lower = industry.toLowerCase()
  return BLACKLISTED_INDUSTRIES.some(
    banned => lower.includes(banned.toLowerCase())
  )
}

/**
 * 判断问题是否在报告范围内
 * @param {string} question - 用户问题
 * @param {object} reportContent - 报告内容
 * @param {object} options - { lang, reportIndustry }
 * @returns {Promise<object>} { result, reason, scope_content }
 */
async function checkScope(question, reportContent, options = {}) {
  const { lang = 'zh', reportIndustry } = options

  // 黑名单行业检查
  const industryKeywords = extractIndustryFromQuestion(question)
  if (industryKeywords && isBlacklisted(industryKeywords)) {
    return {
      result: RESULT.BLACKLISTED,
      reason: lang === 'zh'
        ? '抱歉，这个行业不在服务范围内'
        : 'Sorry, this industry is not within our service scope',
    }
  }

  // Q2: 如果提供了报告行业，检查问题行业是否匹配
  if (reportIndustry) {
    const questionIndustry = extractIndustryFromQuestion(question)
    if (questionIndustry && !isSameIndustry(questionIndustry, reportIndustry)) {
      return {
        result: RESULT.OUT_OF_SCOPE,
        reason: lang === 'zh'
          ? `您的问题涉及"${questionIndustry}"，但您的报告是关于"${reportIndustry}"的。请提问与报告相关的问题。`
          : `Your question is about "${questionIndustry}" but your report is about "${reportIndustry}". Please ask questions related to your report.`,
      }
    }
  }

  // 使用AI判断问题是否与报告相关
  const isRelated = await checkRelevance(question, reportContent, lang)

  if (isRelated.confident && isRelated.related) {
    return {
      result: RESULT.IN_SCOPE,
      reason: '',
    }
  }

  if (isRelated.confident && !isRelated.related) {
    return {
      result: RESULT.OUT_OF_SCOPE,
      reason: lang === 'zh'
        ? '这个问题与你的报告内容无关，我只能帮你解答报告中的问题'
        : 'This question is not related to your report content. I can only help with questions about your report.',
    }
  }

  // 不确定时请求用户澄清
  return {
    result: RESULT.NEEDS_CLARIFICATION,
    reason: lang === 'zh'
      ? '我需要确认一下：你的问题是关于报告中的哪个部分？'
      : 'I need to clarify: which part of your report is your question about?',
    suggestions: isRelated.suggestions || [],
  }
}

/**
 * Q2: 判断两个行业是否相关
 */
function isSameIndustry(industry1, industry2) {
  if (!industry1 || !industry2) return false

  const kw1 = industry1.toLowerCase()
  const kw2 = industry2.toLowerCase()

  // 直接包含
  if (kw1.includes(kw2) || kw2.includes(kw1)) return true

  // 常见相关行业映射
  const relatedIndustries = {
    '餐厅': ['餐饮', '饭店', '小吃', '快餐', '火锅', '烧烤', '咖啡', '茶饮', '奶茶', '烘焙'],
    '便利店': ['超市', '零售', '小卖部', '杂货', '商贸'],
    '服装': ['服饰', '鞋帽', '箱包', '内衣', '童装', '女装', '男装'],
    '美容': ['美发', '美甲', '化妆', '护肤', 'SPA', '养生'],
    '教育': ['培训', '辅导', '家教', '托育', '早教', '艺术'],
    '医疗': ['诊所', '药店', '养生', '保健'],
    '酒店': ['民宿', '客栈', '旅馆', '招待所'],
  }

  for (const [main, related] of Object.entries(relatedIndustries)) {
    const inMain1 = kw1.includes(main) || related.some(r => kw1.includes(r))
    const inMain2 = kw2.includes(main) || related.some(r => kw2.includes(r))
    if (inMain1 && inMain2) return true
  }

  return false
}

/**
 * 从问题中提取行业关键词
 */
function extractIndustryFromQuestion(question) {
  if (!question) return null

  // 简单的关键词提取
  const patterns = [
    /开?(.*?)店/i,
    /做?(.*?)生意/i,
    /(便利店|超市|餐厅|咖啡|服装|美容|培训|教育|医疗|酒店)/i,
  ]

  for (const pattern of patterns) {
    const match = question.match(pattern)
    if (match) return match[1] || match[0]
  }

  return null
}

/**
 * Q2: 从报告内容中识别行业
 * @param {object} reportContent - 报告内容
 * @param {string} lang
 * @returns {Promise<string|null>}
 */
async function classifyIndustryFromReport(reportContent, lang) {
  if (!reportContent) return null

  const t = lang === 'en' ? {
    prompt: 'Classify the business industry from the report. Identify the core business type (e.g., restaurant, convenience store, beauty salon, education training, etc.). Return JSON.',
  } : {
    prompt: '从报告内容中识别行业分类。确定核心业务类型（如：餐厅、便利店、美容院、教育培训等）。返回JSON格式。',
  }

  const schema = {
    type: 'object',
    properties: {
      industry: { type: 'string', description: '行业分类名称' },
      subIndustry: { type: 'string', description: '子行业分类' },
      keywords: { type: 'array', items: { type: 'string' }, description: '行业关键词' },
    },
    required: ['industry'],
  }

  try {
    const reportSummary = summarizeReport(reportContent)
    const result = await ai.chatJSON([
      {
        role: 'user',
        content: `${t.prompt}\n\n报告摘要:\n${reportSummary}`,
      }
    ], schema, { taskType: 'scope-guard-industry' })

    return result.industry || null
  } catch (e) {
    return null
  }
}

/**
 * 检查问题与报告的相关性
 */
async function checkRelevance(question, reportContent, lang) {
  const t = lang === 'en' ? {
    prompt: 'Determine if the user question is related to the report content. Answer in JSON.',
  } : {
    prompt: '判断用户问题是否与报告内容相关。返回JSON格式的回答。',
  }

  const schema = {
    type: 'object',
    properties: {
      related: { type: 'boolean', description: '是否与报告相关' },
      confident: { type: 'boolean', description: '判断是否有信心' },
      suggestions: {
        type: 'array',
        items: { type: 'string' },
        description: '如果不相关，建议用户可以问哪些相关问题',
      },
    },
    required: ['related', 'confident'],
  }

  try {
    const reportSummary = summarizeReport(reportContent)
    const result = await ai.chatJSON([
      {
        role: 'user',
        content: `${t.prompt}\n\n报告摘要:\n${reportSummary}\n\n用户问题:\n${question}`,
      }
    ], schema, { taskType: 'scope-guard' })

    return {
      related: result.related || false,
      confident: result.confident !== false,
      suggestions: result.suggestions || [],
    }
  } catch (e) {
    // 检查失败时，默认需要澄清
    return { related: false, confident: false, suggestions: [] }
  }
}

/**
 * 提取报告摘要（用于判断相关性）
 */
function summarizeReport(reportContent) {
  if (!reportContent) return ''

  // 如果是完整报告对象，提取关键信息
  if (typeof reportContent === 'object') {
    const parts = []

    if (reportContent.marketAnalysis?.opportunity) {
      parts.push(`市场机会: ${reportContent.marketAnalysis.opportunity}`)
    }
    if (reportContent.strategyPlan?.core_positioning) {
      parts.push(`核心定位: ${reportContent.strategyPlan.core_positioning}`)
    }
    if (reportContent.executionPlan?.quick_wins) {
      parts.push(`快速见效: ${reportContent.executionPlan.quick_wins.join(', ')}`)
    }
    if (reportContent.financialPlan?.investment_estimate) {
      parts.push(`投资估算: ${reportContent.financialPlan.investment_estimate}`)
    }

    return parts.join('\n')
  }

  return String(reportContent).slice(0, 500)
}

/**
 * 检查72小时是否已过（Q1: 追问时限改为72小时）
 */
function isExpired(paymentTime, hoursLimit = 72) {
  if (!paymentTime) return true

  const payment = new Date(paymentTime)
  const now = new Date()
  const diffHours = (now - payment) / (1000 * 60 * 60)

  return diffHours > hoursLimit
}

/**
 * 获取剩余时间（小时）（Q1: 默认为72小时）
 */
function getRemainingHours(paymentTime, hoursLimit = 72) {
  if (!paymentTime) return 0

  const payment = new Date(paymentTime)
  const now = new Date()
  const diffHours = (now - payment) / (1000 * 60 * 60)

  return Math.max(0, hoursLimit - diffHours)
}

module.exports = {
  isBlacklisted,
  checkScope,
  extractIndustryFromQuestion,
  classifyIndustryFromReport,
  isSameIndustry,
  isExpired,
  getRemainingHours,
  RESULT,
}