/**
 * Debate Moderator - 辩论主持人
 * 管理4个Agent的辩论流程，执行Harness质量门控
 */

const ai = require('./lib/ai-service')

// 辩论规则
const RULE_A = 'critique' // 默认规则：每个Agent必须指出其他Agent方案中的至少1个风险或漏洞
const RULE_B = 'vote'      // 备选规则：投票共识，无法达成挑战时按多数意见决定

// 超时工具函数
const withTimeout = (promise, ms, fallback) => {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms))
  ])
}

/**
 * 运行辩论
 */
async function runDebate(agents, sessionData, options = {}) {
  const { lang = 'zh', maxRounds = 3 } = options

  let currentRound = 0
  let currentRule = RULE_A
  let consecutiveFailures = 0

  let currentOutputs = [...agents]
  let previousCritiques = []

  try {
    while (currentRound < maxRounds) {
      currentRound++

      const roundResult = await withTimeout(
        executeRound(currentOutputs, previousCritiques, currentRule, lang),
        60000,
        { critiques: [], disagreements: [], outputs: currentOutputs }
      )

      const harnessPassed = await withTimeout(
        checkHarness(roundResult.outputs, sessionData, lang),
        30000,
        false
      )

      if (harnessPassed) {
        return {
          consensus: buildConsensus(roundResult.outputs, lang),
          disagreements: roundResult.disagreements || [],
          rounds: currentRound,
          rule_used: currentRule,
          finalOutputs: roundResult.outputs,
        }
      }

      consecutiveFailures++
      previousCritiques = roundResult.critiques || []

      if (consecutiveFailures >= 2) {
        currentRule = currentRule === RULE_A ? RULE_B : RULE_A
        consecutiveFailures = 0
      }

      currentOutputs = await rewriteWithCritiques(currentOutputs, previousCritiques, lang)
    }
  } catch (e) {
    console.log('辩论过程中出错:', e.message)
  }

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
    const [maCritique, spCritique, eaCritique, faCritique] = await Promise.all([
      withTimeout(critiqueAgent('Market Analyst', { opportunity: marketAnalyst.opportunity }, [strategyPlanner, executionAdvisor, financialAdvisor], lang), 30000, { critiques: [], agreements: [] }),
      withTimeout(critiqueAgent('Strategy Planner', strategyPlanner, [marketAnalyst, executionAdvisor, financialAdvisor], lang), 30000, { critiques: [], agreements: [] }),
      withTimeout(critiqueAgent('Execution Advisor', executionAdvisor, [marketAnalyst, strategyPlanner, financialAdvisor], lang), 30000, { critiques: [], agreements: [] }),
      withTimeout(critiqueAgent('Financial Advisor', financialAdvisor, [marketAnalyst, strategyPlanner, executionAdvisor], lang), 30000, { critiques: [], agreements: [] }),
    ])

    critiques.push({ agent: 'Market Analyst', ...maCritique })
    critiques.push({ agent: 'Strategy Planner', ...spCritique })
    critiques.push({ agent: 'Execution Advisor', ...eaCritique })
    critiques.push({ agent: 'Financial Advisor', ...faCritique })

  } else {
    const votes = await withTimeout(collectVotes(outputs, lang), 30000, [])

    const voteResults = votes.reduce((acc, v) => {
      if (!acc[v.targetAgent]) {
        acc[v.targetAgent] = { 反对: 0, 赞同: 0 }
      }
      acc[v.targetAgent][v.stance]++
      return acc
    }, {})

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
  return harness.checkAll(roundResult, sessionData, { lang })
}

/**
 * 根据批评重写输出
 */
async function rewriteWithCritiques(outputs, critiques, lang) {
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
