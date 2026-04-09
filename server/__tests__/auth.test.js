/**
 * Auth 模块单元测试
 * 使用 Node.js 内置 test runner
 */

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { generateToken, verifyToken, sanitizeInput, isValidEmail, rateLimiter } = require('../lib/auth')

describe('Auth 模块', () => {
  describe('generateToken / verifyToken', () => {
    it('应生成有效 Token 并正确验证', () => {
      const token = generateToken(1, 'test@example.com')
      assert.ok(typeof token === 'string')
      assert.ok(token.length > 0)

      const payload = verifyToken(token)
      assert.ok(payload)
      assert.strictEqual(payload.userId, 1)
      assert.strictEqual(payload.email, 'test@example.com')
    })

    it('应拒绝无效 Token', () => {
      assert.strictEqual(verifyToken('invalid-token'), null)
      assert.strictEqual(verifyToken(''), null)
      assert.strictEqual(verifyToken('a:b:c:d:e'), null)
    })

    it('应拒绝被篡改的 Token', () => {
      const token = generateToken(1, 'test@example.com')
      const tampered = token.slice(0, -4) + 'xxxx'
      assert.strictEqual(verifyToken(tampered), null)
    })
  })

  describe('sanitizeInput', () => {
    it('应移除 script 标签', () => {
      const input = '<script>alert("xss")</script>正常文本'
      const result = sanitizeInput(input)
      assert.ok(!result.includes('<script>'))
      assert.ok(result.includes('正常文本'))
    })

    it('应移除事件处理器', () => {
      const input = '<div onmouseover="alert(1)">test</div>'
      const result = sanitizeInput(input)
      assert.ok(!result.includes('onmouseover'))
    })

    it('应移除 javascript: 协议', () => {
      const input = '<a href="javascript:alert(1)">link</a>'
      const result = sanitizeInput(input)
      assert.ok(!result.includes('javascript:'))
    })

    it('应保留正常文本', () => {
      assert.strictEqual(sanitizeInput('hello world'), 'hello world')
    })

    it('应处理非字符串输入', () => {
      assert.strictEqual(sanitizeInput(123), 123)
      assert.strictEqual(sanitizeInput(null), null)
    })
  })

  describe('isValidEmail', () => {
    it('应接受合法邮箱', () => {
      assert.strictEqual(isValidEmail('test@example.com'), true)
      assert.strictEqual(isValidEmail('user.name@domain.co'), true)
    })

    it('应拒绝非法邮箱', () => {
      assert.strictEqual(isValidEmail(''), false)
      assert.strictEqual(isValidEmail('no-at-sign'), false)
      assert.strictEqual(isValidEmail('@missing-user.com'), false)
      assert.strictEqual(isValidEmail('user@'), false)
    })
  })

  describe('rateLimiter', () => {
    it('应在限制内允许请求', () => {
      const key = `test:${Date.now()}`
      assert.strictEqual(rateLimiter.check(key, 3, 60000), true)
      assert.strictEqual(rateLimiter.check(key, 3, 60000), true)
      assert.strictEqual(rateLimiter.check(key, 3, 60000), true)
    })

    it('应在超限后拒绝请求', () => {
      const key = `test-limit:${Date.now()}`
      rateLimiter.check(key, 2, 60000)
      rateLimiter.check(key, 2, 60000)
      assert.strictEqual(rateLimiter.check(key, 2, 60000), false)
    })
  })
})
