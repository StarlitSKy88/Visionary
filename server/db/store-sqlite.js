/**
 * SQLite (sql.js) 存储适配器
 * 实现 StoreInterface，为 Repository 层提供统一的数据访问
 */

const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')

const dbPath = path.join(__dirname, '../../data/database.sqlite')
let db = null

// 防抖保存
let _saveTimer = null
function debouncedSave() {
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    saveDatabase()
    _saveTimer = null
  }, 500)
}

function immediateSave() {
  if (_saveTimer) {
    clearTimeout(_saveTimer)
    _saveTimer = null
  }
  saveDatabase()
}

function saveDatabase() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

/**
 * 初始化数据库（建表）
 */
async function initDatabase() {
  const SQL = await initSqlJs()

  const dataDir = path.dirname(dbPath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  // 建表
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      industry TEXT,
      scale TEXT,
      role TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      invite_code TEXT UNIQUE,
      invited_by INTEGER,
      invite_progress INTEGER DEFAULT 0,
      invited_at DATETIME,
      refunded INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      industry TEXT,
      description TEXT,
      config TEXT,
      score INTEGER,
      skills TEXT,
      constraints TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      agent_id INTEGER,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      trade_no TEXT,
      pay_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      agent_id INTEGER,
      type TEXT NOT NULL,
      content TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      industry TEXT NOT NULL,
      keyword TEXT,
      content TEXT,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS agent_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      round INTEGER,
      agent_name TEXT,
      action TEXT,
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    )`,
    `CREATE TABLE IF NOT EXISTS email_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
  ]

  for (const sql of tables) {
    db.run(sql)
  }

  saveDatabase()
  console.log('✅ Database initialized at', dbPath)
}

/**
 * SQLite 存储适配器
 * 实现 StoreInterface 供 Repository 使用
 */
const store = {
  /**
   * 执行写 SQL
   */
  run(sql, params = []) {
    return db.run(sql, params)
  },

  /**
   * 查询单条记录
   */
  queryOne(sql, params = [], jsonFields = []) {
    const result = db.exec(sql, params)
    if (result.length === 0 || result[0].values.length === 0) return null
    return _rowToObject(result[0].columns, result[0].values[0], jsonFields)
  },

  /**
   * 查询多条记录
   */
  queryList(sql, params = [], jsonFields = []) {
    const result = db.exec(sql, params)
    if (result.length === 0) return []
    return result[0].values.map(v => _rowToObject(result[0].columns, v, jsonFields))
  },

  /**
   * 获取最后插入行 ID
   */
  lastInsertId() {
    const r = db.exec('SELECT last_insert_rowid()')
    return r.length > 0 ? r[0].values[0][0] : null
  },

  /**
   * 执行原始 SQL（用于复杂聚合查询）
   */
  raw(sql, params = []) {
    return db.exec(sql, params)
  },

  /**
   * 防抖保存
   */
  debouncedSave,

  /**
   * 立即保存（用于关键操作）
   */
  immediateSave,

  /**
   * 获取原始 db 实例（兼容期使用，新代码应避免）
   */
  getRawDb() {
    return db
  },
}

function _rowToObject(columns, values, jsonFields = []) {
  const obj = {}
  columns.forEach((col, index) => {
    if (jsonFields.includes(col)) {
      try { obj[col] = JSON.parse(values[index]) } catch { obj[col] = values[index] }
    } else {
      obj[col] = values[index]
    }
  })
  return obj
}

module.exports = { store, initDatabase, saveDatabase, getDb: () => db }
