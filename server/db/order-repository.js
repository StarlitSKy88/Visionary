/**
 * OrderRepository - 订单数据访问
 */

const BaseRepository = require('./base-repository')

class OrderRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  createOrder(orderData) {
    const { userId, agentId, amount, tradeNo } = orderData
    this._run(
      "INSERT INTO orders (user_id, agent_id, amount, trade_no, status) VALUES (?, ?, ?, ?, 'pending')",
      [userId, agentId || null, amount, tradeNo]
    )
    const id = this._lastInsertId()
    this.store.immediateSave()
    return { id, ...orderData, status: 'pending' }
  }

  updateOrderStatus(orderId, status, payTime = null) {
    this._run('UPDATE orders SET status = ?, pay_time = ? WHERE id = ?', [status, payTime, orderId])
    this.store.debouncedSave()
  }

  getOrderByTradeNo(tradeNo) {
    return this._queryOne('SELECT * FROM orders WHERE trade_no = ?', [tradeNo])
  }

  getOrdersByUserId(userId) {
    return this._queryList(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    )
  }

  getAllOrdersWithUser(limit = 100) {
    const result = this.store.raw(
      `SELECT o.*, u.email as user_email
       FROM orders o LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC LIMIT ?`,
      [limit]
    )
    if (!result || result.length === 0) return []

    const cols = result[0].columns
    return result[0].values.map(v => {
      const obj = {}
      cols.forEach((c, i) => { obj[c] = v[i] })
      return obj
    })
  }
}

module.exports = OrderRepository
