/**
 * Inquiry Engine 单元测试
 */

const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')

const db = require('../db')
const {
  selectNextDimension,
  generateQuestion,
  parseAnswer,
  checkTrigger,
  containsMedia,
  DIMENSIONS,
  REQUIRED_DIMENSIONS,
} = require('../inquiry-engine')

describe('InquiryEngine', () => {
  before(async () => {
    await db.initDatabase()
  })

  describe('DIMENSIONS', () => {
    it('应有7个维度', () => {
      assert.strictEqual(DIMENSIONS.length, 7)
    })

    it('应有5个必选维度', () => {
      assert.strictEqual(REQUIRED_DIMENSIONS.length, 5)
      assert.ok(REQUIRED_DIMENSIONS.includes('location'))
      assert.ok(REQUIRED_DIMENSIONS.includes('scale'))
      assert.ok(REQUIRED_DIMENSIONS.includes('financial'))
      assert.ok(REQUIRED_DIMENSIONS.includes('competition'))
      assert.ok(REQUIRED_DIMENSIONS.includes('pain_point'))
    })
  })

  describe('selectNextDimension', () => {
    it('初始状态返回 location', () => {
      const next = selectNextDimension([], 1)
      assert.strictEqual(next, 'location')
    })

    it('覆盖 location 后返回 scale', () => {
      const next = selectNextDimension(['location'], 2)
      assert.strictEqual(next, 'scale')
    })

    it('覆盖前4个必选维度后返回 pain_point', () => {
      const next = selectNextDimension(['location', 'scale', 'financial', 'competition'], 5)
      assert.strictEqual(next, 'pain_point')
    })

    it('5个必选维度全部覆盖返回 null（触发报告）', () => {
      // 一旦5个必选维度全覆盖，立即触发（不再问可选维度）
      const next = selectNextDimension(['location', 'scale', 'financial', 'competition', 'pain_point'], 5)
      assert.strictEqual(next, null)
    })

    it('覆盖所有维度后返回 null', () => {
      const covered = ['location', 'scale', 'financial', 'competition', 'pain_point', 'resource', 'experience']
      const next = selectNextDimension(covered, 7)
      assert.strictEqual(next, null)
    })
  })

  describe('generateQuestion', () => {
    it('生成 location 的默认问题（中文）', () => {
      const q = generateQuestion('location', {}, 'zh')
      assert.ok(q.includes('开在什么地方') || q.includes('位置'))
    })

    it('生成 location 的上下文问题（中文）', () => {
      const q = generateQuestion('location', { location: '社区门口' }, 'zh')
      assert.ok(q.includes('社区门口'))
    })

    it('生成 scale 的默认问题（中文）', () => {
      const q = generateQuestion('scale', {}, 'zh')
      assert.ok(q.includes('多大') || q.includes('规模'))
    })

    it('生成 financial 的默认问题（中文）', () => {
      const q = generateQuestion('financial', {}, 'zh')
      assert.ok(q.includes('赚') || q.includes('收入'))
    })

    it('生成英文问题', () => {
      const q = generateQuestion('location', {}, 'en')
      assert.ok(q.includes('Where') || q.includes('located'))
    })

    it('未知维度返回默认回复', () => {
      const q = generateQuestion('unknown_dim', {}, 'zh')
      assert.ok(q.includes('详细'))
    })
  })

  describe('parseAnswer', () => {
    it('"不知道"返回 skipped=true', () => {
      const result = parseAnswer('不知道', 'zh')
      assert.strictEqual(result.skipped, true)
    })

    it('"说不上来"返回 skipped=true', () => {
      const result = parseAnswer('说不上来', 'zh')
      assert.strictEqual(result.skipped, true)
    })

    it('"not sure"返回 skipped=true（英文）', () => {
      const result = parseAnswer('not sure', 'en')
      assert.strictEqual(result.skipped, true)
    })

    it('具体回答返回 skipped=false', () => {
      const result = parseAnswer('社区门口', 'zh')
      assert.strictEqual(result.skipped, false)
      assert.strictEqual(result.answer, '社区门口')
    })

    it('"还行吧"返回 clarified=true', () => {
      const result = parseAnswer('还行吧', 'zh')
      assert.strictEqual(result.skipped, false)
      assert.strictEqual(result.clarified, true)
      assert.ok(result.clarification)
    })

    it('"its okay"返回 clarified=true（英文）', () => {
      const result = parseAnswer('its okay', 'en')
      assert.strictEqual(result.clarified, true)
    })

    it('空字符串返回 skipped=true', () => {
      const result = parseAnswer('', 'zh')
      assert.strictEqual(result.skipped, true)
    })

    it('带空格的"不知道 "也识别', () => {
      const result = parseAnswer('不知道  ', 'zh')
      assert.strictEqual(result.skipped, true)
    })
  })

  describe('checkTrigger', () => {
    it('5个必选维度全覆盖触发', () => {
      const coverage = {
        covered: ['location', 'scale', 'financial', 'competition', 'pain_point'],
        skipped: [],
        total: 5,
      }
      const result = checkTrigger(coverage, 10)
      assert.strictEqual(result.trigger, true)
      assert.strictEqual(result.reason, 'dimensions_covered')
    })

    it('15轮触发', () => {
      const coverage = {
        covered: ['location'],
        skipped: ['scale'],
        total: 2,
      }
      const result = checkTrigger(coverage, 15)
      assert.strictEqual(result.trigger, true)
      assert.strictEqual(result.reason, 'round_limit')
    })

    it('不满足条件不触发', () => {
      const coverage = {
        covered: ['location', 'scale'],
        skipped: [],
        total: 2,
      }
      const result = checkTrigger(coverage, 10)
      assert.strictEqual(result.trigger, false)
      assert.strictEqual(result.reason, 'not_ready')
    })

    it('只有4个维度覆盖不触发', () => {
      const coverage = {
        covered: ['location', 'scale', 'financial', 'competition'],
        skipped: [],
        total: 4,
      }
      const result = checkTrigger(coverage, 10)
      assert.strictEqual(result.trigger, false)
    })
  })

  describe('containsMedia', () => {
    it('检测 URL 图片', () => {
      assert.strictEqual(containsMedia('看看这个 https://example.com/image.jpg'), true)
    })

    it('检测 data:image', () => {
      assert.strictEqual(containsMedia('![image](data:image/png;base64,abc123)'), true)
    })

    it('检测 [图片] 标记', () => {
      assert.strictEqual(containsMedia('这是[图片]'), true)
    })

    it('普通文字不触发', () => {
      assert.strictEqual(containsMedia('我的店开在社区门口'), false)
    })

    it('空输入不触发', () => {
      assert.strictEqual(containsMedia(''), false)
    })

    it('null 不触发', () => {
      assert.strictEqual(containsMedia(null), false)
    })
  })

  describe('integration - processAnswer', () => {
    it('完整追问流程测试', async () => {
      const { processAnswer, getInquiryState } = require('../inquiry-engine')

      // 创建用户和 session
      const user = db.users.createUser({
        email: `engine-test-${Date.now()}@example.com`,
        industry: '便利店',
        scale: '小型',
        role: '老板',
        inviteCode: `ENG${Date.now()}`,
      })

      const session = db.inquirySessions.createSession(user.id, 'zh')
      assert.ok(session.id)

      // 第一轮：回答 location
      let result = processAnswer(session.id, 'location', '社区门口', 'zh')
      assert.strictEqual(result.type, 'next_question')
      assert.strictEqual(result.dimension, 'scale')

      // 第二轮：回答 scale（跳过）
      result = processAnswer(session.id, 'scale', '不知道', 'zh')
      assert.strictEqual(result.type, 'next_question')
      assert.strictEqual(result.skipped, true)

      // 验证 getInquiryState
      const state = getInquiryState(session.id, 'zh')
      assert.strictEqual(state.round, 2)
      assert.ok(state.coverage.covered.includes('location'))
      assert.ok(state.coverage.skipped.includes('scale'))

      // 测试 15 轮触发
      // 先清除这个 session，用一个新 session 做 15 轮测试
      const session2 = db.inquirySessions.createSession(user.id, 'zh')

      // 模拟 15 轮
      const dimensions = ['location', 'scale', 'financial', 'competition', 'pain_point', 'resource', 'experience']
      let triggered = false
      for (let i = 0; i < 15; i++) {
        const dim = dimensions[i % dimensions.length]
        result = processAnswer(session2.id, dim, `测试回答${i + 1}`, 'zh')
        if (result.type === 'triggered') {
          triggered = true
          break
        }
      }
      assert.strictEqual(triggered, true, '15轮应该触发')
    })
  })
})