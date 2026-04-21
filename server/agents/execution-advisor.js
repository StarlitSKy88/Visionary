/**
 * Execution Advisor Agent - 执行顾问Agent
 * 将策略转化为1-2步可操作的具体动作
 * 结合人格类型给出个性化执行建议
 */

const ai = require('../lib/ai-service')

/**
 * 生成执行计划
 * @param {object} sessionData - 7维度答案
 * @param {object} strategyPlan - 策略规划结果
 * @param {object} options - { lang: 'zh'|'en', personality: object }
 * @returns {Promise<object>} ExecutionPlan
 */
async function generate(sessionData, strategyPlan, options = {}) {
  const { lang = 'zh', personality = null } = options
  const { dimension_answers } = sessionData

  // 构建用户数据上下文
  const userData = {}
  for (const ans of dimension_answers || []) {
    if (!ans.skipped) {
      userData[ans.dimension] = ans.answer
    }
  }

  const prompt = buildExecutionPrompt(userData, strategyPlan, lang, personality)

  // P2: 量化标注
  const schema = {
    type: 'object',
    properties: {
      quick_wins: {
        type: 'array',
        items: { type: 'string' },
        description: lang === 'zh' ? '快速见效的行动（1-2步可操作）' : 'Quick wins (1-2 actionable steps)',
      },
      quick_wins_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      quick_wins_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
      action_steps: {
        type: 'array',
        items: { type: 'string' },
        description: lang === 'zh' ? '具体执行步骤' : 'Specific action steps',
      },
      action_steps_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      action_steps_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
      timeline: {
        type: 'array',
        items: { type: 'string' },
        description: lang === 'zh' ? '执行时间线' : 'Implementation timeline',
      },
      timeline_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      timeline_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
      resource_needed: {
        type: 'string',
        description: lang === 'zh' ? '所需资源' : 'Resources needed',
      },
      resource_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: lang === 'zh' ? '置信度(0-1)' : 'Confidence level (0-1)',
      },
      resource_source: {
        type: 'string',
        description: lang === 'zh' ? '数据来源说明' : 'Data source explanation',
      },
    },
    required: ['quick_wins', 'action_steps', 'timeline', 'resource_needed'],
  }

  const result = await ai.chatJSON([{ role: 'user', content: prompt }], schema, {
    taskType: 'execution-advisor',
  })

  return result
}

/**
 * 构建执行计划提示词
 * 每个建议必须是1-2步可操作的具体动作
 */
function buildExecutionPrompt(userData, strategyPlan, lang, personality = null) {
  const t = lang === 'en' ? {
    intro: 'Transform the strategy into 1-2 step actionable items based on user actual situation:',
    userData: 'User Actual Situation',
    strategy: 'Strategy Plan',
    requirement: 'Each recommendation must be a specific action that can be described in 1-2 steps.',
    output: 'Output in the following JSON format (only JSON, no other text):',
  } : {
    intro: '将策略转化为基于用户实际情况的1-2步可操作动作：',
    userData: '用户实际情况',
    strategy: '策略规划',
    requirement: '每个建议必须是1-2步可以描述的具体动作，不是模糊概念。',
    output: '请按以下JSON格式输出（只输出JSON，不要有其他文字）：',
  }

  const userInfo = [
    `规模：${userData.scale || '未知'}`,
    `位置：${userData.location || '未知'}`,
    `财务：${userData.financial || '未知'}`,
    `痛点：${userData.pain_point || '未知'}`,
  ].join('\n')

  const strategyInfo = [
    `核心定位：${strategyPlan.core_positioning || '未知'}`,
    `差异化策略：${strategyPlan.differentiation || '未知'}`,
    `定价策略：${strategyPlan.pricing_strategy || '未知'}`,
    `渠道策略：${strategyPlan.channel_strategy || '未知'}`,
  ].join('\n')

  // 人格增强：如果有人格数据，结合人格特点给出个性化执行建议
  let personalitySection = ''
  if (personality) {
    personalitySection = lang === 'en'
      ? `\n\nPersonality Type: ${personality.name} (${personality.title})
Suitable execution approach: ${personality.good_for}
Execution pitfalls to avoid: ${personality.avoid}
Note: Recommend execution methods that suit this personality type.`
      : `\n\n人格类型：${personality.name}（${personality.title}）
适合的执行方式：${personality.good_for}
需要避免的执行陷阱：${personality.avoid}
提示：请推荐适合此人格类型的执行方式。`
  }

  // P2: 输出包含置信度和数据来源
  return `${t.intro}\n\n${t.userData}:\n${userInfo}\n\n${t.strategy}:\n${strategyInfo}${personalitySection}\n\n${t.requirement}\n\n${t.output}\n{
  "quick_wins": ["...（具体1-2步动作）", "..."],
  "quick_wins_confidence": 0.85,
  "quick_wins_source": "${lang === 'zh' ? '基于用户痛点和资源' : 'Based on user pain points and resources'}",
  "action_steps": ["步骤1：...", "步骤2：...", "步骤3：..."],
  "action_steps_confidence": 0.8,
  "action_steps_source": "${lang === 'zh' ? '基于策略规划和用户规模' : 'Based on strategy and user scale'}",
  "timeline": ["第1周：...", "第2周：...", "第1个月：..."],
  "timeline_confidence": 0.75,
  "timeline_source": "${lang === 'zh' ? '基于行业经验和用户实际情况' : 'Based on industry experience and user situation'}",
  "resource_needed": "...",
  "resource_confidence": 0.8,
  "resource_source": "${lang === 'zh' ? '基于用户资源描述' : 'Based on user resource description'}"
}`
}

module.exports = { generate }