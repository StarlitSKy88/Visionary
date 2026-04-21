/**
 * Harness Quality Gate - 质量门控
 * 4项检查，全过才算合格
 */

const ai = require('../lib/ai-service')

// 检查项目
const CHECKS = {
  FACT_SCOPE: 'fact_scope',        // 输出引用的数据必须在用户回答中
  EXECUTABILITY: 'executability',   // 建议必须1-2步可描述
  PRIORITY_BASIS: 'priority_basis', // 优先级必须与用户实际情况有逻辑关联
  RISK_ASSESSMENT: 'risk_assessment', // 必须列出每个建议的潜在风险和应对思路
}

/**
 * 检查所有4项
 * @param {object[]} outputs - Agent输出数组
 * @param {object} sessionData - 用户session数据
 * @param {object} options - { lang }
 * @returns {Promise<boolean>} 是否全部通过
 */
async function checkAll(outputs, sessionData, options = {}) {
  const { lang = 'zh' } = options

  // 提取用户数据
  const userData = {}
  for (const ans of sessionData.dimension_answers || []) {
    if (!ans.skipped) {
      userData[ans.dimension] = ans.answer
    }
  }

  // 4项检查
  const results = await Promise.all([
    checkFactScope(outputs, userData, lang),
    checkExecutability(outputs, lang),
    checkPriorityBasis(outputs, userData, lang),
    checkRiskAssessment(outputs, lang),
  ])

  // 全部通过才算合格
  return results.every(r => r.passed)
}

/**
 * 获取检查结果详情（用于调试/显示）
 */
async function getCheckResults(outputs, sessionData, options = {}) {
  const { lang = 'zh' } = options

  const userData = {}
  for (const ans of sessionData.dimension_answers || []) {
    if (!ans.skipped) {
      userData[ans.dimension] = ans.answer
    }
  }

  const results = await Promise.all([
    checkFactScope(outputs, userData, lang),
    checkExecutability(outputs, lang),
    checkPriorityBasis(outputs, userData, lang),
    checkRiskAssessment(outputs, lang),
  ])

  return {
    fact_scope: results[0],
    executability: results[1],
    priority_basis: results[2],
    risk_assessment: results[3],
    allPassed: results.every(r => r.passed),
  }
}

/**
 * 检查1: Fact scope - 输出引用的数据必须在用户回答中
 */
async function checkFactScope(outputs, userData, lang) {
  const t = lang === 'en' ? {
    prompt: 'Check if outputs cite only user-provided data. Identify any external data used without clear attribution.',
    external: 'External data used without user attribution',
    ok: 'All data citations are from user input',
  } : {
    prompt: '检查输出是否只引用用户提供的原始数据。如果引用了外部数据（如"行业数据"、"通常来说"等）但没有标注来源，标记为失败。',
    external: '引用了未标注来源的外部数据',
    ok: '所有引用均来自用户输入数据',
  }

  const outputText = outputs.map((o, i) => {
    const names = ['Market Analyst', 'Strategy Planner', 'Execution Advisor', 'Financial Advisor']
    return `${names[i]}: ${JSON.stringify(o)}`
  }).join('\n\n')

  const userDataStr = Object.entries(userData).map(([k, v]) => `${k}: ${v}`).join('\n')

  const schema = {
    type: 'object',
    properties: {
      passed: { type: 'boolean' },
      issues: {
        type: 'array',
        items: { type: 'string' },
      },
      details: { type: 'string' },
    },
    required: ['passed', 'issues'],
  }

  try {
    const result = await ai.chatJSON([
      {
        role: 'user',
        content: `${t.prompt}\n\n用户原始数据:\n${userDataStr}\n\nAgent输出:\n${outputText}`,
      }
    ], schema, { taskType: 'harness-fact-scope' })

    return {
      check: CHECKS.FACT_SCOPE,
      passed: result.passed !== false,
      issues: result.issues || [],
      details: result.details || '',
    }
  } catch (e) {
    return { check: CHECKS.FACT_SCOPE, passed: false, issues: ['检查失败'], details: e.message }
  }
}

/**
 * 检查2: Executability - 建议必须1-2步可描述
 */
async function checkExecutability(outputs, lang) {
  const t = lang === 'en' ? {
    prompt: 'Check if all recommendations are specific enough to be executed in 1-2 steps. Vague suggestions like "improve service quality" fail.',
    vague: 'Vague recommendations that lack specific action steps',
    ok: 'All recommendations have specific actionable steps',
  } : {
    prompt: '检查所有建议是否足够具体，可以1-2步执行。像"提升服务质量"、"加强管理"这种模糊描述不合格。',
    vague: '模糊的建议，缺乏具体执行步骤',
    ok: '所有建议都有具体可操作的步骤',
  }

  const outputText = outputs.map((o, i) => {
    const names = ['Market Analyst', 'Strategy Planner', 'Execution Advisor', 'Financial Advisor']
    return `${names[i]}: ${JSON.stringify(o)}`
  }).join('\n\n')

  const schema = {
    type: 'object',
    properties: {
      passed: { type: 'boolean' },
      issues: {
        type: 'array',
        items: { type: 'string' },
      },
      details: { type: 'string' },
    },
    required: ['passed', 'issues'],
  }

  try {
    const result = await ai.chatJSON([
      { role: 'user', content: `${t.prompt}\n\nAgent输出:\n${outputText}` }
    ], schema, { taskType: 'harness-executability' })

    return {
      check: CHECKS.EXECUTABILITY,
      passed: result.passed !== false,
      issues: result.issues || [],
      details: result.details || '',
    }
  } catch (e) {
    return { check: CHECKS.EXECUTABILITY, passed: false, issues: ['检查失败'], details: e.message }
  }
}

/**
 * 检查3: Priority basis - 优先级必须与用户实际情况有逻辑关联
 */
async function checkPriorityBasis(outputs, userData, lang) {
  const t = lang === 'en' ? {
    prompt: 'Check if priorities are logically connected to user actual situation (scale, financial situation, resources). "High priority because user is small scale" is good.',
    disconnected: 'Priorities disconnected from user actual situation',
    ok: 'All priorities are logically connected to user situation',
  } : {
    prompt: '检查优先级是否与用户实际情况（规模、财务状况、资源）有逻辑关联。比如"因为用户是小规模，所以应该先做XXX"是合格的。',
    disconnected: '优先级与用户实际情况无逻辑关联',
    ok: '所有优先级都与用户情况有逻辑关联',
  }

  const outputText = outputs.map((o, i) => {
    const names = ['Market Analyst', 'Strategy Planner', 'Execution Advisor', 'Financial Advisor']
    return `${names[i]}: ${JSON.stringify(o)}`
  }).join('\n\n')

  const userDataStr = Object.entries(userData).map(([k, v]) => `${k}: ${v}`).join('\n')

  const schema = {
    type: 'object',
    properties: {
      passed: { type: 'boolean' },
      issues: {
        type: 'array',
        items: { type: 'string' },
      },
      details: { type: 'string' },
    },
    required: ['passed', 'issues'],
  }

  try {
    const result = await ai.chatJSON([
      {
        role: 'user',
        content: `${t.prompt}\n\n用户实际情况:\n${userDataStr}\n\nAgent输出:\n${outputText}`,
      }
    ], schema, { taskType: 'harness-priority' })

    return {
      check: CHECKS.PRIORITY_BASIS,
      passed: result.passed !== false,
      issues: result.issues || [],
      details: result.details || '',
    }
  } catch (e) {
    return { check: CHECKS.PRIORITY_BASIS, passed: false, issues: ['检查失败'], details: e.message }
  }
}

/**
 * 检查4: Risk assessment - 必须列出每个建议的潜在风险和应对思路
 */
async function checkRiskAssessment(outputs, lang) {
  const t = lang === 'en' ? {
    prompt: 'Check if each recommendation includes potential risks and countermeasures. "Do X. Risk: Y. Mitigation: Z" is good.',
    missing: 'Recommendations missing risk assessment',
    ok: 'All recommendations include risk assessment and countermeasures',
  } : {
    prompt: '检查每个建议是否包含潜在风险和应对思路。"做X。风险Y。对策Z"是合格的。缺少风险评估的方案不合格。',
    missing: '建议缺少风险评估',
    ok: '所有建议都包含风险评估和应对思路',
  }

  const outputText = outputs.map((o, i) => {
    const names = ['Market Analyst', 'Strategy Planner', 'Execution Advisor', 'Financial Advisor']
    return `${names[i]}: ${JSON.stringify(o)}`
  }).join('\n\n')

  const schema = {
    type: 'object',
    properties: {
      passed: { type: 'boolean' },
      issues: {
        type: 'array',
        items: { type: 'string' },
      },
      details: { type: 'string' },
    },
    required: ['passed', 'issues'],
  }

  try {
    const result = await ai.chatJSON([
      { role: 'user', content: `${t.prompt}\n\nAgent输出:\n${outputText}` }
    ], schema, { taskType: 'harness-risk' })

    return {
      check: CHECKS.RISK_ASSESSMENT,
      passed: result.passed !== false,
      issues: result.issues || [],
      details: result.details || '',
    }
  } catch (e) {
    return { check: CHECKS.RISK_ASSESSMENT, passed: false, issues: ['检查失败'], details: e.message }
  }
}

module.exports = {
  checkAll,
  getCheckResults,
  CHECKS,
}