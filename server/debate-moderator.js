/**
 * Debate Moderator - 辩论主持人
 * 管理4个Agent的辩论流程，执行Harness质量门控
 */

const ai = require('./lib/ai-service')

// 辩论规则
const RULE_A = 'critique' // 默认规则：每个Agent必须指出其他Agent方案中的至少1个风险或漏洞
const RULE_B = 'vote'      // 备选规则：投票共识，无法达成挑战时按多数意见决定

/**
 * 运行辩论
 * @param {object[]} agents - Agent输出结果数组 [marketAnalyst, strategyPlanner, executionAdvisor, financialAdvisor]
 * @param {object} sessionData - 用户session数据（用于评估）
 * @param {object} options - { lang: 'zh'|'en', maxRounds: number }
 * @returns {Promise<object>} DebateResult { consensus, disagreements, rounds, rule_used }
 */
async function runDebate(agents, sessionData, options = {}) {
  const { lang = 'zh', maxRounds = 5 } = options

  let currentRound = 0
  let currentRule = RULE_A
  let consecutiveFailures = 0

  // 初始Agent输出
  let currentOutputs = [...agents]
  let previousCritiques = []

  while (currentRound < maxRounds) {
    currentRound++

    // 执行一轮辩论
    const roundResult = await executeRound(
      currentOutputs,
      previousCritiques,
      currentRule,
      lang
    )

    // 检查Harness是否通过
    const harnessPassed = await checkHarness(roundResult, sessionData, lang)

    if (harnessPassed) {
      // 找到共识
      return {
        consensus: buildConsensus(roundResult, lang),
        disagreements: roundResult.disagreements || [],
        rounds: currentRound,
        rule_used: currentRule,
        finalOutputs: roundResult,
      }
    }

    // Harness失败，重写
    consecutiveFailures++
    previousCritiques = roundResult.critiques || []

    // 连续2次失败，切换规则
    if (consecutiveFailures >= 2) {
      currentRule = currentRule === RULE_A ? RULE_B : RULE_A
      consecutiveFailures = 0
    }

    // 重写失败的输出
    currentOutputs = await rewriteWithCritiques(currentOutputs, previousCritiques, lang)
  }

  // 达到最大轮次，返回结果（不卡死）
  return {
    consensus: buildConsensus(currentOutputs, lang),
    disagreements: [],
    rounds: currentRound,
    rule_used: currentRule,
    finalOutputs: currentOutputs,
    exhausted: true,
  }
}

/**
 * 执行一轮辩论
 */
async function executeRound(outputs, previousCritiques, rule, lang) {
  const [marketAnalyst, strategyPlanner, executionAdvisor, financialAdvisor] = outputs

  const critiques = []
  const disagreements = []

  if (rule === RULE_A) {
    // 规则A：每个Agent必须指出其他Agent方案中的至少1个风险或漏洞

    // Market Analyst 评价其他3个
    const maCritique = await critiqueAgent(
      'Market Analyst',
      { opportunity: marketAnalyst.opportunity },
      [strategyPlanner, executionAdvisor, financialAdvisor],
      lang
    )
    critiques.push({ agent: 'Market Analyst', ...maCritique })

    // Strategy Planner 评价其他3个
    const spCritique = await critiqueAgent(
      'Strategy Planner',
      strategyPlanner,
      [marketAnalyst, executionAdvisor, financialAdvisor],
      lang
    )
    critiques.push({ agent: 'Strategy Planner', ...spCritique })

    // Execution Advisor 评价其他3个
    const eaCritique = await critiqueAgent(
      'Execution Advisor',
      executionAdvisor,
      [marketAnalyst, strategyPlanner, financialAdvisor],
      lang
    )
    critiques.push({ agent: 'Execution Advisor', ...eaCritique })

    // Financial Advisor 评价其他3个
    const faCritique = await critiqueAgent(
      'Financial Advisor',
      financialAdvisor,
      [marketAnalyst, strategyPlanner, executionAdvisor],
      lang
    )
    critiques.push({ agent: 'Financial Advisor', ...faCritique })

  } else {
    // 规则B：投票共识
    const votes = await collectVotes(outputs, lang)

    // 统计投票，找最多反对的方案
    const voteResults = votes.reduce((acc, v) => {
      if (!acc[v.targetAgent]) {
        acc[v.targetAgent] = {反对: 0, 赞同: 0 }
      }
      acc[v.targetAgent][v.stance]++
      return acc
    }, {})

    // 找出被反对最多的
    for (const [agent, counts] of Object.entries(voteResults)) {
      if (counts.反对 > counts.赞同) {
        disagreements.push(`${agent}方案存在争议`)
      }
    }
  }

  return { critiques, disagreements, outputs }
}

/**
 * Agent评价其他Agent的方案
 */
async function critiqueAgent(agentName, agentOutput, otherAgents, lang) {
  const t = lang === 'en' ? {
    prompt: `${agentName} critique other agents' outputs. Identify at least 1 risk or flaw in each:`,
  } : {
    prompt: `${agentName}评价其他Agent的方案，指出每个方案中至少1个风险或漏洞：`,
  }

  const otherInfo = otherAgents.map((a, i) => {
    const names = ['Market Analyst', 'Strategy Planner', 'Execution Advisor', 'Financial Advisor']
    return `${names[i]}: ${JSON.stringify(a)}`
  }).join('\n')

  const schema = {
    type: 'object',
    properties: {
      critiques: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            target: { type: 'string' },
            risk: { type: 'string' },
            severity: { type: 'string' },
          },
        },
      },
      agreements: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['critiques', 'agreements'],
  }

  try {
    const result = await ai.chatJSON([
      { role: 'user', content: `${t.prompt}\n\n其他Agent输出：\n${otherInfo}` }
    ], schema, { taskType: 'debate-critique' })

    return result
  } catch (e) {
    return { critiques: [], agreements: [] }
  }
}

/**
 * 收集投票
 */
async function collectVotes(outputs, lang) {
  const agentNames = ['Market Analyst', 'Strategy Planner', 'Execution Advisor', 'Financial Advisor']
  const votes = []

  const prompt = lang === 'en'
    ? `Vote on each agent's output: agree or disagree with each. Return JSON array.`
    : `对每个Agent的输出投票：赞同或反对。返回JSON数组。`

  const schema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        targetAgent: { type: 'string' },
        stance: { type: 'string', enum: ['赞同', '反对'] },
        reason: { type: 'string' },
      },
    },
  }

  try {
    const outputsStr = outputs.map((o, i) => `${agentNames[i]}: ${JSON.stringify(o)}`).join('\n')
    const result = await ai.chatJSON([
      { role: 'user', content: `${prompt}\n\n${outputsStr}` }
    ], schema, { taskType: 'debate-vote' })

    return result || []
  } catch (e) {
    return []
  }
}

/**
 * 检查Harness质量门控
 */
async function checkHarness(roundResult, sessionData, lang) {
  const harness = require('./harness/quality-gate')
  return harness.checkAll(roundResult.outputs, sessionData, { lang })
}

/**
 * 根据批评重写输出
 */
async function rewriteWithCritiques(outputs, critiques, lang) {
  // 简化处理：直接返回当前输出，让Agent根据批评自行调整
  // 实际实现中应该让每个Agent根据针对它的批评重写自己的输出
  return outputs
}

/**
 * 构建共识
 */
function buildConsensus(outputs, lang) {
  if (Array.isArray(outputs)) {
    const [ma, sp, ea, fa] = outputs
    return {
      marketAnalysis: ma,
      strategyPlan: sp,
      executionPlan: ea,
      financialPlan: fa,
    }
  }
  return outputs
}

module.exports = { runDebate, RULE_A, RULE_B }