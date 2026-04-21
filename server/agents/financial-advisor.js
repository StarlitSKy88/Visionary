/**
 * Financial Advisor Agent - 财务分析Agent
 * 结合用户实际情况，给出投入产出分析
 */

const ai = require('../lib/ai-service')

/**
 * 生成财务分析计划
 * @param {object} sessionData - 7维度答案
 * @param {object} strategyPlan - 策略规划结果
 * @param {object} executionPlan - 执行计划结果
 * @param {object} options - { lang: 'zh'|'en' }
 * @returns {Promise<object>} FinancialPlan
 */
async function generate(sessionData, strategyPlan, executionPlan, options = {}) {
  const { lang = 'zh' } = options
  const { dimension_answers } = sessionData

  // 构建用户数据上下文
  const userData = {}
  for (const ans of dimension_answers || []) {
    if (!ans.skipped) {
      userData[ans.dimension] = ans.answer
    }
  }

  const prompt = buildFinancialPrompt(userData, strategyPlan, executionPlan, lang)

  // P2: 量化标注
  const schema = {
    type: 'object',
    properties: {
      investment_estimate: {
        type: 'string',
        description: lang === 'zh' ? '投资估算（具体金额范围）' : 'Investment estimate (specific amount range)',
      },
      investment_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      investment_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
      ROI_analysis: {
        type: 'string',
        description: lang === 'zh' ? '投资回报分析' : 'ROI analysis',
      },
      ROI_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      ROI_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
      risk_level: {
        type: 'string',
        description: lang === 'zh' ? '风险等级（低/中/高）' : 'Risk level (Low/Medium/High)',
      },
      risk_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      risk_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
      break_even: {
        type: 'string',
        description: lang === 'zh' ? '回本时间估算' : 'Break-even time estimate',
      },
      break_even_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      break_even_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
    },
    required: ['investment_estimate', 'ROI_analysis', 'risk_level', 'break_even'],
  }

  const result = await ai.chatJSON([{ role: 'user', content: prompt }], schema, {
    taskType: 'financial-advisor',
  })

  return result
}

/**
 * 构建财务分析提示词
 */
function buildFinancialPrompt(userData, strategyPlan, executionPlan, lang) {
  const t = lang === 'en' ? {
    intro: 'Provide financial analysis based on user actual situation:',
    userData: 'User Actual Situation',
    strategy: 'Strategy Plan',
    execution: 'Execution Plan',
    requirement: 'All estimates must be based on user-provided financial data, not external benchmarks.',
    output: 'Output in the following JSON format (only JSON, no other text):',
  } : {
    intro: '基于用户实际情况给出财务分析：',
    userData: '用户实际情况',
    strategy: '策略规划',
    execution: '执行计划',
    requirement: '所有估算必须基于用户提供的财务数据，不能用外部基准。',
    output: '请按以下JSON格式输出（只输出JSON，不要有其他文字）：',
  }

  const userInfo = [
    `规模：${userData.scale || '未知'}`,
    `财务状况：${userData.financial || '未知'}`,
    `痛点：${userData.pain_point || '未知'}`,
    `资源：${userData.resource || '未知'}`,
  ].join('\n')

  const strategyInfo = [
    `核心定位：${strategyPlan.core_positioning || '未知'}`,
    `定价策略：${strategyPlan.pricing_strategy || '未知'}`,
  ].join('\n')

  const execInfo = [
    `快速见效：${(executionPlan.quick_wins || []).join('；')}`,
    `执行步骤：${(executionPlan.action_steps || []).join('；')}`,
    `所需资源：${executionPlan.resource_needed || '未知'}`,
  ].join('\n')

  // P2: 输出包含置信度和数据来源
  return `${t.intro}\n\n${t.userData}:\n${userInfo}\n\n${t.strategy}:\n${strategyInfo}\n\n${t.execution}:\n${execInfo}\n\n${t.requirement}\n\n${t.output}\n{
  "investment_estimate": "...",
  "investment_confidence": 0.8,
  "investment_source": "${lang === 'zh' ? '基于用户提供的财务数据' : 'Based on user-provided financial data'}",
  "ROI_analysis": "...",
  "ROI_confidence": 0.75,
  "ROI_source": "${lang === 'zh' ? '基于用户财务和执行计划' : 'Based on user financials and execution plan'}",
  "risk_level": "...",
  "risk_confidence": 0.7,
  "risk_source": "${lang === 'zh' ? '基于用户痛点和竞争情况' : 'Based on user pain points and competition'}",
  "break_even": "...",
  "break_even_confidence": 0.7,
  "break_even_source": "${lang === 'zh' ? '基于用户财务数据估算' : 'Based on user financial estimates'}"
}`
}

module.exports = { generate }