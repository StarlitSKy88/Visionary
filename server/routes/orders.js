const express = require('express')
const router = express.Router()
const Database = require('../db')
const { v4: uuidv4 } = require('uuid')
const { authMiddleware, sanitizeInput } = require('../lib/auth')
const { safeLog } = require('../lib/logger')
const wechatPay = require('../lib/wechat-pay')

function generateTradeNo(prefix = 'TN') {
  return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

router.post('/create', authMiddleware, (req, res) => {
  const { agentId, amount } = req.body
  const userId = req.user.userId

  if (!amount || amount <= 0) return res.status(400).json({ success: false, error: '缺少必要参数' })
  if (amount > 10000) return res.status(400).json({ success: false, error: '金额异常' })

  try {
    const tradeNo = generateTradeNo()
    const order = Database.createOrder({ userId, agentId: agentId || null, amount: Math.round(amount), tradeNo })
    safeLog({ type: 'order_created', tradeNo, userId, amount: Math.round(amount) }, '📝 订单创建')
    res.json({ success: true, order: { id: order.id, tradeNo, amount: Math.round(amount), status: 'pending' } })
  } catch (error) {
    safeLog({ type: 'order_error', tradeNo, error: error.message }, '❌ 创建订单失败')
    res.status(500).json({ success: false, error: '创建订单失败' })
  }
})

router.post('/mock-pay', authMiddleware, async (req, res) => {
  const { tradeNo } = req.body
  const userId = req.user.userId

  if (!tradeNo) return res.status(400).json({ success: false, error: '缺少订单号' })

  try {
    const order = Database.getOrderByTradeNo(tradeNo)
    if (!order) return res.status(404).json({ success: false, error: '订单不存在' })
    if (order.user_id !== userId) return res.status(403).json({ success: false, error: '无权操作此订单' })
    if (order.status === 'paid') return res.json({ success: true, message: '订单已支付', order: { id: order.id, tradeNo, status: 'paid' } })

    await new Promise(resolve => setTimeout(resolve, 1000))
    const payTime = new Date().toISOString()
    Database.updateOrderStatus(order.id, 'paid', payTime)
    safeLog({ type: 'payment_success', tradeNo }, '✅ 支付成功')
    res.json({ success: true, message: '支付成功', order: { id: order.id, tradeNo, status: 'paid', payTime } })
  } catch (error) {
    safeLog({ type: 'payment_error', tradeNo, error: error.message }, '❌ 支付失败')
    res.status(500).json({ success: false, error: '支付失败' })
  }
})

router.post('/wechat/create', authMiddleware, async (req, res) => {
  const { amount } = req.body
  const userId = req.user.userId

  if (!amount || amount <= 0) return res.status(400).json({ success: false, error: '缺少必要参数' })

  const tradeNo = generateTradeNo('WX')

  try {
    const order = Database.createOrder({ userId, amount: Math.round(amount), tradeNo })
    safeLog({ type: 'wechat_prepay', tradeNo, amount: Math.round(amount) }, '📝 微信预支付创建')

    // 检查是否配置了微信支付
    if (!wechatPay.isConfigured()) {
      // Mock 模式（未配置微信支付）
      const mockParams = {
        appId: 'wx_mock_' + (process.env.WECHAT_APPID || '000000'),
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: uuidv4().replace(/-/g, ''),
        package: `prepay_id=wx${Date.now()}`,
        signType: 'RSA',
        paySign: 'mock_' + crypto.randomBytes(16).toString('hex'),
        tradeNo,
        _mock: true,
      }
      return res.json({
        success: true,
        payParams: mockParams,
        order: { id: order.id, tradeNo, amount: Math.round(amount), status: 'pending' },
        message: '微信支付未配置，返回Mock参数',
      })
    }

    // 真实微信 Native 支付
    const notifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/orders/wechat/callback`
    const result = await wechatPay.createNativePayOrder({
      description: 'AI经营助手充值',
      outTradeNo: tradeNo,
      amount: Math.round(amount) * 100, // 转换为分
      notifyUrl,
    })

    const payParams = {
      appId: process.env.WECHAT_APPID || '',
      timeStamp: Math.floor(Date.now() / 1000).toString(),
      nonceStr: uuidv4().replace(/-/g, ''),
      package: `prepay_id=${result.prepayId}`,
      signType: 'RSA',
      paySign: '',
      tradeNo,
      codeUrl: result.codeUrl,
    }

    safeLog({ type: 'wechat_native_created', tradeNo, codeUrl: result.codeUrl }, '📝 微信Native支付创建成功')
    res.json({
      success: true,
      payParams,
      order: { id: order.id, tradeNo, amount: Math.round(amount), status: 'pending' },
    })
  } catch (error) {
    safeLog({ type: 'wechat_create_error', tradeNo, error: error.message }, '❌ 创建微信支付订单失败')
    res.status(500).json({ success: false, error: '创建订单失败' })
  }
})

router.post('/wechat/callback', async (req, res) => {
  try {
    const headers = req.headers
    const signature = headers['x-wechatpay-signature']
    const timestamp = headers['x-wechatpay-timestamp']
    const nonce = headers['x-wechatpay-nonce']

    if (!signature || !timestamp || !nonce) {
      // 非微信官方回调（旧版或Mock）
      const { tradeNo, transactionId } = req.body || {}
      if (!tradeNo) return res.status(400).json({ success: false, error: '缺少参数' })

      const order = Database.getOrderByTradeNo(tradeNo)
      if (!order) return res.status(404).json({ success: false, error: '订单不存在' })

      Database.updateOrderStatus(order.id, 'paid', new Date().toISOString())
      safeLog({ type: 'wechat_callback', tradeNo, transactionId }, '✅ 微信支付成功')
      return res.json({ success: true, message: '支付成功' })
    }

    // ===== 微信支付 V3 回调处理 =====
    // req.rawBody 在 index.js 中间件设置
    const rawBody = req.rawBody || JSON.stringify(req.body)
    const cert = wechatPay.getPlatformCert?.() || null

    // 验证签名
    if (cert && !wechatPay.verifyCallbackSignature({ timestamp, nonce, body: rawBody, signature }, cert)) {
      safeLog({ type: 'wechat_callback_verify_failed' }, '❌ 微信支付回调签名验证失败')
      return res.status(400).json({ code: 'FAIL', message: '签名验证失败' })
    }

    // 解密回调数据
    const callbackData = wechatPay.decryptCallback?.(req.body.resource?.encrypt_certificate?.ciphertext, process.env.WECHAT_API_V3_KEY) || req.body

    const { out_trade_no, transaction_id, trade_state } = callbackData

    if (!out_trade_no) {
      return res.status(400).json({ code: 'FAIL', message: '缺少订单号' })
    }

    if (trade_state === 'SUCCESS') {
      const order = Database.getOrderByTradeNo(out_trade_no)
      if (order && order.status !== 'paid') {
        Database.updateOrderStatus(order.id, 'paid', new Date().toISOString())
        safeLog({ type: 'wechat_v3_callback', tradeNo: out_trade_no, transactionId: transaction_id }, '✅ 微信支付V3回调成功')
      }
    }

    // 返回成功以通知微信不再重试
    res.json({ code: 'SUCCESS', message: '成功' })
  } catch (error) {
    safeLog({ type: 'wechat_callback_error', error: error.message }, '❌ 处理微信回调失败')
    res.status(500).json({ code: 'FAIL', message: '处理失败' })
  }
})

router.get('/status/:tradeNo', authMiddleware, (req, res) => {
  const { tradeNo } = req.params
  try {
    const order = Database.getOrderByTradeNo(tradeNo)
    if (!order) return res.status(404).json({ success: false, error: '订单不存在' })
    if (order.user_id !== req.user.userId) return res.status(403).json({ success: false, error: '无权查看此订单' })
    res.json({ success: true, order: { id: order.id, tradeNo: order.trade_no, status: order.status, amount: order.amount, payTime: order.pay_time, createdAt: order.created_at } })
  } catch (error) {
    safeLog({ type: 'order_query_error', tradeNo, error: error.message }, '❌ 查询订单失败')
    res.status(500).json({ success: false, error: '查询失败' })
  }
})

router.get('/list', authMiddleware, (req, res) => {
  try {
    const orders = Database.getOrdersByUserId(req.user.userId)
    res.json({ success: true, orders: orders.map(o => ({ id: o.id, tradeNo: o.trade_no, status: o.status, amount: o.amount, payTime: o.pay_time, createdAt: o.created_at })) })
  } catch (error) {
    safeLog({ type: 'order_list_error', userId, error: error.message }, '❌ 获取订单列表失败')
    res.status(500).json({ success: false, error: '获取失败' })
  }
})

router.post('/check-refund', authMiddleware, (req, res) => {
  const userId = req.user.userId
  try {
    const user = Database.getUserById(userId)
    if (!user) return res.status(404).json({ success: false, error: '用户不存在' })

    const progress = user.invite_progress || 0
    const required = 3
    const refunded = user.refunded === 1

    if (progress >= required && !refunded) {
      Database.markRefunded(user.id)
      return res.json({ success: true, message: '退款将在24小时内到账', progress, required, refunded: true })
    }
    if (refunded) {
      return res.json({ success: true, message: '已退款', progress, required, refunded: true })
    }
    res.json({ success: false, progress, required, refunded: false, message: `还需邀请 ${required - progress} 人` })
  } catch (error) {
    safeLog({ type: 'refund_check_error', userId, error: error.message }, '❌ 检查退款进度失败')
    res.status(500).json({ success: false, error: '查询失败' })
  }
})

module.exports = router
