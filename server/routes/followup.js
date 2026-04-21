/**
 * Followup Routes - Phase 3 报告追问
 *
 * GET /api/followup/:reportId/status - 获取追问状态
 * POST /api/followup/ask - 提交追问
 */

const express = require('express')
const router = express.Router()
const { requiresAuth } = require('../lib/auth')
const db = require('../db')
const scopeGuard = require('../scope-guard')
const ai = require('../lib/ai-service')

/**
 * GET /api/followup/:reportId/status
 * 获取追问状态（Q1: 72小时时限+10次限制）
 */
router.get('/:reportId/status', async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: '未登录' })
    }

    const reportId = parseInt(req.params.reportId, 10)
    if (isNaN(reportId)) {
      return res.status(400).json({ error: '无效的报告ID' })
    }

    const report = db.reports.getById(reportId)
    if (!report) {
      return res.status(404).json({ error: '报告不存在' })
    }

    // 验证用户身份
    const session = db.inquirySessions.getById(report.session_id)
    if (!session || session.user_id !== userId) {
      return res.status(403).json({ error: '无权查看此报告' })
    }

    // Q1: 计算剩余时间（从报告完成时间开始72小时）
    const paymentTime = report.created_at
    const remainingHours = scopeGuard.getRemainingHours(paymentTime, FOLLOWUP_HOURS_LIMIT)

    // Q1: 获取追问次数
    const followupCount = db.reports.getFollowupCount(reportId)
    const remainingQueries = Math.max(0, FOLLOWUP_QUERY_LIMIT - followupCount)

    res.json({
      reportId,
      remainingHours,
      remainingQueries,
      totalQueries: FOLLOWUP_QUERY_LIMIT,
      followupCount,
      status: remainingHours > 0 && remainingQueries > 0 ? 'active' : 'expired',
    })
  } catch (err) {
    console.error('followup/status error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * POST /api/followup/ask
 * 提交追问（Q1: 72h+10次限制）
 */
router.post('/ask', async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: '未登录' })
    }

    const { reportId, question, lang = 'zh' } = req.body

    if (!reportId || !question) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    // 获取报告
    const report = db.reports.getById(reportId)
    if (!report) {
      return res.status(404).json({ error: '报告不存在' })
    }

    // 验证用户身份
    const session = db.inquirySessions.getById(report.session_id)
    if (!session || session.user_id !== userId) {
      return res.status(403).json({ error: '无权操作此报告' })
    }

    // Q1: 检查时间是否过期（72小时）
    const remainingHours = scopeGuard.getRemainingHours(report.created_at, FOLLOWUP_HOURS_LIMIT)
    if (remainingHours <= 0) {
      return res.json({
        result: 'expired',
        reason: lang === 'zh'
          ? '您的72小时追问时限已过'
          : 'Your 72-hour follow-up window has expired',
        reasonType: 'time_expired',
      })
    }

    // Q1: 检查追问次数是否用完（10次）
    const followupCount = db.reports.getFollowupCount(reportId)
    if (followupCount >= FOLLOWUP_QUERY_LIMIT) {
      return res.json({
        result: 'expired',
        reason: lang === 'zh'
          ? '您的10次追问机会已用完'
          : 'You have used all 10 follow-up queries',
        reasonType: 'query_limit',
      })
    }

    // Q2: 先识别报告行业
    const reportIndustry = await scopeGuard.classifyIndustryFromReport(report.decryptedContent, lang)

    // 检查ScopeGuard（传入报告行业以进行行业匹配检查）
    const scopeResult = await scopeGuard.checkScope(question, report.decryptedContent, { lang, reportIndustry })

    if (scopeResult.result === scopeGuard.RESULT.BLACKLISTED) {
      return res.json({
        result: 'blacklisted',
        reason: scopeResult.reason,
      })
    }

    if (scopeResult.result === scopeGuard.RESULT.OUT_OF_SCOPE) {
      return res.json({
        result: 'out_of_scope',
        reason: scopeResult.reason,
      })
    }

    if (scopeResult.result === scopeGuard.RESULT.NEEDS_CLARIFICATION) {
      return res.json({
        result: 'needs_clarification',
        reason: scopeResult.reason,
        suggestions: scopeResult.suggestions || [],
      })
    }

    // Q1: 范围内的问题，调用AI回答，并增加追问次数
    const prompt = buildFollowupPrompt(question, report.decryptedContent, lang)

    const response = await ai.chat([
      { role: 'user', content: prompt }
    ], { taskType: 'followup' })

    // Q1: 增加追问次数
    const newCount = db.reports.incrementFollowupCount(reportId)
    const newRemainingQueries = Math.max(0, FOLLOWUP_QUERY_LIMIT - newCount)

    res.json({
      result: 'success',
      response,
      remainingQueries: newRemainingQueries,
      totalQueries: FOLLOWUP_QUERY_LIMIT,
    })
  } catch (err) {
    console.error('followup/ask error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * 构建追问提示词
 */
function buildFollowupPrompt(question, reportContent, lang) {
  const t = lang === 'en' ? {
    intro: 'Answer the user question based ONLY on the report content. Do not add external information.',
    scope: 'You can only answer questions related to the report below.',
    report: 'Report Content',
    question: 'User Question',
    rule: 'If the question is not related to the report, politely decline.',
  } : {
    intro: '仅根据报告内容回答用户问题，不要补充外部信息。',
    scope: '您只能回答与以下报告相关的问题。',
    report: '报告内容',
    question: '用户问题',
    rule: '如果问题与报告无关，请礼貌拒绝。',
  }

  const reportSummary = reportContent
    ? JSON.stringify(reportContent, null, 2)
    : '报告内容不可用'

  return `${t.intro}\n\n${t.scope}\n\n${t.report}:\n${reportSummary}\n\n${t.question}:\n${question}\n\n${t.rule}`
}

module.exports = router