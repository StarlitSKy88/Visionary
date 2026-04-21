/**
 * InquirySession Repository
 * 管理"帮你赚钱"的追问会话状态
 */

const BaseRepository = require('./base-repository')

class InquirySessionRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  /**
   * 创建新的追问 session
   * @param {number} userId - 用户 ID
   * @param {string} lang - 语言 ('zh' | 'en')
   * @returns {object} 创建的 session
   */
  createSession(userId, lang = 'zh') {
    this._run(
      `INSERT INTO inquiry_sessions (user_id, lang, status, dimension_answers, round_count)
       VALUES (?, ?, 'active', '[]', 0)`,
      [userId, lang]
    )
    // 获取 session 在 save 之前，因为 save 会重置 lastInsertId
    const session = this.getById(this._lastInsertId())
    this._store.immediateSave()
    return session
  }

  /**
   * 记录用户回答
   * @param {number} sessionId - session ID
   * @param {string} dimension - 维度名称
   * @param {string} answer - 用户回答
   * @param {boolean} skipped - 是否跳过
   */
  recordAnswer(sessionId, dimension, answer, skipped = false) {
    const session = this.getById(sessionId)
    if (!session) throw new Error('Session not found')

    // dimension_answers 已被 jsonFields 自动解析为数组，直接使用
    const answers = session.dimension_answers || []
    // 检查是否已存在该维度，存在则更新
    const existingIdx = answers.findIndex(a => a.dimension === dimension)
    const newEntry = { dimension, answer, skipped, recorded_at: new Date().toISOString() }

    if (existingIdx >= 0) {
      answers[existingIdx] = newEntry
    } else {
      answers.push(newEntry)
    }

    this._run(
      `UPDATE inquiry_sessions
       SET dimension_answers = ?, round_count = round_count + 1, updated_at = datetime('now')
       WHERE id = ?`,
      [JSON.stringify(answers), sessionId]
    )
    this._store.immediateSave()
  }

  /**
   * 获取维度覆盖情况
   * @param {number} sessionId - session ID
   * @returns {object} { covered: string[], skipped: string[], total: number }
   */
  getCoverage(sessionId) {
    const session = this.getById(sessionId)
    if (!session) return { covered: [], skipped: [], total: 0 }

    // dimension_answers 已被 jsonFields 自动解析为数组
    const answers = session.dimension_answers || []
    const covered = answers.filter(a => !a.skipped).map(a => a.dimension)
    const skipped = answers.filter(a => a.skipped).map(a => a.dimension)

    return { covered, skipped, total: answers.length }
  }

  /**
   * 判断是否应该触发报告生成
   * @param {number} sessionId - session ID
   * @returns {object} { trigger: boolean, reason: string }
   */
  shouldTrigger(sessionId) {
    const session = this.getById(sessionId)
    if (!session) return { trigger: false, reason: 'session_not_found' }

    const coverage = this.getCoverage(sessionId)
    const requiredDimensions = ['location', 'scale', 'financial', 'competition', 'pain_point']

    // 5个必选维度全覆盖
    const allRequiredCovered = requiredDimensions.every(dim =>
      coverage.covered.includes(dim)
    )
    if (allRequiredCovered) {
      return { trigger: true, reason: 'dimensions_covered' }
    }

    // 15轮上限
    if (session.round_count >= 15) {
      return { trigger: true, reason: 'round_limit' }
    }

    return { trigger: false, reason: 'not_ready' }
  }

  /**
   * 更新 session 状态
   * @param {number} sessionId - session ID
   * @param {string} status - 新状态
   */
  updateStatus(sessionId, status) {
    this._run(
      `UPDATE inquiry_sessions SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [status, sessionId]
    )
    this._store.immediateSave()
  }

  /**
   * 设置支付截止时间
   * @param {number} sessionId - session ID
   * @param {string} deadline - ISO 时间字符串
   */
  setPaymentDeadline(sessionId, deadline) {
    this._run(
      `UPDATE inquiry_sessions SET payment_deadline = ?, updated_at = datetime('now') WHERE id = ?`,
      [deadline, sessionId]
    )
    this._store.immediateSave()
  }

  /**
   * 获取 session by ID
   * @param {number} sessionId - session ID
   * @returns {object|null}
   */
  getById(sessionId) {
    return this._queryOne(
      `SELECT * FROM inquiry_sessions WHERE id = ?`,
      [sessionId],
      ['dimension_answers']
    )
  }

  /**
   * 获取用户的所有 active session
   * @param {number} userId - 用户 ID
   * @returns {object[]}
   */
  getActiveByUserId(userId) {
    return this._queryList(
      `SELECT * FROM inquiry_sessions WHERE user_id = ? AND status IN ('active', 'waiting_payment') ORDER BY created_at DESC`,
      [userId],
      ['dimension_answers']
    )
  }

  /**
   * 获取等待支付的 session
   * @param {number} sessionId - session ID
   * @returns {object|null}
   */
  getWaitingPayment(sessionId) {
    return this._queryOne(
      `SELECT * FROM inquiry_sessions WHERE id = ? AND status = 'waiting_payment'`,
      [sessionId],
      ['dimension_answers']
    )
  }

  /**
   * 清理30天未活动的 expired session（软删除）
   * @returns {number} 清理数量
   */
  cleanupExpired() {
    // 先查出会清理的 session 数量
    const toClean = this._queryList(
      `SELECT id FROM inquiry_sessions
       WHERE status = 'active' AND datetime(updated_at) < datetime('now', '-30 days')`
    )

    if (toClean.length === 0) return 0

    this._run(
      `UPDATE inquiry_sessions
       SET status = 'expired', updated_at = datetime('now')
       WHERE status = 'active' AND datetime(updated_at) < datetime('now', '-30 days')`
    )
    this._store.immediateSave()
    return toClean.length
  }

  /**
   * 获取已完成的 session（用于生成报告）
   * @param {number} sessionId - session ID
   * @returns {object|null}
   */
  getCompletedSession(sessionId) {
    return this._queryOne(
      `SELECT * FROM inquiry_sessions WHERE id = ? AND status IN ('active', 'waiting_payment')`,
      [sessionId],
      ['dimension_answers']
    )
  }
}

module.exports = InquirySessionRepository