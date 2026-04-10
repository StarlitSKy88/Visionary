/**
 * TeamMemberRepository - 团队成员数据访问
 */

const BaseRepository = require('./base-repository')

class TeamMemberRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  addMember(data) {
    const { teamId, userId, role = 'member' } = data
    try {
      this._run(
        `INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)`,
        [teamId, userId, role]
      )
      const id = this._lastInsertId()
      this.store.immediateSave()

      // 初始化该成员的请假余额
      this._initLeaveBalances(id)

      return { id, teamId, userId, role }
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        throw new Error('该成员已在团队中')
      }
      throw error
    }
  }

  _initLeaveBalances(teamMemberId) {
    const leaveTypes = ['annual', 'sick', 'personal']
    const year = new Date().getFullYear()
    for (const type of leaveTypes) {
      this._run(
        `INSERT INTO leave_balances (team_member_id, leave_type, total_days, used_days, year)
         VALUES (?, ?, ?, ?, ?)`,
        [teamMemberId, type, type === 'annual' ? 10 : type === 'sick' ? 5 : 3, 0, year]
      )
    }
  }

  getMemberById(id) {
    return this._queryOne(
      `SELECT tm.*, u.email, u.industry, u.scale,
              t.name as team_name
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.id = ?`,
      [id]
    )
  }

  getMemberByUserAndTeam(userId, teamId) {
    return this._queryOne(
      `SELECT tm.*, u.email, u.industry, u.scale
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.user_id = ? AND tm.team_id = ?`,
      [userId, teamId]
    )
  }

  getMembersByTeam(teamId) {
    return this._queryList(
      `SELECT tm.*, u.email, u.industry, u.scale
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ?
       ORDER BY tm.joined_at DESC`,
      [teamId]
    )
  }

  updateMemberRole(memberId, role) {
    this._run(`UPDATE team_members SET role = ? WHERE id = ?`, [role, memberId])
    this.store.debouncedSave()
  }

  removeMember(memberId) {
    this._run(`DELETE FROM team_members WHERE id = ?`, [memberId])
    this.store.debouncedSave()
  }

  getMemberCount(teamId) {
    return this._queryOne(
      `SELECT COUNT(*) as count FROM team_members WHERE team_id = ?`,
      [teamId]
    )
  }
}

module.exports = TeamMemberRepository
