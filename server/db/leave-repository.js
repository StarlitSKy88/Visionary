/**
 * LeaveRepository - 请假数据访问
 */

const BaseRepository = require('./base-repository')

class LeaveRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  createRequest(data) {
    const { teamMemberId, leaveType, startDate, endDate, days, reason } = data
    this._run(
      `INSERT INTO leave_requests (team_member_id, leave_type, start_date, end_date, days, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [teamMemberId, leaveType, startDate, endDate, days, reason || '']
    )
    const id = this._lastInsertId()
    this.store.immediateSave()
    return { id, teamMemberId, leaveType, startDate, endDate, days, reason, status: 'pending' }
  }

  getRequestById(id) {
    return this._queryOne(
      `SELECT lr.*, tm.user_id, tm.team_id, u.email,
              reviewer.email as reviewer_email
       FROM leave_requests lr
       JOIN team_members tm ON lr.team_member_id = tm.id
       JOIN users u ON tm.user_id = u.id
       LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
       WHERE lr.id = ?`,
      [id]
    )
  }

  getRequestsByTeam(teamId, filters = {}) {
    let sql = `SELECT lr.*, tm.user_id, u.email as member_email
               FROM leave_requests lr
               JOIN team_members tm ON lr.team_member_id = tm.id
               JOIN users u ON tm.user_id = u.id
               WHERE tm.team_id = ?`
    const params = [teamId]

    if (filters.status) {
      sql += ` AND lr.status = ?`
      params.push(filters.status)
    }

    if (filters.memberId) {
      sql += ` AND tm.id = ?`
      params.push(filters.memberId)
    }

    sql += ` ORDER BY lr.created_at DESC`

    if (filters.limit) {
      sql += ` LIMIT ?`
      params.push(filters.limit)
    }

    return this._queryList(sql, params)
  }

  getRequestsByMember(teamMemberId) {
    return this._queryList(
      `SELECT * FROM leave_requests
       WHERE team_member_id = ?
       ORDER BY created_at DESC`,
      [teamMemberId]
    )
  }

  updateRequestStatus(requestId, status, reviewerId) {
    this._run(
      `UPDATE leave_requests
       SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, reviewerId, requestId]
    )
    this.store.immediateSave()
  }

  // ===== 请假余额 =====

  getBalance(teamMemberId, year = new Date().getFullYear()) {
    return this._queryList(
      `SELECT * FROM leave_balances
       WHERE team_member_id = ? AND year = ?`,
      [teamMemberId, year]
    )
  }

  getBalanceByType(teamMemberId, leaveType, year = new Date().getFullYear()) {
    return this._queryOne(
      `SELECT * FROM leave_balances
       WHERE team_member_id = ? AND leave_type = ? AND year = ?`,
      [teamMemberId, leaveType, year]
    )
  }

  updateBalance(teamMemberId, leaveType, usedDays, year = new Date().getFullYear()) {
    this._run(
      `UPDATE leave_balances
       SET used_days = ?
       WHERE team_member_id = ? AND leave_type = ? AND year = ?`,
      [usedDays, teamMemberId, leaveType, year]
    )
    this.store.debouncedSave()
  }

  setBalance(teamMemberId, leaveType, totalDays, year = new Date().getFullYear()) {
    const existing = this.getBalanceByType(teamMemberId, leaveType, year)
    if (existing) {
      this._run(
        `UPDATE leave_balances
         SET total_days = ?
         WHERE team_member_id = ? AND leave_type = ? AND year = ?`,
        [totalDays, teamMemberId, leaveType, year]
      )
    } else {
      this._run(
        `INSERT INTO leave_balances (team_member_id, leave_type, total_days, used_days, year)
         VALUES (?, ?, ?, 0, ?)`,
        [teamMemberId, leaveType, totalDays, year]
      )
    }
    this.store.debouncedSave()
  }

  getAvailableDays(teamMemberId, leaveType, year = new Date().getFullYear()) {
    const balance = this.getBalanceByType(teamMemberId, leaveType, year)
    if (!balance) return 0
    return balance.total_days - balance.used_days
  }
}

module.exports = LeaveRepository
