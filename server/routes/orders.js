const express = require('express')
const router = express.Router()
const Database = require('../db')
const { v4: uuidv4 } = require('uuid')
const { authMiddleware, sanitizeInput } = require('../lib/auth')

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
    console.log(`📝 订单创建: ${tradeNo} | 用户: ${userId} | 金额: ¥${amount}`)
    res.json({ success: true, order: { id: order.id, tradeNo, amount: Math.round(amount), status: 'pending' } })
  } catch (error) {
    console.error('创建订单失败:', error)
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
    console.log(`✅ 支付成功: ${tradeNo}`)
    res.json({ success: true, message: '支付成功', order: { id: order.id, tradeNo, status: 'paid', payTime } })
  } catch (error) {
    console.error('支付失败:', error)
    res.status(500).json({ success: false, error: '支付失败' })
  }
})

router.post('/wechat/create', authMiddleware, (req, res) => {
  const { amount } = req.body
  const userId = req.user.userId

  if (!amount || amount <= 0) return res.status(400).json({ success: false, error: '缺少必要参数' })

  try {
    const tradeNo = generateTradeNo('WX')
    const order = Database.createOrder({ userId, amount: Math.round(amount), tradeNo })
    const wechatPayParams = {
      appId: 'wx1234567890abcdef',
      timeStamp: Math.floor(Date.now() / 1000).toString(),
      nonceStr: uuidv4().replace(/-/g, ''),
      package: `prepay_id=wx${Date.now()}`,
      signType: 'RSA',
      paySign: 'mock_sign_' + Math.random().toString(36).substr(2),
      tradeNo,
    }
    console.log(`📝 微信预支付: ${tradeNo} | ¥${amount}`)
    res.json({ success: true, payParams: wechatPayParams, order: { id: order.id, tradeNo, amount: Math.round(amount), status: 'pending' } })
  } catch (error) {
    console.error('创建微信支付订单失败:', error)
    res.status(500).json({ success: false, error: '创建订单失败' })
  }
})

router.post('/wechat/callback', (req, res) => {
  const { tradeNo, transactionId } = req.body
  try {
    const order = Database.getOrderByTradeNo(tradeNo)
    if (!order) return res.status(404).json({ success: false, error: '订单不存在' })
    Database.updateOrderStatus(order.id, 'paid', new Date().toISOString())
    console.log(`✅ 微信支付成功: ${tradeNo}`)
    res.json({ success: true, message: '支付成功' })
  } catch (error) {
    console.error('处理微信回调失败:', error)
    res.status(500).json({ success: false, error: '处理失败' })
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
    console.error('查询订单失败:', error)
    res.status(500).json({ success: false, error: '查询失败' })
  }
})

router.get('/list', authMiddleware, (req, res) => {
  try {
    const orders = Database.getOrdersByUserId(req.user.userId)
    res.json({ success: true, orders: orders.map(o => ({ id: o.id, tradeNo: o.trade_no, status: o.status, amount: o.amount, payTime: o.pay_time, createdAt: o.created_at })) })
  } catch (error) {
    console.error('获取订单列表失败:', error)
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
    console.error('检查退款进度失败:', error)
    res.status(500).json({ success: false, error: '查询失败' })
  }
})

module.exports = router
