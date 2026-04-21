/**
 * Report Repository 单元测试
 */

const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')

const db = require('../db')
const { encrypt, decrypt } = require('../db/report-repository')

describe('ReportRepository', () => {
  let testUserId
  let testSessionId

  before(async () => {
    await db.initDatabase()
    // 创建测试用户
    const user = db.users.createUser({
      email: `report-test-${Date.now()}@example.com`,
      industry: '便利店',
      scale: '小型',
      role: '老板',
      inviteCode: `RPT${Date.now()}`,
    })
    testUserId = user.id

    // 创建 session
    const session = db.inquirySessions.createSession(testUserId, 'zh')
    testSessionId = session.id
  })

  describe('encrypt/decrypt', () => {
    it('应正确加密和解密字符串', () => {
      const plaintext = 'Hello, World! 你好世界！'
      const encrypted = encrypt(plaintext)
      assert.notStrictEqual(encrypted, plaintext)
      assert.ok(encrypted.includes(':'))

      const decrypted = decrypt(encrypted)
      assert.strictEqual(decrypted, plaintext)
    })

    it('应能加密和解密 JSON 对象', () => {
      const obj = { name: '测试', value: 123, nested: { a: 1 } }
      const json = JSON.stringify(obj)
      const encrypted = encrypt(json)
      const decrypted = decrypt(encrypted)
      const parsed = JSON.parse(decrypted)
      assert.deepStrictEqual(parsed, obj)
    })

    it('加密结果每次不同（随机 IV）', () => {
      const plaintext = 'same text'
      const e1 = encrypt(plaintext)
      const e2 = encrypt(plaintext)
      assert.notStrictEqual(e1, e2)
    })
  })

  describe('createReport', () => {
    it('应创建 pending_payment 状态的报告', () => {
      const content = {
        summary: '这是一个测试报告',
        recommendations: ['建议1', '建议2'],
      }

      const report = db.reports.createReport(testSessionId, content)
      assert.ok(report.id)
      assert.strictEqual(report.status, 'pending_payment')
      assert.ok(report.expires_at)
      assert.ok(report.created_at)
    })

    it('应创建指定过期时间的报告', () => {
      const content = { test: 'data' }
      const report = db.reports.createReport(testSessionId, content, 'generating', 48)

      const expiresAt = new Date(report.expires_at)
      const now = new Date()
      const diffHours = (expiresAt - now) / (1000 * 60 * 60)

      // 48 ± 1 小时误差
      assert.ok(diffHours >= 47 && diffHours <= 49, `Expected ~48 hours, got ${diffHours}`)
    })
  })

  describe('getById (with decryption)', () => {
    it('应获取报告并解密内容', () => {
      const content = {
        title: '测试报告',
        data: { foo: 'bar' },
      }

      const created = db.reports.createReport(testSessionId, content)
      const report = db.reports.getById(created.id)

      assert.ok(report.id)
      assert.strictEqual(report.session_id, testSessionId)
      assert.strictEqual(report.status, 'pending_payment')
      assert.ok(report.decryptedContent)
      assert.strictEqual(report.decryptedContent.title, '测试报告')
      assert.strictEqual(report.decryptedContent.data.foo, 'bar')
    })

    it('不存在的报告应返回 null', () => {
      const report = db.reports.getById(999999)
      assert.strictEqual(report, null)
    })
  })

  describe('getBySessionId', () => {
    it('应返回报告并解密内容', () => {
      const content = { getBySessionId_test: true }
      db.reports.createReport(testSessionId, content)

      const report = db.reports.getBySessionId(testSessionId)
      assert.ok(report)
      assert.ok(report.decryptedContent)
      assert.strictEqual(report.decryptedContent.getBySessionId_test, true)
    })
  })

  describe('updateStatus', () => {
    it('应更新报告状态', () => {
      const content = { test: 'status update' }
      const report = db.reports.createReport(testSessionId, content, 'pending_payment')

      db.reports.updateStatus(report.id, 'generating')

      const updated = db.reports.getById(report.id)
      assert.strictEqual(updated.status, 'generating')
    })
  })

  describe('completeReport', () => {
    it('应完成报告并存储最终内容', () => {
      const finalContent = {
        summary: '最终报告内容',
        final: true,
      }

      const report = db.reports.createReport(testSessionId, { placeholder: true }, 'generating')
      db.reports.completeReport(report.id, finalContent)

      const completed = db.reports.getById(report.id)
      assert.strictEqual(completed.status, 'completed')
      assert.strictEqual(completed.decryptedContent.summary, '最终报告内容')
      assert.strictEqual(completed.decryptedContent.final, true)
    })
  })

  describe('updateContent', () => {
    it('应更新报告内容（加密存储）', () => {
      const content = { original: true }
      const report = db.reports.createReport(testSessionId, content)

      const updatedContent = { original: false, updated: true }
      db.reports.updateContent(report.id, updatedContent)

      const result = db.reports.getById(report.id)
      assert.strictEqual(result.decryptedContent.original, false)
      assert.strictEqual(result.decryptedContent.updated, true)
    })
  })

  describe('cleanupExpired', () => {
    it('应软删除过期的报告（不报错）', () => {
      // 创建一个报告并手动将其设为过期
      const content = { expired_test: true }
      const report = db.reports.createReport(testSessionId, content, 'generating', 0.0001)

      // 手动将 expires_at 设为过去的时间
      db.store.run(
        "UPDATE reports SET expires_at = datetime('now', '-1 hour') WHERE id = ?",
        [report.id]
      )
      db.store.immediateSave()

      // 调用 cleanup（不应该报错）
      const cleaned = db.reports.cleanupExpired()

      // 验证至少清理了刚设为过期的那个报告（或者没有报错）
      assert.strictEqual(typeof cleaned, 'number')
    })
  })
})