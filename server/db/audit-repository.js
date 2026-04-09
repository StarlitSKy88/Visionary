/**
 * AuditRepository - 审计日志数据访问
 */

const BaseRepository = require('./base-repository')

class AuditRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  log(data) {
    const { teamId, actorUserId, action, targetType, targetId, details } = data
    const detailsJson = typeof details === 'string' ? details : JSON.stringify(details || {})
    this._run(
      `INSERT INTO audit_logs (team_id, actor_user_id, action, target_type, target_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [teamId, actorUserId, action, targetType || null, targetId || null, detailsJson]
    )
    const id = this._lastInsertId()
    this.store.debouncedSave()
    return { id, teamId, actorUserId, action }
  }

  getLogsByTeam(teamId, filters = {}) {
    let sql = `SELECT al.*, u.email as actor_email
               FROM audit_logs al
               JOIN users u ON al.actor_user_id = u.id
               WHERE al.team_id = ?`
    const params = [teamId]

    if (filters.action) {
      sql += ` AND al.action = ?`
      params.push(filters.action)
    }

    if (filters.targetType) {
      sql += ` AND al.target_type = ?`
      params.push(filters.targetType)
    }

    if (filters.actorUserId) {
      sql += ` AND al.actor_user_id = ?`
      params.push(filters.actorUserId)
    }

    if (filters.fromDate) {
      sql += ` AND al.created_at >= ?`
      params.push(filters.fromDate)
    }

    if (filters.toDate) {
      sql += ` AND al.created_at <= ?`
      params.push(filters.toDate)
    }

    sql += ` ORDER BY al.created_at DESC`

    if (filters.limit) {
      sql += ` LIMIT ?`
      params.push(filters.limit)
    } else {
      sql += ` LIMIT 100`
    }

    return this._queryList(sql, params, ['details'])
  }

  getLogsByTarget(targetType, targetId) {
    return this._queryList(
      `SELECT al.*, u.email as actor_email
       FROM audit_logs al
       JOIN users u ON al.actor_user_id = u.id
       WHERE al.target_type = ? AND al.target_id = ?
       ORDER BY al.created_at DESC`,
      [targetType, targetId],
      ['details']
    )
  }

  getRecentLogs(teamId, limit = 20) {
    return this._queryList(
      `SELECT al.*, u.email as actor_email
       FROM audit_logs al
       JOIN users u ON al.actor_user_id = u.id
       WHERE al.team_id = ?
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [teamId, limit],
      ['details']
    )
  }
}

module.exports = AuditRepository
