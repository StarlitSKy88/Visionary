/**
 * InquirySession Repository 单元测试
 */

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')

const db = require('../db')

describe('InquirySessionRepository', () => {
  let testUserId

  before(async () => {
    await db.initDatabase()
    // 创建测试用户
    const user = db.users.createUser({
      email: `inquiry-test-${Date.now()}@example.com`,
      industry: '便利店',
      scale: '小型',
      role: '老板',
      inviteCode: `INQ${Date.now()}`,
    })
    testUserId = user.id
  })

  describe('createSession', () => {
    it('应创建 active 状态的 session', () => {
      const session = db.inquirySessions.createSession(testUserId, 'zh')
      assert.ok(session.id)
      assert.strictEqual(session.status, 'active')
      assert.strictEqual(session.lang, 'zh')
      assert.strictEqual(session.round_count, 0)
      // dimension_answers 已被 jsonFields 自动解析为数组
      assert.deepStrictEqual(session.dimension_answers, [])
    })

    it('应支持英文 session', () => {
      const session = db.inquirySessions.createSession(testUserId, 'en')
      assert.strictEqual(session.lang, 'en')
    })

    it('同一用户可创建多个 session', () => {
      const session1 = db.inquirySessions.createSession(testUserId, 'zh')
      const session2 = db.inquirySessions.createSession(testUserId, 'zh')
      assert.notStrictEqual(session1.id, session2.id)
    })
  })

  describe('recordAnswer', () => {
    it('应记录回答并更新 round_count', () => {
      const session = db.inquirySessions.createSession(testUserId, 'zh')
      db.inquirySessions.recordAnswer(session.id, 'location', '社区门口', false)

      const updated = db.inquirySessions.getById(session.id)
      assert.strictEqual(updated.round_count, 1)
      // dimension_answers 已被 jsonFields 自动解析为数组
      const answers = updated.dimension_answers
      assert.strictEqual(answers.length, 1)
      assert.strictEqual(answers[0].dimension, 'location')
      assert.strictEqual(answers[0].answer, '社区门口')
      assert.strictEqual(answers[0].skipped, false)
    })

    it('应标记 skipped=true 当用户说"不知道"', () => {
      const session = db.inquirySessions.createSession(testUserId, 'zh')
      db.inquirySessions.recordAnswer(session.id, 'scale', '不知道', true)

      // recordAnswer 更新数据库但不影响 session 对象引用，需重新获取
      const updated = db.inquirySessions.getById(session.id)
      const answers = updated.dimension_answers
      assert.strictEqual(answers[0].skipped, true)
    })
  })

  describe('getCoverage', () => {
    it('应返回覆盖的维度列表', () => {
      const session = db.inquirySessions.createSession(testUserId, 'zh')
      db.inquirySessions.recordAnswer(session.id, 'location', '社区门口', false)
      db.inquirySessions.recordAnswer(session.id, 'scale', '不知道', true)

      const coverage = db.inquirySessions.getCoverage(session.id)
      assert.ok(coverage.covered.includes('location'))
      assert.ok(coverage.skipped.includes('scale'))
      assert.strictEqual(coverage.total, 2)
    })
  })

  describe('shouldTrigger', () => {
    it('5个必选维度全覆盖应触发', () => {
      const session = db.inquirySessions.createSession(testUserId, 'zh')
      const dimensions = ['location', 'scale', 'financial', 'competition', 'pain_point']
      for (const dim of dimensions) {
        db.inquirySessions.recordAnswer(session.id, dim, 'test answer', false)
      }

      const result = db.inquirySessions.shouldTrigger(session.id)
      assert.strictEqual(result.trigger, true)
      assert.strictEqual(result.reason, 'dimensions_covered')
    })

    it('15轮应触发', () => {
      const session = db.inquirySessions.createSession(testUserId, 'zh')
      for (let i = 0; i < 15; i++) {
        db.inquirySessions.recordAnswer(session.id, `dimension_${i}`, `answer ${i}`, false)
      }

      const result = db.inquirySessions.shouldTrigger(session.id)
      assert.strictEqual(result.trigger, true)
      assert.strictEqual(result.reason, 'round_limit')
    })

    it('不满足条件不应触发', () => {
      const session = db.inquirySessions.createSession(testUserId, 'zh')
      db.inquirySessions.recordAnswer(session.id, 'location', '社区门口', false)
      db.inquirySessions.recordAnswer(session.id, 'scale', '不知道', true)

      const result = db.inquirySessions.shouldTrigger(session.id)
      assert.strictEqual(result.trigger, false)
    })
  })

  describe('updateStatus', () => {
    it('应更新 session 状态', () => {
      const session = db.inquirySessions.createSession(testUserId, 'zh')
      db.inquirySessions.updateStatus(session.id, 'waiting_payment')

      const updated = db.inquirySessions.getById(session.id)
      assert.strictEqual(updated.status, 'waiting_payment')
    })
  })

  describe('getById', () => {
    it('应能通过 ID 获取 session', () => {
      const session = db.inquirySessions.createSession(testUserId, 'zh')
      const found = db.inquirySessions.getById(session.id)
      assert.ok(found)
      assert.strictEqual(found.id, session.id)
    })

    it('不存在的 ID 应返回 null', () => {
      const found = db.inquirySessions.getById(999999)
      assert.strictEqual(found, null)
    })
  })

  describe('getActiveByUserId', () => {
    it('应返回用户的所有 active session', () => {
      db.inquirySessions.createSession(testUserId, 'zh')
      db.inquirySessions.createSession(testUserId, 'en')

      const sessions = db.inquirySessions.getActiveByUserId(testUserId)
      assert.ok(sessions.length >= 2)
    })
  })

  describe('cleanupExpired', () => {
    it('应软删除30天未活动的 session', () => {
      const session = db.inquirySessions.createSession(testUserId, 'zh')
      // 手动将 updated_at 设为31天前
      db.store.run(
        "UPDATE inquiry_sessions SET updated_at = datetime('now', '-31 days') WHERE id = ?",
        [session.id]
      )

      const cleaned = db.inquirySessions.cleanupExpired()
      assert.ok(cleaned >= 1)

      const updated = db.inquirySessions.getById(session.id)
      assert.strictEqual(updated.status, 'expired')
    })
  })
})