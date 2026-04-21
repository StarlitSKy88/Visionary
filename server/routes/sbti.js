/**
 * SBTI Routes - Phase 1 SBTI 测试 API (无登录版本)
 *
 * POST /api/sbti/start - 创建 SBTI 测试 session
 * POST /api/sbti/answer - 提交某道题的答案
 * POST /api/sbti/complete - 完成24题，计算人格
 * GET /api/sbti/session/:id - 获取 session 状态
 * GET /api/sbti/status/:shareCode - 获取分享状态
 * POST /api/sbti/share/open - 记录分享打开
 * GET /api/sbti/report/:sessionId - 获取报告（检查是否解锁）
 * POST /api/sbti/generate - 触发报告生成
 */

const express = require('express')
const router = express.Router()
const { getQuestionnaire, mapAnswersToSBTIDimensions, mapAnswersToBusinessDimensions, calculateSBTIScores } = require('../sbti-questionnaire')
const { getPersonalityById, matchPersonality, detectSecretPersonality } = require('../db/sbti-personalities')
const { generateCardWithAllStyles } = require('../sbti-card-generator')
const { generateShareCode, recordShareOpen, getShareStatus, isReportUnlocked, generateShareUrl } = require('./sbti-share')
const db = require('../db')
const { startGeneration } = require('../sbti-report-generator')

/**
 * POST /api/sbti/start
 * 创建 SBTI 测试 session（无需登录）
 */
router.post('/start', async (req, res) => {
  try {
    const { lang = 'zh', deviceId } = req.body

    // 创建 SBTI session（允许匿名，device_id 可选）
    const shareCode = generateShareCode()
    db.store.run(
      `INSERT INTO sbti_sessions (device_id, lang, status, current_question, answers, share_code)
       VALUES (?, ?, 'active', 0, '[]', ?)`,
      [deviceId || null, lang, shareCode]
    )

    const sessionId = db.store.lastInsertId()

    // 获取第一题
    const questionnaire = getQuestionnaire()

    res.status(201).json({
      sessionId,
      status: 'active',
      shareCode,
      shareUrl: generateShareUrl(shareCode),
      currentQuestion: 0,
      totalQuestions: 24,
      question: {
        id: questionnaire[0].id,
        question: lang === 'zh' ? questionnaire[0].question : questionnaire[0].question_en,
        options: questionnaire[0].options.map(o => ({
          key: o.key,
          text: lang === 'zh' ? o.text : o.text_en,
        })),
      },
    })
  } catch (err) {
    console.error('sbti/start error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * POST /api/sbti/answer
 * 提交某道题的答案（无需登录）
 */
router.post('/answer', async (req, res) => {
  try {
    const { sessionId, questionId, answer } = req.body

    if (!sessionId || !questionId || !answer) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    // 验证 session 存在
    const session = db.store.queryList(
      'SELECT * FROM sbti_sessions WHERE id = ?',
      [sessionId]
    )

    if (!session || session.length === 0) {
      return res.status(404).json({ error: 'session 不存在' })
    }

    const sbtiSession = session[0]

    // 检查 session 状态
    if (sbtiSession.status !== 'active') {
      return res.status(400).json({
        error: 'session 已结束',
        status: sbtiSession.status,
      })
    }

    // 更新答案
    const currentAnswers = JSON.parse(sbtiSession.answers || '[]')
    const existingIndex = currentAnswers.findIndex(a => a.questionId === questionId)

    if (existingIndex >= 0) {
      currentAnswers[existingIndex] = { questionId, answer }
    } else {
      currentAnswers.push({ questionId, answer })
    }

    // 更新当前题号
    const nextQuestionId = questionId + 1

    db.store.run(
      'UPDATE sbti_sessions SET current_question = ?, answers = ?, updated_at = datetime("now") WHERE id = ?',
      [nextQuestionId, JSON.stringify(currentAnswers), sessionId]
    )

    // 检查是否完成
    if (nextQuestionId >= 24) {
      return res.json({
        completed: true,
        nextQuestion: null,
      })
    }

    // 返回下一题
    const questionnaire = getQuestionnaire()
    const nextQuestion = questionnaire.find(q => q.id === nextQuestionId)

    if (!nextQuestion) {
      return res.status(500).json({ error: '题目不存在' })
    }

    const lang = sbtiSession.lang || 'zh'

    res.json({
      completed: false,
      currentQuestion: nextQuestionId,
      question: {
        id: nextQuestion.id,
        question: lang === 'zh' ? nextQuestion.question : nextQuestion.question_en,
        options: nextQuestion.options.map(o => ({
          key: o.key,
          text: lang === 'zh' ? o.text : o.text_en,
        })),
      },
    })
  } catch (err) {
    console.error('sbti/answer error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * POST /api/sbti/complete
 * 完成24题，计算人格（无需登录）
 */
router.post('/complete', async (req, res) => {
  try {
    const { sessionId } = req.body

    if (!sessionId) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    // 验证 session 存在
    const session = db.store.queryList(
      'SELECT * FROM sbti_sessions WHERE id = ?',
      [sessionId]
    )

    if (!session || session.length === 0) {
      return res.status(404).json({ error: 'session 不存在' })
    }

    const sbtiSession = session[0]

    // 获取答案
    const answers = JSON.parse(sbtiSession.answers || '[]')
    const answerKeys = answers.map(a => a.answer)

    // 计算 SBTI 分数
    const sbtiScores = calculateSBTIScores(answers)

    // 检测隐藏款
    const secretPersonality = detectSecretPersonality(answerKeys, sbtiScores)

    // 匹配人格
    const matchedPersonality = secretPersonality || matchPersonality(sbtiScores)

    // 生成生意数据
    const businessData = mapAnswersToBusinessDimensions(answers)

    // 生成卡片
    const card = generateCardWithAllStyles(matchedPersonality, { businessData })

    // 更新 session
    db.store.run(
      `UPDATE sbti_sessions
       SET status = 'completed',
           personality_id = ?,
           sbti_scores = ?,
           business_data = ?,
           completed_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        matchedPersonality.id,
        JSON.stringify(sbtiScores),
        JSON.stringify(businessData),
        sessionId,
      ]
    )

    // 保存人格结果
    db.store.run(
      `INSERT INTO personality_results (session_id, device_id, personality_id, personality_data, sbti_scores, business_data)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        sbtiSession.device_id,
        matchedPersonality.id,
        JSON.stringify(matchedPersonality),
        JSON.stringify(sbtiScores),
        JSON.stringify(businessData),
      ]
    )

    res.json({
      personality: {
        id: matchedPersonality.id,
        name: matchedPersonality.name,
        title: matchedPersonality.title,
        slogan: matchedPersonality.slogan,
        is_secret: matchedPersonality.is_secret || false,
      },
      card,
      sbtiScores,
      businessData,
      shareCode: sbtiSession.share_code,
      shareUrl: generateShareUrl(sbtiSession.share_code),
      shareStatus: getShareStatus(sbtiSession.share_code),
      reportUnlocked: sbtiSession.report_unlocked === 1,
    })
  } catch (err) {
    console.error('sbti/complete error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * GET /api/sbti/session/:id
 * 获取 SBTI session 状态（无需登录）
 */
router.get('/session/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10)

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: '无效的 session ID' })
    }

    const session = db.store.queryList(
      'SELECT * FROM sbti_sessions WHERE id = ?',
      [sessionId]
    )

    if (!session || session.length === 0) {
      return res.status(404).json({ error: 'session 不存在' })
    }

    const sbtiSession = session[0]

    const lang = sbtiSession.lang || 'zh'
    const questionnaire = getQuestionnaire()
    const currentQuestion = questionnaire[sbtiSession.current_question]

    res.json({
      sessionId: sbtiSession.id,
      status: sbtiSession.status,
      currentQuestion: sbtiSession.current_question,
      totalQuestions: 24,
      completed: sbtiSession.status === 'completed',
      personalityId: sbtiSession.personality_id,
      shareCode: sbtiSession.share_code,
      shareUrl: generateShareUrl(sbtiSession.share_code),
      currentQuestionData: currentQuestion ? {
        id: currentQuestion.id,
        question: lang === 'zh' ? currentQuestion.question : currentQuestion.question_en,
        options: currentQuestion.options.map(o => ({
          key: o.key,
          text: lang === 'zh' ? o.text : o.text_en,
        })),
      } : null,
    })
  } catch (err) {
    console.error('sbti/session error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * GET /api/sbti/status/:shareCode
 * 获取分享状态（无需登录）
 */
router.get('/status/:shareCode', async (req, res) => {
  try {
    const { shareCode } = req.params

    const status = getShareStatus(shareCode)

    if (!status) {
      return res.status(404).json({ error: '分享码不存在' })
    }

    res.json({
      shareCode,
      ...status,
    })
  } catch (err) {
    console.error('sbti/status error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * POST /api/sbti/share/open
 * 记录分享打开（无需登录）
 */
router.post('/share/open', async (req, res) => {
  try {
    const { shareCode, visitorId, visitorIp } = req.body

    if (!shareCode) {
      return res.status(400).json({ error: '缺少分享码' })
    }

    const result = recordShareOpen(shareCode, visitorIp, visitorId)

    res.json(result)
  } catch (err) {
    console.error('sbti/share/open error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * GET /api/sbti/report/:sessionId
 * 获取报告（检查是否解锁，无需登录）
 */
router.get('/report/:sessionId', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10)

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: '无效的 session ID' })
    }

    const session = db.store.queryList(
      'SELECT * FROM sbti_sessions WHERE id = ?',
      [sessionId]
    )

    if (!session || session.length === 0) {
      return res.status(404).json({ error: 'session 不存在' })
    }

    const sbtiSession = session[0]

    // 检查是否完成
    if (sbtiSession.status !== 'completed') {
      return res.status(400).json({ error: '测试未完成' })
    }

    // 检查是否解锁
    if (!isReportUnlocked(sessionId)) {
      return res.status(403).json({
        error: '报告未解锁',
        shareCode: sbtiSession.share_code,
        shareUrl: generateShareUrl(sbtiSession.share_code),
        shareStatus: getShareStatus(sbtiSession.share_code),
      })
    }

    // 返回人格数据和生意数据（用于生成报告）
    res.json({
      sessionId,
      personalityId: sbtiSession.personality_id,
      sbtiScores: JSON.parse(sbtiSession.sbti_scores || '{}'),
      businessData: JSON.parse(sbtiSession.business_data || '{}'),
      completedAt: sbtiSession.completed_at,
    })
  } catch (err) {
    console.error('sbti/report error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * POST /api/sbti/generate
 * 触发SBTI报告生成（需要报告已解锁，无需登录）
 */
router.post('/generate', async (req, res) => {
  try {
    const { sessionId } = req.body

    if (!sessionId) {
      return res.status(400).json({ error: '缺少sessionId' })
    }

    // 验证 session 存在
    const session = db.store.queryList(
      'SELECT * FROM sbti_sessions WHERE id = ?',
      [sessionId]
    )

    if (!session || session.length === 0) {
      return res.status(404).json({ error: 'session 不存在' })
    }

    const sbtiSession = session[0]

    // 检查是否完成
    if (sbtiSession.status !== 'completed') {
      return res.status(400).json({ error: '测试未完成' })
    }

    // 检查是否解锁
    if (!isReportUnlocked(sessionId)) {
      return res.status(403).json({
        error: '报告未解锁，请先分享或付费',
        shareCode: sbtiSession.share_code,
        shareUrl: generateShareUrl(sbtiSession.share_code),
        shareStatus: getShareStatus(sbtiSession.share_code),
      })
    }

    // 触发报告生成
    const result = await startGeneration(sessionId)

    res.json({
      success: true,
      sessionId,
      report: result.report,
      personality: result.personality,
      sbtiScores: result.sbtiScores,
    })
  } catch (err) {
    console.error('sbti/generate error:', err)
    res.status(500).json({ error: '报告生成失败' })
  }
})

module.exports = router
