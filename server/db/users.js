// 统一使用 store-sqlite 的 db 实例，避免两个独立的数据库连接
const { getDb, saveDatabase } = require('./store-sqlite')

// 防抖保存 - 减少磁盘写入
let _saveTimer = null
function debouncedSave() {
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    saveDatabase()
    _saveTimer = null
  }, 500)
}

// 立即保存（用于关键操作如注册、支付）
function immediateSave() {
  if (_saveTimer) {
    clearTimeout(_saveTimer)
    _saveTimer = null
  }
  saveDatabase()
}

class Database {
  // ===== 用户 =====

  static createUser(userData) {
    const db = getDb()
    const { email, industry, scale, role, inviteCode } = userData

    try {
      db.run(
        `INSERT INTO users (email, industry, scale, role, invite_code)
         VALUES (?, ?, ?, ?, ?)`,
        [email, industry, scale, role, inviteCode]
      )
      const id = Database._lastInsertRowId(db)
      immediateSave()

      return { id, email, industry, scale, role, inviteCode, inviteProgress: 0, refunded: false }
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        throw new Error('该邮箱已注册')
      }
      throw error
    }
  }

  static getUserByEmail(email) {
    return Database._queryOne(getDb(), `SELECT * FROM users WHERE email = ?`, [email])
  }

  static getUserById(id) {
    return Database._queryOne(getDb(), `SELECT * FROM users WHERE id = ?`, [id])
  }

  static getUserByInviteCode(code) {
    return Database._queryOne(getDb(), `SELECT * FROM users WHERE invite_code = ?`, [code])
  }

  static updateInviteProgress(userId, progress) {
    getDb().run(`UPDATE users SET invite_progress = ? WHERE id = ?`, [progress, userId])
    debouncedSave()
  }

  static markRefunded(userId) {
    getDb().run(`UPDATE users SET refunded = 1 WHERE id = ?`, [userId])
    debouncedSave()
  }

  static getAllUsers(limit = 50, offset = 0) {
    return Database._queryList(getDb(), `SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit, offset])
  }

  // ===== 验证码 =====

  static createEmailCode(email, code, expiresAt) {
    const db = getDb()
    db.run(`UPDATE email_codes SET used = 1 WHERE email = ? AND used = 0`, [email])
    db.run(`INSERT INTO email_codes (email, code, expires_at) VALUES (?, ?, ?)`, [email, code, expiresAt])
    debouncedSave()
  }

  static verifyEmailCode(email, code) {
    const db = getDb()
    const result = db.exec(
      `SELECT id FROM email_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1`,
      [email, code, Date.now()]
    )
    if (result.length === 0 || result[0].values.length === 0) return false
    const codeId = result[0].values[0][0]
    db.run(`UPDATE email_codes SET used = 1 WHERE id = ?`, [codeId])
    debouncedSave()
    return true
  }

  // ===== Agent =====

  static createAgent(agentData) {
    const db = getDb()
    const { userId, name, industry, description, config, score, skills, constraints } = agentData
    db.run(
      `INSERT INTO agents (user_id, name, industry, description, config, score, skills, constraints)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, industry, description, JSON.stringify(config || {}), score, JSON.stringify(skills || []), JSON.stringify(constraints || [])]
    )
    const id = Database._lastInsertRowId(db)
    immediateSave()
    return { id, ...agentData }
  }

  static getAgentsByUserId(userId) {
    return Database._queryList(getDb(),
      `SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC`, [userId],
      ['config', 'skills', 'constraints']
    )
  }

  static getAgentById(id) {
    return Database._queryOne(getDb(), `SELECT * FROM agents WHERE id = ?`, [id], ['config', 'skills', 'constraints'])
  }

  static getAgentByIdForUser(agentId, userId) {
    return Database._queryOne(getDb(),
      `SELECT * FROM agents WHERE id = ? AND user_id = ?`, [parseInt(agentId), userId],
      ['config', 'skills', 'constraints']
    )
  }

  static deleteAgent(agentId, userId) {
    getDb().run(`DELETE FROM agents WHERE id = ? AND user_id = ?`, [agentId, userId])
    immediateSave()
  }

  // ===== 聊天消息 =====

  static saveChatMessage(agentId, userId, role, content) {
    getDb().run(
      `INSERT INTO chat_messages (agent_id, user_id, role, content) VALUES (?, ?, ?, ?)`,
      [parseInt(agentId), userId, role, content]
    )
    debouncedSave()
  }

  static getChatMessages(agentId, userId, limit = 50) {
    return Database._queryList(getDb(),
      `SELECT role, content, created_at FROM chat_messages WHERE agent_id = ? AND user_id = ? ORDER BY created_at ASC LIMIT ?`,
      [parseInt(agentId), userId, Math.min(limit, 200)]
    )
  }

  // ===== 订单 =====

  static createOrder(orderData) {
    const db = getDb()
    const { userId, agentId, amount, tradeNo } = orderData
    db.run(
      `INSERT INTO orders (user_id, agent_id, amount, trade_no, status) VALUES (?, ?, ?, ?, 'pending')`,
      [userId, agentId || null, amount, tradeNo]
    )
    const id = Database._lastInsertRowId(db)
    immediateSave()
    return { id, ...orderData, status: 'pending' }
  }

  static updateOrderStatus(orderId, status, payTime = null) {
    getDb().run(`UPDATE orders SET status = ?, pay_time = ? WHERE id = ?`, [status, payTime, orderId])
    debouncedSave()
  }

  static getOrderByTradeNo(tradeNo) {
    return Database._queryOne(getDb(), `SELECT * FROM orders WHERE trade_no = ?`, [tradeNo])
  }

  static getOrdersByUserId(userId) {
    return Database._queryList(getDb(), `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, [userId])
  }

  // ===== 管理后台 =====

  static getFullStats() {
    const db = getDb()
    try {
      const r = db.exec(`
        SELECT
          (SELECT COUNT(*) FROM users) as userCount,
          (SELECT COUNT(*) FROM agents) as agentCount,
          (SELECT COUNT(*) FROM orders) as orderCount,
          (SELECT COALESCE(SUM(amount), 0) FROM orders WHERE status = 'paid') as revenue,
          (SELECT COUNT(*) FROM users WHERE refunded = 1) as refundedCount,
          (SELECT COUNT(*) FROM tickets WHERE status = 'pending') as pendingTickets
      `)
      if (r.length > 0 && r[0].values.length > 0) {
        const cols = r[0].columns
        const vals = r[0].values[0]
        const obj = {}
        cols.forEach((c, i) => { obj[c] = vals[i] })
        return obj
      }
    } catch { /* empty */ }
    return { userCount: 0, agentCount: 0, orderCount: 0, revenue: 0, refundedCount: 0, pendingTickets: 0 }
  }

  static getAllOrdersWithUser(limit = 100) {
    const db = getDb()
    const result = db.exec(`
      SELECT o.*, u.email as user_email
      FROM orders o LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC LIMIT ?
    `, [limit])
    if (result.length === 0) return []
    return result[0].values.map(v => {
      const cols = result[0].columns
      const obj = {}
      cols.forEach((c, i) => { obj[c] = v[i] })
      return obj
    })
  }

  static getRecentTickets(limit = 100) {
    return Database._queryList(getDb(), `SELECT * FROM tickets ORDER BY created_at DESC LIMIT ?`, [limit])
  }

  static updateTicketStatus(ticketId, status) {
    getDb().run(`UPDATE tickets SET status = ? WHERE id = ?`, [status, parseInt(ticketId)])
    debouncedSave()
  }

  static getRecentKnowledge(limit = 100) {
    return Database._queryList(getDb(), `SELECT * FROM knowledge ORDER BY created_at DESC LIMIT ?`, [limit])
  }

  static addKnowledge(industry, keyword, content, source) {
    getDb().run(
      `INSERT INTO knowledge (industry, keyword, content, source) VALUES (?, ?, ?, ?)`,
      [industry, keyword || '', content, source || '']
    )
    debouncedSave()
  }

  // ===== 工具方法 =====

  static _lastInsertRowId(db) {
    const r = db.exec('SELECT last_insert_rowid()')
    return r.length > 0 ? r[0].values[0][0] : null
  }

  static _queryOne(db, sql, params, jsonFields = []) {
    const result = db.exec(sql, params)
    if (result.length === 0 || result[0].values.length === 0) return null
    return Database._rowToObject(result[0].columns, result[0].values[0], jsonFields)
  }

  static _queryList(db, sql, params, jsonFields = []) {
    const result = db.exec(sql, params)
    if (result.length === 0) return []
    return result[0].values.map(v => Database._rowToObject(result[0].columns, v, jsonFields))
  }

  static _rowToObject(columns, values, jsonFields = []) {
    const obj = {}
    columns.forEach((col, index) => {
      if (jsonFields.includes(col)) {
        try { obj[col] = JSON.parse(values[index]) } catch { obj[col] = values[index] }
      } else {
        obj[col] = values[index]
      }
    })
    return obj
  }
}

module.exports = Database
module.exports.formatUserResponse = function(user) {
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
