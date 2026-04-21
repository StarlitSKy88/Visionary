/**
 * Report Generation Service - 报告生成服务
 * 负责在支付成功后协调4个Agent生成报告
 */

const db = require('./db')
const marketAnalyst = require('./agents/market-analyst')
const strategyPlanner = require('./agents/strategy-planner')
const executionAdvisor = require('./agents/execution-advisor')
const financialAdvisor = require('./agents/financial-advisor')
const debateModerator = require('./debate-moderator')
const { getCheckResults } = require('./harness/quality-gate')

/**
 * 开始生成报告
 * @param {number} reportId - 报告ID
 * @returns {Promise<object>} 生成结果
 */
async function startGeneration(reportId) {
  const report = db.reports.getById(reportId)
  if (!report) {
    throw new Error('Report not found')
  }

  const session = db.inquirySessions.getById(report.session_id)
  if (!session) {
    throw new Error('Session not found')
  }

  // 准备session数据
  const sessionData = {
    dimension_answers: session.dimension_answers,
    lang: session.lang,
  }

  const lang = session.lang || 'zh'

  try {
    // 更新状态为生成中
    db.reports.updateStatus(reportId, 'generating')

    // Step 1: P1优化 - 并行调用4个Agent（它们都基于相同sessionData，独立生成）
    console.log('🧠 开始并行调用4个Agent生成报告...')

    const [maResult, spResult, eaResult, faResult] = await Promise.all([
      marketAnalyst.generate(sessionData, { lang }),
      strategyPlanner.generate(sessionData, {}, { lang }),  // 空对象作为占位
      executionAdvisor.generate(sessionData, {}, { lang }), // 空对象作为占位
      financialAdvisor.generate(sessionData, {}, {}, { lang }), // 空对象作为占位
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

    // 如果Harness全部通过，使用最终输出；否则使用辩论后的结果
    const finalContent = checkResult.allPassed
      ? buildFinalReport(debateResult.finalOutputs || agentsOutput)
      : buildFinalReport(debateResult.finalOutputs || agentsOutput)

    // Step 4: 保存报告
    db.reports.completeReport(reportId, finalContent)

    console.log('✅ 报告生成完成')

    return {
      success: true,
      reportId,
      debateRounds: debateResult.rounds,
      ruleUsed: debateResult.rule_used,
      harnessPassed: checkResult.allPassed,
      checks: checkResult,
    }

  } catch (error) {
    console.error('❌ 报告生成失败:', error)

    // 更新状态为失败
    db.reports.updateStatus(reportId, 'failed')

    return {
      success: false,
      reportId,
      error: error.message,
    }
  }
}

/**
 * 构建最终报告
 */
function buildFinalReport(agentsOutput) {
  const [ma, sp, ea, fa] = agentsOutput

  return {
    marketAnalysis: ma,
    strategyPlan: sp,
    executionPlan: ea,
    financialPlan: fa,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * 定期检查待生成的报告并处理
 * 这个函数可以由scheduler调用
 */
async function processPendingReports() {
  // 查找状态为 generating 的报告（可能之前失败或中断）
  // 简化处理，实际应该用队列

  // 查找 pending_payment 状态的报告（支付超时的情况）
  const expiredReports = db.reports.getExpiredReportIds()

  for (const reportId of expiredReports) {
    const report = db.reports.getById(reportId)
    if (report && report.status === 'pending_payment') {
      console.log(`⏰ 报告 ${reportId} 支付超时，标记为过期`)
      db.reports.updateStatus(reportId, 'expired')
    }
  }
}

module.exports = {
  startGeneration,
  processPendingReports,
}