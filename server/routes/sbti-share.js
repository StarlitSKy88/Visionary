/**
 * SBTI 分享裂变机制
 * 实现10次解锁分享机制
 */

const db = require('../db')
const { nanoid } = require('nanoid')

// 解锁需要的打开次数
const UNLOCK_THRESHOLD = 10

/**
 * 生成唯一分享码
 * @param {number} sessionId - SBTI会话ID
 * @returns {string} 分享码
 */
function generateShareCode(sessionId) {
  // 使用nanoid生成8位唯一码
  const shareCode = nanoid(8)

  return shareCode
}

/**
 * 记录分享打开
 * @param {string} shareCode - 分享码
 * @param {string} visitorIp - 访客IP（可选）
 * @param {string} visitorId - 访客ID（可选，用于区分不同用户）
 * @returns {Object} {opens: number, unlocked: boolean}
 */
function recordShareOpen(shareCode, visitorIp = null, visitorId = null) {
  // 查找session
  const session = db.store.queryList(
    'SELECT id, share_code, share_opens, report_unlocked FROM sbti_sessions WHERE share_code = ?',
    [shareCode]
  )

  if (!session || session.length === 0) {
    return { success: false, error: '分享码不存在' }
  }

  const sbtiSession = session[0]

  // 如果已经解锁，直接返回
  if (sbtiSession.report_unlocked) {
    return {
      success: true,
      opens: sbtiSession.share_opens,
      unlocked: true,
      message: '报告已解锁',
    }
  }

  // 检查是否重复打开（基于visitorId或IP去重）
  let isUniqueOpen = true
  if (visitorId || visitorIp) {
    const existingRecord = db.store.queryList(
      'SELECT id FROM share_records WHERE share_code = ? AND (visitor_id = ? OR visitor_ip = ?)',
      [shareCode, visitorId || '', visitorIp || '']
    )
    isUniqueOpen = existingRecord.length === 0
  }

  // 记录打开
  db.store.run(
    'INSERT INTO share_records (share_code, visitor_ip, visitor_id) VALUES (?, ?, ?)',
    [shareCode, visitorIp || null, visitorId || null]
  )

  // 只有有效打开才计数
  if (isUniqueOpen) {
    const newOpens = sbtiSession.share_opens + 1
    const shouldUnlock = newOpens >= UNLOCK_THRESHOLD

    // 更新session
    db.store.run(
      'UPDATE sbti_sessions SET share_opens = ?, report_unlocked = ?, updated_at = datetime("now") WHERE share_code = ?',
      [newOpens, shouldUnlock ? 1 : 0, shareCode]
    )

    return {
      success: true,
      opens: newOpens,
      unlocked: shouldUnlock,
      remaining: Math.max(0, UNLOCK_THRESHOLD - newOpens),
      message: shouldUnlock
        ? '恭喜！分享解锁成功，报告已免费解锁！'
        : `分享成功，还差${UNLOCK_THRESHOLD - newOpens}次解锁`,
    }
  }

  return {
    success: true,
    opens: sbtiSession.share_opens,
    unlocked: sbtiSession.report_unlocked === 1,
    remaining: Math.max(0, UNLOCK_THRESHOLD - sbtiSession.share_opens),
    message: '您已打开过此分享链接',
  }
}

/**
 * 获取分享状态
 * @param {string} shareCode - 分享码
 * @returns {Object} {opens: number, unlocked: boolean, remaining: number}
 */
function getShareStatus(shareCode) {
  const session = db.store.queryList(
    'SELECT share_opens, report_unlocked FROM sbti_sessions WHERE share_code = ?',
    [shareCode]
  )

  if (!session || session.length === 0) {
    return null
  }

  const sbtiSession = session[0]
  return {
    opens: sbtiSession.share_opens,
    unlocked: sbtiSession.report_unlocked === 1,
    remaining: Math.max(0, UNLOCK_THRESHOLD - sbtiSession.share_opens),
  }
}

/**
 * 检查报告是否已解锁
 * @param {number} sessionId - SBTI会话ID
 * @returns {boolean}
 */
function isReportUnlocked(sessionId) {
  const session = db.store.queryList(
    'SELECT report_unlocked FROM sbti_sessions WHERE id = ?',
    [sessionId]
  )

  if (!session || session.length === 0) {
    return false
  }

  return session[0].report_unlocked === 1
}

/**
 * 生成分享链接
 * @param {string} shareCode - 分享码
 * @param {string} baseUrl - 基础URL
 * @returns {string} 分享链接
 */
function generateShareUrl(shareCode, baseUrl = '') {
  return `${baseUrl}/sbti?ref=${shareCode}`
}

/**
 * 获取分享统计
 * @param {number} sessionId - SBTI会话ID
 * @returns {Object} 分享统计数据
 */
function getShareStats(sessionId) {
  const records = db.store.queryList(
    `SELECT DATE(opened_at) as date, COUNT(*) as opens
     FROM share_records
     WHERE share_code = (SELECT share_code FROM sbti_sessions WHERE id = ?)
     GROUP BY DATE(opened_at)
     ORDER BY date DESC`,
    [sessionId]
  )

  const session = db.store.queryList(
    'SELECT share_opens, report_unlocked FROM sbti_sessions WHERE id = ?',
    [sessionId]
  )

  if (!session || session.length === 0) {
    return null
  }

  return {
    total_opens: session[0].share_opens,
    unlocked: session[0].report_unlocked === 1,
    daily_stats: records || [],
  }
}

module.exports = {
  generateShareCode,
  recordShareOpen,
  getShareStatus,
  isReportUnlocked,
  generateShareUrl,
  getShareStats,
  UNLOCK_THRESHOLD,
}
