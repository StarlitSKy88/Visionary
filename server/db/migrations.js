/**
 * 数据库迁移管理器
 * 使用 migrations 表跟踪已执行的迁移
 */

const fs = require('fs')
const path = require('path')

// 迁移记录表（初始化时立即创建）
const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS __migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT DEFAULT (datetime('now'))
)
`

/**
 * 执行所有待定迁移
 */
function runMigrations(store) {
  // 先创建 migrations 表
  store.run(MIGRATIONS_TABLE)

  // 获取已执行的迁移
  const applied = store.queryList('SELECT name FROM __migrations')
  const appliedNames = new Set(applied.map(r => r.name))

  // 定义所有迁移（按顺序）
  const migrations = [
    {
      name: '001_add_audit_logs',
      sql: `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          team_id INTEGER,
          actor_user_id INTEGER,
          action TEXT NOT NULL,
          target_type TEXT,
          target_id INTEGER,
          details TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_audit_team ON audit_logs(team_id);
        CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id);
      `
    },
    {
      name: '002_add_leave_balances_index',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_leave_balances_member ON leave_balances(team_member_id);
      `
    },
    {
      name: '003_add_team_members_index',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON team_members(team_id, user_id);
      `
    },
    {
      name: '004_add_chat_feedbacks',
      sql: `
        CREATE TABLE IF NOT EXISTS chat_feedbacks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          agent_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          message_content TEXT NOT NULL,
          feedback_type TEXT NOT NULL CHECK(feedback_type IN ('thumbs_up', 'thumbs_down')),
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (agent_id) REFERENCES agents(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_chat_feedbacks_agent ON chat_feedbacks(agent_id);
        CREATE INDEX IF NOT EXISTS idx_chat_feedbacks_user ON chat_feedbacks(user_id);
      `
    },
    {
      name: '005_add_inquiry_sessions',
      sql: `
        CREATE TABLE IF NOT EXISTS inquiry_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          lang TEXT NOT NULL DEFAULT 'zh' CHECK(lang IN ('zh', 'en')),
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'waiting_payment', 'completed', 'expired')),
          dimension_answers TEXT DEFAULT '[]',
          round_count INTEGER NOT NULL DEFAULT 0,
          payment_deadline TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_inquiry_user ON inquiry_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_inquiry_status ON inquiry_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_inquiry_updated ON inquiry_sessions(updated_at);
      `
    },
    {
      name: '006_add_reports',
      sql: `
        CREATE TABLE IF NOT EXISTS reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL,
          encrypted_content TEXT,
          status TEXT NOT NULL DEFAULT 'pending_payment' CHECK(status IN ('pending_payment', 'generating', 'completed', 'failed', 'expired')),
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          expires_at TEXT,
          FOREIGN KEY (session_id) REFERENCES inquiry_sessions(id)
        );
        CREATE INDEX IF NOT EXISTS idx_reports_session ON reports(session_id);
        CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
        CREATE INDEX IF NOT EXISTS idx_reports_expires ON reports(expires_at);
      `
    },
    {
      name: '007_add_followup_tracking',
      sql: `
        -- Q1: 添加追问次数跟踪字段
        ALTER TABLE reports ADD COLUMN followup_count INTEGER NOT NULL DEFAULT 0;
      `
    },
    {
      name: '008_add_sbti_sessions',
      sql: `
        CREATE TABLE IF NOT EXISTS sbti_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          device_id TEXT,
          lang TEXT NOT NULL DEFAULT 'zh' CHECK(lang IN ('zh', 'en')),
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'abandoned')),
          current_question INTEGER NOT NULL DEFAULT 0,
          answers TEXT DEFAULT '[]',
          personality_id TEXT,
          sbti_scores TEXT,
          business_data TEXT,
          share_code TEXT UNIQUE,
          share_opens INTEGER NOT NULL DEFAULT 0,
          report_unlocked INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          completed_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_sbti_device ON sbti_sessions(device_id);
        CREATE INDEX IF NOT EXISTS idx_sbti_status ON sbti_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_sbti_share_code ON sbti_sessions(share_code);
      `
    },
    {
      name: '009_add_share_records',
      sql: `
        CREATE TABLE IF NOT EXISTS share_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          share_code TEXT NOT NULL,
          visitor_ip TEXT,
          visitor_id TEXT,
          opened_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (share_code) REFERENCES sbti_sessions(share_code)
        );
        CREATE INDEX IF NOT EXISTS idx_share_code ON share_records(share_code);
        CREATE INDEX IF NOT EXISTS idx_share_opened ON share_records(opened_at);
      `
    },
    {
      name: '010_add_personality_results',
      sql: `
        CREATE TABLE IF NOT EXISTS personality_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL,
          user_id INTEGER,
          device_id TEXT,
          personality_id TEXT NOT NULL,
          personality_data TEXT,
          sbti_scores TEXT,
          business_data TEXT,
          card_image_url TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (session_id) REFERENCES sbti_sessions(id)
        );
        CREATE INDEX IF NOT EXISTS idx_personality_session ON personality_results(session_id);
        CREATE INDEX IF NOT EXISTS idx_personality_device ON personality_results(device_id);
      `
    },
  ]

  let appliedCount = 0
  for (const m of migrations) {
    if (appliedNames.has(m.name)) continue

    try {
      // 分割多个SQL语句并逐个执行
      const statements = m.sql.split(';').filter(s => s.trim())
      for (const stmt of statements) {
        if (stmt.trim()) store.run(stmt)
      }
      store.run('INSERT INTO __migrations (name) VALUES (?)', [m.name])
      console.log(`✅ 迁移已应用: ${m.name}`)
      appliedCount++
    } catch (e) {
      console.error(`❌ 迁移失败: ${m.name}`, e.message)
      throw e
    }
  }

  return appliedCount
}

/**
 * 重置迁移状态（用于测试）
 */
function resetMigrations(store) {
  store.run("DELETE FROM __migrations WHERE name LIKE '00%'")
}

module.exports = { runMigrations, resetMigrations }
