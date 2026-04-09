/**
 * API 路由集成测试
 * 使用 Node.js 内置 test runner
 */

const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const http = require('http')
const express = require('express')
const cors = require('cors')

// ============ 测试辅助 ============

let baseUrl = ''

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl)
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

function getCodeFromDb(email) {
  const db = require('../db')
  const rawDb = db.getDb()
  const result = rawDb.exec(
    'SELECT code FROM email_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1',
    [email]
  )
  return result.length > 0 ? result[0].values[0][0] : null
}

// ============ 测试套件 ============

describe('API 路由集成测试', () => {
  let server

  before((_, done) => {
    const app = express()
    app.use(cors())
    app.use(express.json({ limit: '1mb' }))

    // 初始化数据库（复用现有 DB）
    const { initDatabase } = require('../db')
    initDatabase().then(() => {
      app.use('/api/auth', require('../routes/auth'))
      app.use('/api/agents', require('../routes/agents'))
      app.use('/api/orders', require('../routes/orders'))
      app.use('/api/admin', require('../routes/admin'))
      app.get('/health', (req, res) => res.json({ status: 'ok' }))
      app.use((req, res) => res.status(404).json({ success: false, error: '接口不存在' }))

      server = app.listen(0, () => {
        const addr = server.address()
        baseUrl = `http://127.0.0.1:${addr.port}`
        done()
      })
    })
  })

  it('GET /health 应返回健康状态', async () => {
    const res = await request('GET', '/health')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.status, 'ok')
  })

  it('POST /api/auth/send-email-code 应发送验证码', async () => {
    const res = await request('POST', '/api/auth/send-email-code', {
      email: 'test-api@example.com',
    })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
  })

  it('POST /api/auth/send-email-code 应拒绝无效邮箱', async () => {
    const res = await request('POST', '/api/auth/send-email-code', {
      email: 'not-valid-email',
    })
    assert.strictEqual(res.status, 400)
  })

  it('POST /api/auth/register + GET /me 应完成注册并获取用户信息', async () => {
    const testEmail = `api-reg-${Date.now()}@test.com`
    await request('POST', '/api/auth/send-email-code', { email: testEmail })
    const code = getCodeFromDb(testEmail)
    assert.ok(code)

    const regRes = await request('POST', '/api/auth/register', {
      email: testEmail, code,
      industry: '餐饮', scale: '小型', role: '老板',
    })
    assert.strictEqual(regRes.status, 200)
    assert.strictEqual(regRes.body.success, true)
    assert.ok(regRes.body.token)

    const meRes = await request('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${regRes.body.token}`,
    })
    assert.strictEqual(meRes.status, 200)
    assert.strictEqual(meRes.body.user.email, testEmail)
  })

  it('GET /api/auth/me 未登录应返回 401', async () => {
    const res = await request('GET', '/api/auth/me')
    assert.strictEqual(res.status, 401)
  })

  it('POST /api/orders/create 应创建订单', async () => {
    const testEmail = `api-ord-${Date.now()}@test.com`
    await request('POST', '/api/auth/send-email-code', { email: testEmail })
    const regRes = await request('POST', '/api/auth/register', {
      email: testEmail, code: getCodeFromDb(testEmail),
    })

    const res = await request('POST', '/api/orders/create', { amount: 100 }, {
      Authorization: `Bearer ${regRes.body.token}`,
    })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.ok(res.body.order.tradeNo)
  })

  it('POST /api/orders/create 应拒绝无效金额', async () => {
    const testEmail = `api-ord2-${Date.now()}@test.com`
    await request('POST', '/api/auth/send-email-code', { email: testEmail })
    const regRes = await request('POST', '/api/auth/register', {
      email: testEmail, code: getCodeFromDb(testEmail),
    })

    const res = await request('POST', '/api/orders/create', { amount: -1 }, {
      Authorization: `Bearer ${regRes.body.token}`,
    })
    assert.strictEqual(res.status, 400)
  })

  it('GET /api/admin/stats 正确密钥应返回统计', async () => {
    const res = await request('GET', '/api/admin/stats', null, {
      'x-admin-key': process.env.ADMIN_KEY || 'admin123',
    })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.success, true)
    assert.ok(res.body.stats)
  })

  it('GET /api/admin/stats 错误密钥应返回 403', async () => {
    const res = await request('GET', '/api/admin/stats', null, {
      'x-admin-key': 'wrong-key',
    })
    assert.strictEqual(res.status, 403)
  })

  it('不存在的路径应返回 404', async () => {
    const res = await request('GET', '/api/nonexistent')
    assert.strictEqual(res.status, 404)
  })
})
