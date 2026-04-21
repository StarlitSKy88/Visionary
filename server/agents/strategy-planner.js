/**
 * Strategy Planner Agent - 策略规划Agent
 * 基于市场分析结果，制定差异化竞争策略
 */

const ai = require('../lib/ai-service')

/**
 * 生成策略规划
 * @param {object} sessionData - 7维度答案
 * @param {object} marketAnalysis - 市场分析结果
 * @param {object} options - { lang: 'zh'|'en' }
 * @returns {Promise<object>} StrategyPlan
 */
async function generate(sessionData, marketAnalysis, options = {}) {
  const { lang = 'zh' } = options
  const { dimension_answers } = sessionData

  // 从dimension_answers构建用户数据上下文
  const userData = {}
  for (const ans of dimension_answers || []) {
    if (!ans.skipped) {
      userData[ans.dimension] = ans.answer
    }
  }

  const prompt = buildStrategyPrompt(userData, marketAnalysis, lang)

  // P2: 量化标注
  const schema = {
    type: 'object',
    properties: {
      core_positioning: {
        type: 'string',
        description: lang === 'zh' ? '核心市场定位' : 'Core market positioning',
      },
      core_positioning_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      core_positioning_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
      differentiation: {
        type: 'string',
        description: lang === 'zh' ? '差异化竞争策略' : 'Differentiation strategy',
      },
      differentiation_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      differentiation_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
      pricing_strategy: {
        type: 'string',
        description: lang === 'zh' ? '定价策略建议' : 'Pricing strategy recommendations',
      },
      pricing_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      pricing_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
      channel_strategy: {
        type: 'string',
        description: lang === 'zh' ? '渠道策略建议' : 'Channel strategy recommendations',
      },
      channel_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      channel_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
    },
    required: ['core_positioning', 'differentiation', 'pricing_strategy', 'channel_strategy'],
  }

  const result = await ai.chatJSON([{ role: 'user', content: prompt }], schema, {
    taskType: 'strategy-planner',
  })

  return result
}

/**
 * 构建策略规划提示词
 */
function buildStrategyPrompt(userData, marketAnalysis, lang) {
  const t = lang === 'en' ? {
    intro: 'Based on the user business data and market analysis, formulate a differentiated strategy:',
    userData: 'User Business Data',
    marketAnalysis: 'Market Analysis',
    output: 'Output in the following JSON format (only JSON, no other text):',
  } : {
    intro: '根据用户商业数据和市场分析结果，制定差异化竞争策略：',
    userData: '用户商业数据',
    marketAnalysis: '市场分析结果',
    output: '请按以下JSON格式输出（只输出JSON，不要有其他文字）：',
  }

  const userInfo = [
    `位置/流量：${userData.location || '未知'}`,
    `规模：${userData.scale || '未知'}`,
    `财务状况：${userData.financial || '未知'}`,
    `竞争情况：${userData.competition || '未知'}`,
    `痛点：${userData.pain_point || '未知'}`,
  ].join('\n')

  const marketInfo = [
    `市场机会：${marketAnalysis.opportunity || '未知'}`,
    `目标客户：${marketAnalysis.target_customer || '未知'}`,
    `市场趋势：${marketAnalysis.market_trend || '未知'}`,
    `竞争格局：${marketAnalysis.competitive_landscape || '未知'}`,
  ].join('\n')

  // P2: 输出包含置信度和数据来源
  return `${t.intro}\n\n${t.userData}:\n${userInfo}\n\n${t.marketAnalysis}:\n${marketInfo}\n\n${t.output}\n{
  "core_positioning": "...",
  "core_positioning_confidence": 0.8,
  "core_positioning_source": "${lang === 'zh' ? '基于用户数据和竞争分析' : 'Based on user data and competition analysis'}",
  "differentiation": "...",
  "differentiation_confidence": 0.75,
  "differentiation_source": "${lang === 'zh' ? '基于市场机会分析' : 'Based on market opportunity analysis'}",
  "pricing_strategy": "...",
  "pricing_confidence": 0.7,
  "pricing_source": "${lang === 'zh' ? '基于用户财务数据' : 'Based on user financial data'}",
  "channel_strategy": "...",
  "channel_confidence": 0.7,
  "channel_source": "${lang === 'zh' ? '基于用户资源情况' : 'Based on user resources'}"
}`
}

module.exports = { generate }