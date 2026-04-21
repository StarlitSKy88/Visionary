/**
 * SBTI Report Generation Service - SBTI报告生成服务
 * 负责在SBTI测试完成后协调4个Agent生成人格增强版报告
 */

const db = require('./db')
const marketAnalyst = require('./agents/market-analyst')
const strategyPlanner = require('./agents/strategy-planner')
const executionAdvisor = require('./agents/execution-advisor')
const financialAdvisor = require('./agents/financial-advisor')
const debateModerator = require('./debate-moderator')
const { getCheckResults } = require('./harness/quality-gate')
const { getPersonalityById } = require('./db/sbti-personalities')

/**
 * 开始生成SBTI报告
 * @param {number} sessionId - SBTI session ID
 * @returns {Promise<object>} 生成结果
 */
async function startGeneration(sessionId) {
  // 获取SBTI session
  const sessions = db.store.queryList(
    'SELECT * FROM sbti_sessions WHERE id = ?',
    [sessionId]
  )

  if (!sessions || sessions.length === 0) {
    throw new Error('SBTI session not found')
  }

  const session = sessions[0]

  if (session.status !== 'completed') {
    throw new Error('SBTI session not completed')
  }

  // 获取人格数据
  const personality = getPersonalityById(session.personality_id)
  if (!personality) {
    throw new Error('Personality not found')
  }

  // 解析生意数据
  const businessData = JSON.parse(session.business_data || '{}')

  // 构建dimension_answers格式（兼容原有Agent）
  const dimension_answers = Object.entries(businessData).map(([dimension, answer]) => ({
    dimension,
    answer,
    skipped: false,
  }))

  // 准备session数据
  const sessionData = {
    dimension_answers,
    lang: session.lang,
    // SBTI专有数据
    sbti_scores: JSON.parse(session.sbti_scores || '{}'),
    personality_id: session.personality_id,
  }

  const lang = session.lang || 'zh'

  try {
    console.log('🧠 开始并行调用4个Agent生成SBTI报告...')
    console.log(`🎭 人格增强模式：${personality.name}（${personality.title}）`)
    console.log(`📊 SBTI分数：D1=${sessionData.sbti_scores.d1} D2=${sessionData.sbti_scores.d2} D3=${sessionData.sbti_scores.d3} D4=${sessionData.sbti_scores.d4} D5=${sessionData.sbti_scores.d5}`)

    // Step 1: 并行调用4个Agent，传递人格数据
    const agentOptions = { lang, personality }

    const [maResult, spResult, eaResult, faResult] = await Promise.all([
      marketAnalyst.generate(sessionData, agentOptions),
      strategyPlanner.generate(sessionData, {}, agentOptions),
      executionAdvisor.generate(sessionData, {}, agentOptions),
      financialAdvisor.generate(sessionData, {}, {}, agentOptions),
    ])

    console.log('✅ Market Analyst 完成')
    console.log('✅ Strategy Planner 完成')
    console.log('✅ Execution Advisor 完成')
    console.log('✅ Financial Advisor 完成')

    const agentsOutput = [maResult, spResult, eaResult, faResult]

    // Step 2: 运行辩论
    console.log('🎯 开始辩论流程...')
    const debateResult = await debateModerator.runDebate(agentsOutput, sessionData, { lang })

    console.log(`✅ 辩论完成，使用规则: ${debateResult.rule_used}, 轮次: ${debateResult.rounds}`)

    // Step 3: Harness验证
    console.log('🔍 开始Harness质量验证...')
    const checkResult = await getCheckResults(debateResult.finalOutputs || agentsOutput, sessionData, { lang })

    console.log(`Harness检查结果:`, checkResult)

    // 构建最终报告
    const finalReport = buildFinalReport(debateResult.finalOutputs || agentsOutput, personality, sessionData)

    return {
      success: true,
      sessionId,
      personality: {
        id: personality.id,
        name: personality.name,
        title: personality.title,
        slogan: personality.slogan,
        good_for: personality.good_for,
        avoid: personality.avoid,
        is_secret: personality.is_secret,
      },
      sbtiScores: sessionData.sbti_scores,
      debateRounds: debateResult.rounds,
      ruleUsed: debateResult.rule_used,
      harnessPassed: checkResult.allPassed,
      checks: checkResult,
      report: finalReport,
    }

  } catch (error) {
    console.error('❌ SBTI报告生成失败:', error)
    throw error
  }
}

/**
 * 构建最终报告（人格增强版）
 */
function buildFinalReport(agentsOutput, personality, sessionData) {
  const [ma, sp, ea, fa] = agentsOutput

  return {
    // 市场分析
    marketAnalysis: {
      ...ma,
      personalityInsight: `作为${personality.name}型老板，您的市场机会在于：${ma.opportunity || ''}`,
      personalityRecommendation: personality.good_for,
    },
    // 策略规划
    strategyPlan: {
      ...sp,
      personalityInsight: `基于您的${personality.name}性格特点，${sp.core_positioning || ''}`,
      personalityRecommendation: personality.good_for,
      personalityWarning: personality.avoid,
    },
    // 执行计划
    executionPlan: {
      ...ea,
      personalityInsight: `${personality.name}型老板的执行优势在于：${ea.quick_wins ? ea.quick_wins[0] : ''}`,
      personalityRecommendation: personality.good_for,
      personalityWarning: personality.avoid,
    },
    // 财务分析
    financialPlan: {
      ...fa,
      personalityInsight: `作为${personality.name}型老板，${fa.investment_estimate || ''}`,
      personalityRecommendation: personality.good_for,
      personalityWarning: personality.avoid,
    },
    // 元数据
    meta: {
      personalityId: personality.id,
      personalityName: personality.name,
      sbtiScores: sessionData.sbti_scores,
      generatedAt: new Date().toISOString(),
      version: '2.0-sbti',
    },
  }
}

module.exports = {
  startGeneration,
}
