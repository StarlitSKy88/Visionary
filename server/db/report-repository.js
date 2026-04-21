/**
 * Report Repository
 * 管理"帮你赚钱"报告的存储和加密
 */

const crypto = require('crypto')
const BaseRepository = require('./base-repository')

// AES-256 加密配置
const ALGORITHM = 'aes-256-gcm'
// 使用 SHA-256 哈希将任意长度密钥转换为 32 字节
const KEY = crypto.createHash('sha256')
  .update(process.env.REPORT_ENCRYPTION_KEY || 'default-key-change-in-production!!')
  .digest()

/**
 * 加密内容
 * @param {string} plaintext
 * @returns {string} base64 编码的加密内容（包含 iv 和 authTag）
 */
function encrypt(plaintext) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // 格式: iv:authTag:encrypted (都是 base64)
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

/**
 * 解密内容
 * @param {string} ciphertext - 加密内容（格式: iv:authTag:encrypted）
 * @returns {string} 解密后的原文
 */
function decrypt(ciphertext) {
  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format')
  }
  const [ivBase64, authTagBase64, encryptedBase64] = parts
  const iv = Buffer.from(ivBase64, 'base64')
  const authTag = Buffer.from(authTagBase64, 'base64')
  const encrypted = Buffer.from(encryptedBase64, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

class ReportRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  /**
   * 创建报告（加密存储）
   * @param {number} sessionId - 对应的 session ID
   * @param {object} content - 报告内容（JSON 对象）
   * @param {string} status - 状态 ('pending_payment' | 'generating' | 'completed' | 'failed' | 'expired')
   * @param {number} expiresInHours - 过期时间（小时），默认 24
   * @returns {object} 创建的报告
   */
  createReport(sessionId, content, status = 'pending_payment', expiresInHours = 24) {
    const encryptedContent = encrypt(JSON.stringify(content))
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()

    this._run(
      `INSERT INTO reports (session_id, encrypted_content, status, expires_at)
       VALUES (?, ?, ?, ?)`,
      [sessionId, encryptedContent, status, expiresAt]
    )

    // 获取报告在 save 之前，因为 save 会重置 lastInsertId
    const report = this.getById(this._lastInsertId())
    this._store.immediateSave()
    return report
  }

  /**
   * 获取报告（含解密）
   * @param {number} reportId - 报告 ID
   * @returns {object|null} 报告对象（含 decryptedContent）
   */
  getById(reportId) {
    const report = this._queryOne(
      `SELECT * FROM reports WHERE id = ?`,
      [reportId],
      []
    )

    if (!report) return null

    // 解密内容
    try {
      report.decryptedContent = JSON.parse(decrypt(report.encrypted_content))
    } catch (e) {
      report.decryptedContent = null
      report.decryptError = e.message
    }

    // 清理加密内容，避免泄露
    delete report.encrypted_content

    return report
  }

  /**
   * 根据 session 获取报告
   * @param {number} sessionId
   * @returns {object|null}
   */
  getBySessionId(sessionId) {
    const report = this._queryOne(
      `SELECT * FROM reports WHERE session_id = ? ORDER BY id DESC LIMIT 1`,
      [sessionId],
      []
    )

    if (!report) return null

    try {
      report.decryptedContent = JSON.parse(decrypt(report.encrypted_content))
    } catch (e) {
      report.decryptedContent = null
      report.decryptError = e.message
    }

    delete report.encrypted_content
    return report
  }

  /**
   * 更新报告状态
   * @param {number} reportId
   * @param {string} status
   */
  updateStatus(reportId, status) {
    this._run(
      `UPDATE reports SET status = ? WHERE id = ?`,
      [status, reportId]
    )
    this._store.immediateSave()
  }

  /**
   * 更新报告内容（加密存储）
   * @param {number} reportId
   * @param {object} content
   */
  updateContent(reportId, content) {
    const encryptedContent = encrypt(JSON.stringify(content))
    this._run(
      `UPDATE reports SET encrypted_content = ?, updated_at = datetime('now') WHERE id = ?`,
      [encryptedContent, reportId]
    )
    this._store.immediateSave()
  }

  /**
   * 标记报告为已完成
   * @param {number} reportId
   * @param {object} content - 最终报告内容
   */
  completeReport(reportId, content) {
    const encryptedContent = encrypt(JSON.stringify(content))
    this._run(
      `UPDATE reports
       SET encrypted_content = ?, status = 'completed', updated_at = datetime('now')
       WHERE id = ?`,
      [encryptedContent, reportId]
    )
    this._store.immediateSave()
  }

  /**
   * 清理过期报告（软删除）
   * @returns {number} 清理数量
   */
  cleanupExpired() {
    // 先查出会清理的 report 数量
    const toClean = this._queryList(
      `SELECT id FROM reports
       WHERE status NOT IN ('completed', 'expired')
       AND expires_at < datetime('now')`
    )

    if (toClean.length === 0) return 0

    this._run(
      `UPDATE reports
       SET status = 'expired'
       WHERE status NOT IN ('completed', 'expired')
       AND expires_at < datetime('now')`
    )
    this._store.immediateSave()
    return toClean.length
  }

  /**
   * 获取过期的报告ID列表（用于处理）
   * @returns {number[]}
   */
  getExpiredReportIds() {
    const reports = this._queryList(
      `SELECT id FROM reports
       WHERE status NOT IN ('completed', 'expired')
       AND expires_at < datetime('now')`
    )
    return reports.map(r => r.id)
  }

  /**
   * Q1: 获取报告的追问次数
   * @param {number} reportId
   * @returns {number}
   */
  getFollowupCount(reportId) {
    const report = this._queryOne(
      `SELECT followup_count FROM reports WHERE id = ?`,
      [reportId]
    )
    return report ? report.followup_count : 0
  }

  /**
   * Q1: 增加报告的追问次数
   * @param {number} reportId
   * @returns {number} 新的追问次数
   */
  incrementFollowupCount(reportId) {
    this._run(
      `UPDATE reports SET followup_count = followup_count + 1 WHERE id = ?`,
      [reportId]
    )
    this._store.immediateSave()
    return this.getFollowupCount(reportId)
  }
}

module.exports = {
  ReportRepository,
  encrypt,
  decrypt,
}