/**
 * CodeRepository - 验证码数据访问
 */

const BaseRepository = require('./base-repository')

class CodeRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  createEmailCode(email, code, expiresAt) {
    this._run('UPDATE email_codes SET used = 1 WHERE email = ? AND used = 0', [email])
    this._run('INSERT INTO email_codes (email, code, expires_at) VALUES (?, ?, ?)', [email, code, expiresAt])
    this.store.debouncedSave()
  }

  verifyEmailCode(email, code) {
    const result = this.store.raw(
      'SELECT id FROM email_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1',
      [email, code, Date.now()]
    )
    if (!result || result.length === 0 || result[0].values.length === 0) return false
    const codeId = result[0].values[0][0]
    this._run('UPDATE email_codes SET used = 1 WHERE id = ?', [codeId])
    this.store.debouncedSave()
    return true
  }
}

module.exports = CodeRepository
