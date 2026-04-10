/**
 * BusinessRulesRepository - 业务规则数据访问
 */

const BaseRepository = require('./base-repository')

class BusinessRulesRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  createRule(data) {
    const { teamId, ruleType, ruleConfig } = data
    const configJson = typeof ruleConfig === 'string' ? ruleConfig : JSON.stringify(ruleConfig)
    this._run(
      `INSERT INTO business_rules (team_id, rule_type, rule_config, enabled)
       VALUES (?, ?, ?, 1)`,
      [teamId, ruleType, configJson]
    )
    const id = this._lastInsertId()
    this.store.immediateSave()
    return { id, teamId, ruleType, ruleConfig: ruleConfig, enabled: true }
  }

  getRuleById(id) {
    return this._queryOne(
      `SELECT * FROM business_rules WHERE id = ?`,
      [id],
      ['rule_config']
    )
  }

  getRulesByTeam(teamId, filters = {}) {
    let sql = `SELECT * FROM business_rules WHERE team_id = ?`
    const params = [teamId]

    if (filters.enabled !== undefined) {
      sql += ` AND enabled = ?`
      params.push(filters.enabled ? 1 : 0)
    }

    if (filters.ruleType) {
      sql += ` AND rule_type = ?`
      params.push(filters.ruleType)
    }

    sql += ` ORDER BY created_at DESC`

    return this._queryList(sql, params, ['rule_config'])
  }

  getRuleByType(teamId, ruleType) {
    return this._queryOne(
      `SELECT * FROM business_rules
       WHERE team_id = ? AND rule_type = ? AND enabled = 1`,
      [teamId, ruleType],
      ['rule_config']
    )
  }

  updateRuleConfig(ruleId, ruleConfig) {
    const configJson = typeof ruleConfig === 'string' ? ruleConfig : JSON.stringify(ruleConfig)
    this._run(
      `UPDATE business_rules
       SET rule_config = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [configJson, ruleId]
    )
    this.store.debouncedSave()
  }

  toggleRule(ruleId, enabled) {
    this._run(
      `UPDATE business_rules
       SET enabled = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [enabled ? 1 : 0, ruleId]
    )
    this.store.debouncedSave()
  }

  deleteRule(ruleId) {
    this._run(`DELETE FROM business_rules WHERE id = ?`, [ruleId])
    this.store.debouncedSave()
  }
}

module.exports = BusinessRulesRepository
