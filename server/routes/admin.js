const express = require('express')
const router = express.Router()
const Database = require('../db')
const { sanitizeInput } = require('../lib/auth')
const { safeLog } = require('../lib/logger')

const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123'

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key']
  if (!key || key !== ADMIN_KEY) {
    return res.status(403).json({ success: false, error: '无权限' })
  }
  next()
}

router.get('/stats', adminAuth, (req, res) => {
  try {
    const raw = Database.getFullStats()

    // 格式化统计响应以匹配前端期望
    const stats = {
      totalUsers: raw.userCount || 0,
      totalAgents: raw.agentCount || 0,
      totalOrders: raw.orderCount || 0,
      totalRevenue: raw.revenue || 0,
      todayOrders: 0,
      todayTokens: 0,
      totalTokens: 0,
      avgLatency: 0,
    }
    res.json({ success: true, stats })
  } catch (error) {
    safeLog({ error: error.message, type: 'admin_stats_error' }, '❌ 获取统计失败')
    res.status(500).json({ success: false, error: '获取统计数据失败' })
  }
})

router.get('/users', adminAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200)
  const offset = parseInt(req.query.offset) || 0

  try {
    const users = Database.getAllUsers(limit, offset)
    res.json({
      success: true,
      users: users.map(u => ({
        id: u.id, email: u.email, industry: u.industry, scale: u.scale,
        inviteCode: u.invite_code, inviteProgress: u.invite_progress || 0,
        refunded: u.refunded === 1, createdAt: u.created_at,
      })),
    })
  } catch (error) {
    safeLog({ error: error.message, type: 'admin_users_error' }, '❌ 获取用户列表失败')
    res.status(500).json({ success: false, error: '获取失败' })
  }
})

router.get('/orders', adminAuth, (req, res) => {
  try {
    const orders = Database.getAllOrdersWithUser(100)
    res.json({ success: true, orders })
  } catch (error) {
    safeLog({ error: error.message, type: 'admin_orders_error' }, '❌ 获取订单列表失败')
    res.status(500).json({ success: false, error: '获取失败' })
  }
})

router.get('/tickets', adminAuth, (req, res) => {
  try {
    const tickets = Database.getRecentTickets(100)
    res.json({ success: true, tickets })
  } catch (error) {
    safeLog({ error: error.message, type: 'admin_tickets_error' }, '❌ 获取工单列表失败')
    res.status(500).json({ success: false, error: '获取失败' })
  }
})

router.post('/tickets/:id', adminAuth, (req, res) => {
  const { status } = req.body
  if (!status) return res.status(400).json({ success: false, error: '缺少状态参数' })

  try {
    Database.updateTicketStatus(req.params.id, sanitizeInput(status))
    res.json({ success: true })
  } catch (error) {
    safeLog({ error: error.message, type: 'admin_ticket_update_error' }, '❌ 处理工单失败')
    res.status(500).json({ success: false, error: '处理失败' })
  }
})

router.get('/knowledge', adminAuth, (req, res) => {
  try {
    const knowledge = Database.getRecentKnowledge(100)
    res.json({ success: true, knowledge })
  } catch (error) {
    safeLog({ error: error.message, type: 'admin_knowledge_error' }, '❌ 获取知识库失败')
    res.status(500).json({ success: false, error: '获取失败' })
  }
})

router.post('/knowledge', adminAuth, (req, res) => {
  const { industry, keyword, content, source } = req.body
  if (!industry || !content) return res.status(400).json({ success: false, error: '缺少必要参数' })

  try {
    Database.addKnowledge(sanitizeInput(industry), sanitizeInput(keyword || ''), sanitizeInput(content), sanitizeInput(source || ''))
    res.json({ success: true })
  } catch (error) {
    safeLog({ error: error.message, type: 'admin_knowledge_add_error' }, '❌ 添加知识失败')
    res.status(500).json({ success: false, error: '添加失败' })
  }
})

// Token 用量统计（管理后台专用）
router.get('/token-stats', adminAuth, (req, res) => {
  try {
    if (!Database.tokenUsage) {
      return res.json({ success: true, stats: { totalCalls: 0, totalTokens: 0, todayCalls: 0, todayTokens: 0, avgLatency: 0 }, byModel: [], byTask: [] })
    }
    Database.tokenUsage.ensureTable()
    const stats = Database.tokenUsage.getUsageStats(30)
    const byModel = Database.tokenUsage.getUsageByModel(30)
    const byTask = Database.tokenUsage.getUsageByTask(30)

    res.json({
      success: true,
      stats: stats || { totalCalls: 0, totalTokens: 0, todayCalls: 0, todayTokens: 0, avgLatency: 0 },
      byModel: byModel || [],
      byTask: byTask || [],
    })
  } catch (error) {
    safeLog({ error: error.message, type: 'admin_token_stats_error' }, '❌ 获取Token统计失败')
    res.status(500).json({ success: false, error: '获取失败' })
  }
})

module.exports = router
