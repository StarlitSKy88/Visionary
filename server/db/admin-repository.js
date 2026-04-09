/**
 * AdminRepository - 管理后台数据访问（聚合查询、工单、知识库）
 */

const BaseRepository = require('./base-repository')

class AdminRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  getFullStats() {
    try {
      const r = this.store.raw(`
        SELECT
          (SELECT COUNT(*) FROM users) as userCount,
          (SELECT COUNT(*) FROM agents) as agentCount,
          (SELECT COUNT(*) FROM orders) as orderCount,
          (SELECT COALESCE(SUM(amount), 0) FROM orders WHERE status = 'paid') as revenue,
          (SELECT COUNT(*) FROM users WHERE refunded = 1) as refundedCount,
          (SELECT COUNT(*) FROM tickets WHERE status = 'pending') as pendingTickets
      `)
      if (r && r.length > 0 && r[0].values.length > 0) {
        const cols = r[0].columns
        const vals = r[0].values[0]
        const obj = {}
        cols.forEach((c, i) => { obj[c] = vals[i] })
        return obj
      }
    } catch { /* empty */ }
    return { userCount: 0, agentCount: 0, orderCount: 0, revenue: 0, refundedCount: 0, pendingTickets: 0 }
  }

  // ===== 工单 =====

  getRecentTickets(limit = 100) {
    return this._queryList('SELECT * FROM tickets ORDER BY created_at DESC LIMIT ?', [limit])
  }

  updateTicketStatus(ticketId, status) {
    this._run('UPDATE tickets SET status = ? WHERE id = ?', [status, parseInt(ticketId)])
    this.store.debouncedSave()
  }

  // ===== 知识库 =====

  getRecentKnowledge(limit = 100) {
    return this._queryList('SELECT * FROM knowledge ORDER BY created_at DESC LIMIT ?', [limit])
  }

  addKnowledge(industry, keyword, content, source) {
    this._run(
      'INSERT INTO knowledge (industry, keyword, content, source) VALUES (?, ?, ?, ?)',
      [industry, keyword || '', content, source || '']
    )
    this.store.debouncedSave()
  }
}

module.exports = AdminRepository
