/**
 * TeamRepository - 团队数据访问
 */

const BaseRepository = require('./base-repository')

class TeamRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  createTeam(data) {
    const { name, ownerUserId } = data
    this._run(
      `INSERT INTO teams (name, owner_user_id) VALUES (?, ?)`,
      [name, ownerUserId]
    )
    const id = this._lastInsertId()
    this.store.immediateSave()
    return { id, name, ownerUserId }
  }

  getTeamById(id) {
    return this._queryOne(
      `SELECT t.*, u.email as owner_email
       FROM teams t
       JOIN users u ON t.owner_user_id = u.id
       WHERE t.id = ?`,
      [id]
    )
  }

  getTeamsByOwner(ownerUserId) {
    return this._queryList(
      `SELECT t.*, u.email as owner_email
       FROM teams t
       JOIN users u ON t.owner_user_id = u.id
       WHERE t.owner_user_id = ?
       ORDER BY t.created_at DESC`,
      [ownerUserId]
    )
  }

  updateTeamName(teamId, name) {
    this._run(`UPDATE teams SET name = ? WHERE id = ?`, [name, teamId])
    this.store.debouncedSave()
  }

  deleteTeam(teamId) {
    this._run(`DELETE FROM teams WHERE id = ?`, [teamId])
    this.store.debouncedSave()
  }
}

module.exports = TeamRepository
