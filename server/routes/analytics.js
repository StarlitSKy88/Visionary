/**
 * SSE 实时进度路由 + Token 统计 API
 */

const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../lib/auth')
const Database = require('../db')
const { safeLog } = require('../lib/logger')

// SSE 实时生成进度
router.get('/generate/:sessionId', authMiddleware, (req, res) => {
  const { sessionId } = req.params

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })

  // 发送心跳
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n')
  }, 15000)

  // 检查会话状态
  const { getSession } = require('../agents/state-machine')
  const checkInterval = setInterval(() => {
    const machine = getSession(sessionId)
    if (machine) {
      const status = machine.getStatus()
      res.write(`data: ${JSON.stringify(status)}\n\n`)

      if (status.state === 'completed' || status.state === 'failed') {
        clearInterval(checkInterval)
        clearInterval(heartbeat)
        res.write('data: {"event":"done"}\n\n')
        res.end()
      }
    }
  }, 1000)

  req.on('close', () => {
    clearInterval(checkInterval)
    clearInterval(heartbeat)
  })
})

// Token 用量统计
router.get('/token-stats', authMiddleware, (req, res) => {
  try {
    Database.tokenUsage.ensureTable()
    const stats = Database.tokenUsage.getUsageStats(30)
    const byModel = Database.tokenUsage.getUsageByModel(30)
    const byTask = Database.tokenUsage.getUsageByTask(30)

    res.json({
      success: true,
      stats: stats || { totalCalls: 0, totalTokens: 0, todayCalls: 0, todayTokens: 0 },
      byModel: byModel || [],
      byTask: byTask || [],
    })
  } catch (error) {
    safeLog({ error: error.message, type: 'analytics_token_stats_error' }, '❌ 获取Token统计失败')
    res.status(500).json({ success: false, error: '获取失败' })
  }
})

module.exports = router
