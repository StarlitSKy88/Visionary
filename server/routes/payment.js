/**
 * Payment Routes - Phase 2 支付流程
 *
 * POST /api/payment/create - 创建支付订单
 * POST /api/payment/confirm - 确认支付（开发环境模拟）
 * POST /api/payment/callback - 微信支付回调
 * POST /api/payment/refund - 退款申请
 */

const express = require('express')
const router = express.Router()
const { requiresAuth } = require('../lib/auth')
const db = require('../db')
const wechatPay = require('../lib/wechat-pay')
const reportGenerator = require('../report-generator')

const PAYMENT_AMOUNT = 99 // 99元
const PAYMENT_DESCRIPTION = '商业报告生成服务'
const EXPIRY_MINUTES = 30 // 30分钟未支付视为失败

/**
 * POST /api/payment/create
 * 创建支付订单
 */
router.post('/create', async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: '未登录' })
    }

    const { sessionId } = req.body
    if (!sessionId) {
      return res.status(400).json({ error: '缺少 sessionId' })
    }

    const session = db.inquirySessions.getById(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'session 不存在' })
    }

    if (session.status !== 'waiting_payment') {
      return res.status(400).json({
        error: 'session 状态不正确',
        status: session.status,
      })
    }

    // 检查是否已有待支付的报告
    const existingReport = db.reports.getBySessionId(sessionId)
    if (existingReport && existingReport.status === 'pending_payment') {
      return res.json({
        reportId: existingReport.id,
        status: 'already_created',
        message: '订单已创建',
      })
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:3000'
    const notifyUrl = `${baseUrl}/api/payment/callback`
    const outTradeNo = `RPT${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    // 创建报告记录
    const content = {
      sessionId,
      createdAt: new Date().toISOString(),
      dimensions: session.dimension_answers,
    }
    const report = db.reports.createReport(sessionId, content, 'pending_payment', EXPIRY_MINUTES / 60)

    // 尝试创建微信支付订单
    const payResult = await wechatPay.createNativePayOrder({
      description: PAYMENT_DESCRIPTION,
      outTradeNo,
      amount: PAYMENT_AMOUNT * 100,
      notifyUrl,
    })

    if (payResult) {
      return res.json({
        reportId: report.id,
        tradeNo: outTradeNo,
        codeUrl: payResult.codeUrl,
        amount: PAYMENT_AMOUNT,
        status: 'pending',
      })
    }

    // 开发环境
    return res.json({
      reportId: report.id,
      tradeNo: outTradeNo,
      codeUrl: null,
      amount: PAYMENT_AMOUNT,
      status: 'dev_mode',
      message: '开发环境，调用 /api/payment/confirm 确认支付',
    })
  } catch (err) {
    console.error('payment/create error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * POST /api/payment/confirm
 * 确认支付（开发环境模拟支付成功）
 */
router.post('/confirm', async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: '未登录' })
    }

    const { reportId } = req.body
    if (!reportId) {
      return res.status(400).json({ error: '缺少 reportId' })
    }

    const report = db.reports.getById(reportId)
    if (!report) {
      return res.status(404).json({ error: '报告不存在' })
    }

    // 验证用户身份
    const session = db.inquirySessions.getById(report.session_id)
    if (!session || session.user_id !== userId) {
      return res.status(403).json({ error: '无权操作此报告' })
    }

    if (report.status !== 'pending_payment') {
      return res.status(400).json({
        error: '报告状态不正确',
        status: report.status,
      })
    }

    // 更新状态为生成中
    db.reports.updateStatus(reportId, 'generating')

    // 异步开始生成报告（不阻塞响应）
    setImmediate(() => {
      reportGenerator.startGeneration(reportId).catch(err => {
        console.error('报告生成失败:', err)
      })
    })

    res.json({
      success: true,
      message: '支付确认，开始生成报告',
      reportId,
    })
  } catch (err) {
    console.error('payment/confirm error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * POST /api/payment/callback
 * 微信支付回调
 */
router.post('/callback', async (req, res) => {
  try {
    const { body } = req

    if (!body || !body.signature) {
      console.error('支付回调：签名验证失败')
      return res.status(400).json({ code: 'FAIL', message: '签名验证失败' })
    }

    const config = { apiV3Key: process.env.WECHAT_API_V3_KEY }
    const decrypted = wechatPay.decryptCallback(body.encrypt_data, config.apiV3Key)

    if (!decrypted) {
      console.error('支付回调：解密失败')
      return res.status(400).json({ code: 'FAIL', message: '解密失败' })
    }

    const { out_trade_no, trade_state } = decrypted

    if (trade_state === 'SUCCESS') {
      const report = findReportByTradeNo(out_trade_no)
      if (report) {
        db.reports.updateStatus(report.id, 'generating')

        // 异步生成报告
        setImmediate(() => {
          reportGenerator.startGeneration(report.id).catch(err => {
            console.error('报告生成失败:', err)
          })
        })
      }
    }

    return res.json({ code: 'SUCCESS', message: '成功' })
  } catch (err) {
    console.error('payment/callback error:', err)
    res.status(500).json({ code: 'FAIL', message: '服务器错误' })
  }
})

/**
 * 根据订单号查找报告
 */
function findReportByTradeNo(tradeNo) {
  // 实际应该通过 trade_no 字段查找
  // 简化：返回最近的 pending_payment 报告
  const reports = db.store.queryList(
    `SELECT id FROM reports WHERE status = 'pending_payment' ORDER BY id DESC LIMIT 1`,
    []
  )
  if (reports.length > 0) {
    return db.reports.getById(reports[0].id)
  }
  return null
}

/**
 * POST /api/payment/refund
 * 退款申请
 */
router.post('/refund', async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: '未登录' })
    }

    const { reportId, reason } = req.body
    if (!reportId) {
      return res.status(400).json({ error: '缺少 reportId' })
    }

    const report = db.reports.getById(reportId)
    if (!report) {
      return res.status(404).json({ error: '报告不存在' })
    }

    const session = db.inquirySessions.getById(report.session_id)
    if (!session || session.user_id !== userId) {
      return res.status(403).json({ error: '无权操作此报告' })
    }

    if (!['generating', 'completed'].includes(report.status)) {
      return res.status(400).json({
        error: '当前状态不允许退款',
        status: report.status,
      })
    }

    // 实际应该调用微信支付退款
    db.reports.updateStatus(reportId, 'refunded')

    res.json({
      success: true,
      refundId: 'dev_refund',
      status: 'refunded',
    })
  } catch (err) {
    console.error('payment/refund error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * GET /api/payment/status/:reportId
 * 查询支付状态
 */
router.get('/status/:reportId', async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: '未登录' })
    }

    const reportId = parseInt(req.params.reportId, 10)
    if (isNaN(reportId)) {
      return res.status(400).json({ error: '无效的 reportId' })
    }

    const report = db.reports.getById(reportId)
    if (!report) {
      return res.status(404).json({ error: '报告不存在' })
    }

    const session = db.inquirySessions.getById(report.session_id)
    if (!session || session.user_id !== userId) {
      return res.status(403).json({ error: '无权查看此报告' })
    }

    const now = new Date()
    const expiresAt = new Date(report.expires_at)
    const isExpired = now > expiresAt

    res.json({
      reportId: report.id,
      status: isExpired && report.status === 'pending_payment' ? 'expired' : report.status,
      expiresAt: report.expires_at,
      isExpired,
    })
  } catch (err) {
    console.error('payment/status error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

module.exports = router