/**
 * ScheduleRepository - 定时任务数据访问
 */

const BaseRepository = require('./base-repository')

class ScheduleRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  createSchedule(data) {
    const { teamId, jobType, cronExpression, payload, nextRunAt } = data
    const payloadJson = typeof payload === 'string' ? payload : JSON.stringify(payload)
    this._run(
      `INSERT INTO recurring_schedules (team_id, job_type, cron_expression, payload, enabled, next_run_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [teamId, jobType, cronExpression, payloadJson, nextRunAt || null]
    )
    const id = this._lastInsertId()
    this.store.immediateSave()
    return { id, teamId, jobType, cronExpression, payload, enabled: true, nextRunAt }
  }

  getScheduleById(id) {
    return this._queryOne(
      `SELECT * FROM recurring_schedules WHERE id = ?`,
      [id],
      ['payload']
    )
  }

  getSchedulesByTeam(teamId) {
    return this._queryList(
      `SELECT * FROM recurring_schedules
       WHERE team_id = ?
       ORDER BY created_at DESC`,
      [teamId],
      ['payload']
    )
  }

  getEnabledSchedules() {
    return this._queryList(
      `SELECT * FROM recurring_schedules
       WHERE enabled = 1 AND next_run_at IS NOT NULL
       ORDER BY next_run_at ASC`,
      [],
      ['payload']
    )
  }

  getDueSchedules(now = new Date()) {
    return this._queryList(
      `SELECT * FROM recurring_schedules
       WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?
       ORDER BY next_run_at ASC`,
      [now.toISOString()],
      ['payload']
    )
  }

  updateNextRun(scheduleId, nextRunAt) {
    this._run(
      `UPDATE recurring_schedules
       SET next_run_at = ?, last_run_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nextRunAt, scheduleId]
    )
    this.store.immediateSave()
  }

  toggleSchedule(scheduleId, enabled) {
    this._run(
      `UPDATE recurring_schedules
       SET enabled = ?
       WHERE id = ?`,
      [enabled ? 1 : 0, scheduleId]
    )
    this.store.debouncedSave()
  }

  deleteSchedule(scheduleId) {
    this._run(`DELETE FROM recurring_schedules WHERE id = ?`, [scheduleId])
    this.store.debouncedSave()
  }
}

module.exports = ScheduleRepository
