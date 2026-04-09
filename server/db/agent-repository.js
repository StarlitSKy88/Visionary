/**
 * AgentRepository - Agent 数据访问
 */

const BaseRepository = require('./base-repository')

class AgentRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  createAgent(agentData) {
    const { userId, name, industry, description, config, score, skills, constraints } = agentData
    this._run(
      `INSERT INTO agents (user_id, name, industry, description, config, score, skills, constraints)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, industry, description,
        JSON.stringify(config || {}), score,
        JSON.stringify(skills || []), JSON.stringify(constraints || [])]
    )
    const id = this._lastInsertId()
    this.store.immediateSave()
    return { id, ...agentData }
  }

  getAgentsByUserId(userId) {
    return this._queryList(
      'SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
      ['config', 'skills', 'constraints']
    )
  }

  getAgentById(id) {
    return this._queryOne(
      'SELECT * FROM agents WHERE id = ?',
      [id],
      ['config', 'skills', 'constraints']
    )
  }

  getAgentByIdForUser(agentId, userId) {
    return this._queryOne(
      'SELECT * FROM agents WHERE id = ? AND user_id = ?',
      [parseInt(agentId), userId],
      ['config', 'skills', 'constraints']
    )
  }

  deleteAgent(agentId, userId) {
    this._run('DELETE FROM agents WHERE id = ? AND user_id = ?', [agentId, userId])
    this.store.immediateSave()
  }

  // ===== 聊天消息 =====

  saveChatMessage(agentId, userId, role, content) {
    this._run(
      'INSERT INTO chat_messages (agent_id, user_id, role, content) VALUES (?, ?, ?, ?)',
      [parseInt(agentId), userId, role, content]
    )
    this.store.debouncedSave()
  }

  getChatMessages(agentId, userId, limit = 50) {
    return this._queryList(
      'SELECT role, content, created_at FROM chat_messages WHERE agent_id = ? AND user_id = ? ORDER BY created_at ASC LIMIT ?',
      [parseInt(agentId), userId, Math.min(limit, 200)]
    )
  }
}

module.exports = AgentRepository
