/**
 * UserRepository - 用户数据访问
 * 继承 BaseRepository，通过 store 适配器访问数据
 */

const BaseRepository = require('./base-repository')

class UserRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  /**
   * 创建用户
   */
  createUser(userData) {
    const { email, industry, scale, role, inviteCode } = userData

    try {
      this._run(
        `INSERT INTO users (email, industry, scale, role, invite_code)
         VALUES (?, ?, ?, ?, ?)`,
        [email, industry, scale, role, inviteCode]
      )
      const id = this._lastInsertId()
      this.store.immediateSave()

      return { id, email, industry, scale, role, inviteCode, inviteProgress: 0, refunded: false }
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        throw new Error('该邮箱已注册')
      }
      throw error
    }
  }

  getUserByEmail(email) {
    return this._queryOne('SELECT * FROM users WHERE email = ?', [email])
  }

  getUserById(id) {
    return this._queryOne('SELECT * FROM users WHERE id = ?', [id])
  }

  getUserByInviteCode(code) {
    return this._queryOne('SELECT * FROM users WHERE invite_code = ?', [code])
  }

  updateInviteProgress(userId, progress) {
    this._run('UPDATE users SET invite_progress = ? WHERE id = ?', [progress, userId])
    this.store.debouncedSave()
  }

  markRefunded(userId) {
    this._run('UPDATE users SET refunded = 1 WHERE id = ?', [userId])
    this.store.debouncedSave()
  }

  getAllUsers(limit = 50, offset = 0) {
    return this._queryList(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    )
  }

  /**
   * 格式化用户响应（去除敏感字段，统一命名）
   */
  static formatResponse(user) {
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      industry: user.industry,
      scale: user.scale,
      role: user.role,
      inviteCode: user.invite_code,
      inviteProgress: user.invite_progress || 0,
      refunded: user.refunded === 1,
    }
  }
}

module.exports = UserRepository
