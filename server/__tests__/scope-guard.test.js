/**
 * ScopeGuard 单元测试
 */

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const scopeGuard = require('../scope-guard')

describe('ScopeGuard', () => {
  describe('isBlacklisted', () => {
    it('应拒绝赌博相关行业', () => {
      assert.strictEqual(scopeGuard.isBlacklisted('赌博'), true)
      assert.strictEqual(scopeGuard.isBlacklisted('博彩'), true)
      assert.strictEqual(scopeGuard.isBlacklisted('gambling'), true)
    })

    it('应拒绝色情相关行业', () => {
      assert.strictEqual(scopeGuard.isBlacklisted('色情'), true)
      assert.strictEqual(scopeGuard.isBlacklisted('成人内容'), true)
      assert.strictEqual(scopeGuard.isBlacklisted('porn'), true)
    })

    it('应拒绝毒品相关行业', () => {
      assert.strictEqual(scopeGuard.isBlacklisted('毒品'), true)
      assert.strictEqual(scopeGuard.isBlacklisted('吸毒'), true)
    })

    it('应拒绝虚拟货币相关行业', () => {
      assert.strictEqual(scopeGuard.isBlacklisted('虚拟货币'), true)
      assert.strictEqual(scopeGuard.isBlacklisted('crypto'), true)
      assert.strictEqual(scopeGuard.isBlacklisted('bitcoin'), true)
    })

    it('应允许正常行业', () => {
      assert.strictEqual(scopeGuard.isBlacklisted('便利店'), false)
      assert.strictEqual(scopeGuard.isBlacklisted('餐厅'), false)
      assert.strictEqual(scopeGuard.isBlacklisted('服装店'), false)
    })

    it('应处理空输入', () => {
      assert.strictEqual(scopeGuard.isBlacklisted(''), false)
      assert.strictEqual(scopeGuard.isBlacklisted(null), false)
      assert.strictEqual(scopeGuard.isBlacklisted(undefined), false)
    })
  })

  describe('extractIndustryFromQuestion', () => {
    it('应提取开店相关行业', () => {
      assert.ok(scopeGuard.extractIndustryFromQuestion('我想开一家便利店'))
      assert.ok(scopeGuard.extractIndustryFromQuestion('开奶茶店怎么样'))
    })

    it('应提取生意相关行业', () => {
      assert.ok(scopeGuard.extractIndustryFromQuestion('做餐饮生意'))
      assert.ok(scopeGuard.extractIndustryFromQuestion('做服装生意怎么样'))
    })

    it('应返回null当无法提取', () => {
      assert.strictEqual(scopeGuard.extractIndustryFromQuestion('我的报告里说的'), null)
    })
  })

  describe('isExpired', () => {
    it('应正确判断24小时过期', () => {
      const now = new Date()
      const past = new Date(now.getTime() - 25 * 60 * 60 * 1000)
      assert.strictEqual(scopeGuard.isExpired(past.toISOString()), true)

      const recent = new Date(now.getTime() - 23 * 60 * 60 * 1000)
      assert.strictEqual(scopeGuard.isExpired(recent.toISOString()), false)
    })

    it('应处理空输入', () => {
      assert.strictEqual(scopeGuard.isExpired(null), true)
      assert.strictEqual(scopeGuard.isExpired(undefined), true)
    })
  })

  describe('getRemainingHours', () => {
    it('应正确计算剩余时间', () => {
      const now = new Date()
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)

      const remaining = scopeGuard.getRemainingHours(twelveHoursAgo.toISOString())
      assert.ok(remaining > 10 && remaining < 14)
    })

    it('已过期应返回0', () => {
      const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000)
      assert.strictEqual(scopeGuard.getRemainingHours(yesterday.toISOString()), 0)
    })
  })

  describe('RESULT constant', () => {
    it('应包含4种结果类型', () => {
      assert.strictEqual(scopeGuard.RESULT.IN_SCOPE, 'in_scope')
      assert.strictEqual(scopeGuard.RESULT.OUT_OF_SCOPE, 'out_of_scope')
      assert.strictEqual(scopeGuard.RESULT.NEEDS_CLARIFICATION, 'needs_clarification')
      assert.strictEqual(scopeGuard.RESULT.BLACKLISTED, 'blacklisted')
    })
  })
})