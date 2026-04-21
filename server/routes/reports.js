/**
 * Report Routes - 获取报告内容
 */

const express = require('express')
const router = express.Router()
const { requiresAuth } = require('../lib/auth')
const db = require('../db')

/**
 * GET /api/reports/:id
 * 获取报告详情（含解密内容）
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: '未登录' })
    }

    const reportId = parseInt(req.params.id, 10)
    if (isNaN(reportId)) {
      return res.status(400).json({ error: '无效的报告ID' })
    }

    const report = db.reports.getById(reportId)
    if (!report) {
      return res.status(404).json({ error: '报告不存在' })
    }

    // 验证用户身份（通过 session 关联）
    const session = db.inquirySessions.getById(report.session_id)
    if (!session || session.user_id !== userId) {
      return res.status(403).json({ error: '无权查看此报告' })
    }

    // 返回报告信息
    res.json({
      id: report.id,
      status: report.status,
      decryptedContent: report.decryptedContent || null,
      expires_at: report.expires_at,
      created_at: report.created_at,
    })
  } catch (err) {
    console.error('reports/:id error:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

module.exports = router