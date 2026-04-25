import initSqlJs, { Database } from 'sql.js'
import path from 'path'
import fs from 'fs'

let db: Database | null = null
const DB_PATH = path.join(process.cwd(), 'data', 'sbti.sqlite')

export async function getDb(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()

  // 尝试加载已有数据库
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
    initSchema(db)
  }

  return db
}

export function initSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS sbti_sessions (
      id TEXT PRIMARY KEY,
      device_id TEXT,
      lang TEXT DEFAULT 'zh',
      current_question_index INTEGER DEFAULT 0,
      dimension_scores TEXT DEFAULT '{}',
      share_code TEXT,
      share_url TEXT,
      share_opens INTEGER DEFAULT 0,
      share_unlocked INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sbti_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      question_id INTEGER,
      answer TEXT,
      dimension_scores TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sbti_sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_answers_session ON sbti_answers(session_id);
  `)
}

export function saveDb(database: Database) {
  const data = database.export()
  const buffer = Buffer.from(data)
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DB_PATH, buffer)
}

export interface SessionData {
  id: string
  deviceId: string
  lang: string
  currentQuestionIndex: number
  dimensionScores: Record<number, number>
  shareCode: string
  shareUrl: string
  shareOpens: number
  shareUnlocked: boolean
  status: string
  createdAt: string
}

export async function createSession(deviceId: string, lang: string = 'zh'): Promise<SessionData> {
  const database = await getDb()
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const shareCode = `CEO${Date.now().toString(36).toUpperCase()}`
  const shareUrl = `https://ceo-ti.com/share/${id}`
  const dimensionScores = JSON.stringify({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 })

  database.run(
    `INSERT INTO sbti_sessions (id, device_id, lang, share_code, share_url, dimension_scores) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, deviceId, lang, shareCode, shareUrl, dimensionScores]
  )

  saveDb(database)

  return {
    id,
    deviceId,
    lang,
    currentQuestionIndex: 0,
    dimensionScores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
    shareCode,
    shareUrl,
    shareOpens: 0,
    shareUnlocked: false,
    status: 'active',
    createdAt: new Date().toISOString()
  }
}

export async function getSession(id: string): Promise<SessionData | null> {
  const database = await getDb()
  const result = database.exec(`SELECT * FROM sbti_sessions WHERE id = ?`, [id])

  if (result.length === 0 || result[0].values.length === 0) return null

  const row = result[0].values[0]
  const columns = result[0].columns
  const obj: Record<string, unknown> = {}
  columns.forEach((col, i) => { obj[col] = row[i] })

  return {
    id: obj.id as string,
    deviceId: obj.device_id as string,
    lang: obj.lang as string,
    currentQuestionIndex: obj.current_question_index as number,
    dimensionScores: JSON.parse(obj.dimension_scores as string),
    shareCode: obj.share_code as string,
    shareUrl: obj.share_url as string,
    shareOpens: obj.share_opens as number,
    shareUnlocked: Boolean(obj.share_unlocked),
    status: obj.status as string,
    createdAt: obj.created_at as string
  }
}

export async function updateSessionAnswer(
  sessionId: string,
  questionId: number,
  answer: string,
  dimensionScores: Record<number, number>
): Promise<void> {
  const database = await getDb()

  database.run(
    `INSERT INTO sbti_answers (session_id, question_id, answer, dimension_scores) VALUES (?, ?, ?, ?)`,
    [sessionId, questionId, answer, JSON.stringify(dimensionScores)]
  )

  database.run(
    `UPDATE sbti_sessions SET dimension_scores = ?, updated_at = datetime('now') WHERE id = ?`,
    [JSON.stringify(dimensionScores), sessionId]
  )

  saveDb(database)
}

export async function getSessionAnswers(sessionId: string): Promise<Array<{questionId: number; answer: string}>> {
  const database = await getDb()
  const result = database.exec(
    `SELECT question_id, answer FROM sbti_answers WHERE session_id = ? ORDER BY id`,
    [sessionId]
  )

  if (result.length === 0) return []

  return result[0].values.map(row => ({
    questionId: row[0] as number,
    answer: row[1] as string
  }))
}

export async function updateShareOpen(sessionId: string): Promise<{opens: number; unlocked: boolean}> {
  const database = await getDb()

  database.run(
    `UPDATE sbti_sessions SET share_opens = share_opens + 1 WHERE id = ?`,
    [sessionId]
  )

  const result = database.exec(`SELECT share_opens FROM sbti_sessions WHERE id = ?`, [sessionId])
  const opens = result[0]?.values[0]?.[0] as number || 0

  const unlocked = opens >= 3
  if (unlocked) {
    database.run(`UPDATE sbti_sessions SET share_unlocked = 1 WHERE id = ?`, [sessionId])
  }

  saveDb(database)

  return { opens, unlocked }
}
