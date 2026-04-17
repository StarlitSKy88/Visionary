/**
 * TokenUsage Repository - Token 用量追踪
 */

const BaseRepository = require('./base-repository')

class TokenUsageRepository extends BaseRepository {
  constructor(store) {
    super(store)
  }

  /**
   * 初始化 token_usage 表
   */
  ensureTable() {
    this._run(`
      CREATE TABLE IF NOT EXISTS token_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        task_type TEXT,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        latency_ms INTEGER,
        user_id INTEGER,
        session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.store.debouncedSave()
  }

  recordUsage(data) {
    const { provider, model, taskType, inputTokens, outputTokens, latencyMs, userId, sessionId } = data
    this._run(
      `INSERT INTO token_usage (provider, model, task_type, input_tokens, output_tokens, latency_ms, user_id, session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [provider, model, taskType || '', inputTokens || 0, outputTokens || 0, latencyMs || 0, userId || null, sessionId || '']
    )
    this.store.debouncedSave()
  }

  getUsageStats(days = 30) {
    return this._queryOne(`
      SELECT
        COUNT(*) as totalCalls,
        SUM(input_tokens) as totalInputTokens,
        SUM(output_tokens) as totalOutputTokens,
        SUM(input_tokens + output_tokens) as totalTokens,
        AVG(latency_ms) as avgLatency,
        SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as todayCalls,
        SUM(CASE WHEN date(created_at) = date('now') THEN input_tokens + output_tokens ELSE 0 END) as todayTokens
      FROM token_usage
      WHERE created_at > datetime('now', '-${days} days')
    `)
  }

  getUsageByModel(days = 30) {
    return this._queryList(`
      SELECT provider, model, COUNT(*) as calls,
        SUM(input_tokens) as inputTokens,
        SUM(output_tokens) as outputTokens,
        AVG(latency_ms) as avgLatency
      FROM token_usage
      WHERE created_at > datetime('now', '-${days} days')
      GROUP BY provider, model
      ORDER BY calls DESC
    `)
  }

  getUsageByTask(days = 30) {
    return this._queryList(`
      SELECT task_type as taskType, COUNT(*) as calls,
        SUM(input_tokens + output_tokens) as totalTokens
      FROM token_usage
      WHERE created_at > datetime('now', '-${days} days')
      GROUP BY task_type
      ORDER BY calls DESC
    `)
  }

  getRecentUsage(limit = 50) {
    return this._queryList(
      'SELECT * FROM token_usage ORDER BY created_at DESC LIMIT ?',
      [limit]
    )
  }

  /**
   * 获取用户当月 token 用量
   */
  getUserMonthlyUsage(userId) {
    return this._queryOne(`
      SELECT
        COALESCE(SUM(input_tokens), 0) as inputTokens,
        COALESCE(SUM(output_tokens), 0) as outputTokens,
        COALESCE(SUM(input_tokens + output_tokens), 0) as totalTokens,
        COUNT(*) as callCount
      FROM token_usage
      WHERE user_id = ?
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `, [userId])
  }
}

module.exports = TokenUsageRepository
