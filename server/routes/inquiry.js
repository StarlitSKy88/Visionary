/**
 * Inquiry Routes - Phase 1 追问 API
 *
 * POST /api/inquiry/start - 创建 session
 * POST /api/inquiry/answer - 提交回答
 * GET /api/inquiry/session/:id - 获取 session 状态
 * GET /api/inquiry/coverage/:id - 获取维度覆盖情况
 */

const express = require('express')
const router = express.Router()
const { requiresAuth } = require('../lib/auth')
const inquiryEngine = require('../inquiry-engine')
const db = require('../db')

/**
 * POST /api/inquiry/start
 * 创建新的追问 session
 */
router.post('/start', async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: '未登录' })
    }

    const { lang = 'zh' } = req.body

    // 创建 session
    const session = db.inquirySessions.createSession(userId, lang)
    if (!session) {
      return res.status(500).json({ error: '创建 session 失败' })
    }

    // 获取初始问题
    const state = inquiryEngine.getInquiryState(session.id, lang)

    res.status(201).json({
      sessionId: session.id,
      status: session.status,
      question: state.question,
      round: 0,
      coverage: { covered: [], skipped: [], total: 0 },
    })
  } catch (err) {
    console.error('inquiry/start error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * POST /api/inquiry/stream
 * SSE流式提交回答（显示AI思考过程）
 */
router.post('/stream', async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: '未登录' })
    }

    const { sessionId, dimension, answer, lang = 'zh' } = req.body

    if (!sessionId || !dimension || answer === undefined) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    // 验证 session 属于该用户
    const session = db.inquirySessions.getById(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'session 不存在' })
    }

    // 检查 session 状态
    if (session.status !== 'active') {
      return res.status(400).json({
        error: 'session 已结束',
        status: session.status,
      })
    }

    // 设置SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    const sendThinking = (message) => {
      sendEvent('thinking', { message })
    }

    // E1: 流式思考过程
    sendThinking(lang === 'zh' ? '正在分析您的回答...' : 'Analyzing your answer...')
    await sleep(300)

    sendThinking(lang === 'zh' ? '理解上下文关系...' : 'Understanding context...')
    await sleep(300)

    // 检查是否包含媒体
    const hasMedia = inquiryEngine.containsMedia(answer)
    if (hasMedia) {
      sendEvent('media_rejected', {
        message: lang === 'zh'
          ? '请用文字描述，我会更好地帮助你'
          : 'Please describe in text, I can help you better this way',
      })
      res.end()
      return
    }

    sendThinking(lang === 'zh' ? '检查回答完整性...' : 'Checking answer completeness...')
    await sleep(200)

    // 解析回答
    const parsed = inquiryEngine.parseAnswer(answer, lang)

    if (parsed.clarified) {
      sendThinking(lang === 'zh' ? '需要更具体的说明...' : 'Need more specific details...')
      await sleep(200)
      sendEvent('clarification', {
        dimension,
        message: parsed.clarification,
      })
      res.end()
      return
    }

    sendThinking(lang === 'zh' ? '记录回答并更新状态...' : 'Recording answer and updating state...')
    await sleep(200)

    // 记录回答
    db.inquirySessions.recordAnswer(sessionId, dimension, parsed.answer, parsed.skipped)

    // 检查覆盖情况
    const coverage = db.inquirySessions.getCoverage(sessionId)
    const updatedSession = db.inquirySessions.getById(sessionId)
    const trigger = inquiryEngine.checkTrigger(coverage, updatedSession.round_count)

    sendThinking(lang === 'zh' ? '检查触发条件...' : 'Checking trigger conditions...')
    await sleep(200)

    if (trigger.trigger) {
      sendThinking(lang === 'zh' ? '信息收集完成，准备生成报告...' : 'Information collected, preparing report...')
      await sleep(300)

      // 更新状态为 waiting_payment
      db.inquirySessions.updateStatus(sessionId, 'waiting_payment')

      sendEvent('triggered', {
        reason: trigger.reason,
        coverage,
      })
      res.end()
      return
    }

    sendThinking(lang === 'zh' ? '生成下一个问题...' : 'Generating next question...')
    await sleep(300)

    // 返回下一题
    const nextDimension = inquiryEngine.selectNextDimension(coverage.covered, updatedSession.round_count)

    // 构建上下文
    const context = {}
    const answers = updatedSession.dimension_answers || []
    for (const ans of answers) {
      context[ans.dimension] = ans.answer
    }

    const nextQuestion = inquiryEngine.generateQuestion(nextDimension, context, lang)

    sendEvent('next_question', {
      dimension: nextDimension,
      question: nextQuestion,
      coverage,
      skipped: parsed.skipped,
    })

    res.end()
  } catch (err) {
    console.error('inquiry/stream error:', err)
    res.write(`event: error\ndata: ${JSON.stringify({ error: '服务器错误' })}\n\n`)
    res.end()
  }
})

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * POST /api/inquiry/answer
 * 提交用户回答
 */
router.post('/answer', async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: '未登录' })
    }

    const { sessionId, dimension, answer, lang = 'zh' } = req.body

    if (!sessionId || !dimension || answer === undefined) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    // 验证 session 属于该用户
    const session = db.inquirySessions.getById(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'session 不存在' })
    }

    // 检查 session 状态
    if (session.status !== 'active') {
      return res.status(400).json({
        error: 'session 已结束',
        status: session.status,
      })
    }

    // 处理回答
    const result = inquiryEngine.processAnswer(sessionId, dimension, answer, lang)

    if (result.type === 'media_rejected') {
      return res.status(400).json({
        type: 'media_rejected',
        message: result.message,
      })
    }

    if (result.type === 'clarification') {
      return res.json({
        type: 'clarification',
        dimension: result.dimension,
        message: result.message,
      })
    }

    if (result.type === 'triggered') {
      return res.json({
        type: 'triggered',
        reason: result.reason,
        coverage: result.coverage,
        message: lang === 'zh' ? '信息收集完成，正在准备报告...' : 'Information collected, preparing report...',
      })
    }

    if (result.type === 'next_question') {
      return res.json({
        type: 'next_question',
        dimension: result.dimension,
        question: result.question,
        coverage: result.coverage,
        skipped: result.skipped,
      })
    }

    res.status(500).json({ error: '未知响应类型' })
  } catch (err) {
    console.error('inquiry/answer error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * GET /api/inquiry/session/:id
 * 获取 session 状态
 */
router.get('/session/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10)
    const { lang = 'zh' } = req.query

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: '无效的 session ID' })
    }

    const state = inquiryEngine.getInquiryState(sessionId, lang)
    if (!state) {
      return res.status(404).json({ error: 'session 不存在' })
    }

    res.json(state)
  } catch (err) {
    console.error('inquiry/session error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * GET /api/inquiry/coverage/:id
 * 获取维度覆盖情况
 */
router.get('/coverage/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10)

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: '无效的 session ID' })
    }

    const coverage = db.inquirySessions.getCoverage(sessionId)
    if (!coverage) {
      return res.status(404).json({ error: 'session 不存在' })
    }

    res.json(coverage)
  } catch (err) {
    console.error('inquiry/coverage error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * GET /api/inquiry/previous
 * T2: 获取用户的历史会话（用于数据召回）
 */
router.get('/previous', async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: '未登录' })
    }

    // 获取用户的所有 active session
    const sessions = db.inquirySessions.getActiveByUserId(userId)

    if (sessions.length === 0) {
      return res.json({
        hasPrevious: false,
        sessions: [],
      })
    }

    // 返回可召回的会话信息
    const recallableSessions = sessions
      .filter(s => s.status === 'active' && s.round_count > 0)
      .map(s => ({
        sessionId: s.id,
        roundCount: s.round_count,
        coverage: db.inquirySessions.getCoverage(s.id),
        createdAt: s.created_at,
        lang: s.lang,
      }))

    res.json({
      hasPrevious: recallableSessions.length > 0,
      sessions: recallableSessions,
    })
  } catch (err) {
    console.error('inquiry/previous error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

module.exports = router