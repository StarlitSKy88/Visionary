/**
 * Database Repository 单元测试
 * 使用内存数据库，测试完成后自动清理
 */

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')

// 使用测试数据库（内存中）
const db = require('../db')

describe('Database 抽象层', () => {
  before(async () => {
    await db.initDatabase()
  })

  describe('UserRepository', () => {
    it('应创建并查询用户', () => {
      const user = db.users.createUser({
        email: `test-${Date.now()}@example.com`,
        industry: '餐饮',
        scale: '小型',
        role: '老板',
        inviteCode: `INV${Date.now()}`,
      })

      assert.ok(user.id)
      assert.strictEqual(user.industry, '餐饮')

      const found = db.users.getUserById(user.id)
      assert.ok(found)
      assert.strictEqual(found.email, user.email)
    })

    it('应拒绝重复邮箱', () => {
      const email = `dup-${Date.now()}@example.com`
      db.users.createUser({
        email, industry: '', scale: '', role: '', inviteCode: `DUP${Date.now()}`,
      })

      assert.throws(
        () => db.users.createUser({
          email, industry: '', scale: '', role: '', inviteCode: `DUP2${Date.now()}`,
        }),
        { message: '该邮箱已注册' }
      )
    })

    it('应通过邀请码查询用户', () => {
      const inviteCode = `CODE${Date.now()}`
      db.users.createUser({
        email: `invite-${Date.now()}@example.com`,
        industry: '', scale: '', role: '', inviteCode,
      })

      const found = db.users.getUserByInviteCode(inviteCode)
      assert.ok(found)
      assert.strictEqual(found.invite_code, inviteCode)
    })

    it('应更新邀请进度', () => {
      const user = db.users.createUser({
        email: `progress-${Date.now()}@example.com`,
        industry: '', scale: '', role: '', inviteCode: `PROG${Date.now()}`,
      })

      db.users.updateInviteProgress(user.id, 3)
      const updated = db.users.getUserById(user.id)
      assert.strictEqual(updated.invite_progress, 3)
    })

    it('formatUserResponse 应正确格式化', () => {
      const raw = {
        id: 1, email: 'test@test.com', industry: '餐饮',
        scale: '小型', role: '老板', invite_code: 'ABC',
        invite_progress: 2, refunded: 1,
      }
      const formatted = require('../db/user-repository').formatResponse(raw)
      assert.strictEqual(formatted.inviteCode, 'ABC')
      assert.strictEqual(formatted.refunded, true)
    })
  })

  describe('AgentRepository', () => {
    let testUserId

    before(() => {
      const user = db.users.createUser({
        email: `agent-test-${Date.now()}@example.com`,
        industry: '零售', scale: '中型', role: '经理',
        inviteCode: `AGT${Date.now()}`,
      })
      testUserId = user.id
    })

    it('应创建并查询 Agent', () => {
      const agent = db.agents.createAgent({
        userId: testUserId,
        name: '智能报价助手',
        industry: '零售',
        description: '帮助零售商快速报价',
        config: { model: 'gpt-4' },
        score: 96,
        skills: ['报价', '比价'],
        constraints: ['不低于成本价'],
      })

      assert.ok(agent.id)

      const found = db.agents.getAgentById(agent.id)
      assert.ok(found)
      assert.deepStrictEqual(found.config, { model: 'gpt-4' })
      assert.deepStrictEqual(found.skills, ['报价', '比价'])
    })

    it('应按用户查询 Agent 列表', () => {
      const agents = db.agents.getAgentsByUserId(testUserId)
      assert.ok(agents.length > 0)
    })

    it('应删除 Agent', () => {
      const agent = db.agents.createAgent({
        userId: testUserId, name: '待删除', industry: '',
        description: '', config: {}, score: 0, skills: [], constraints: [],
      })

      db.agents.deleteAgent(agent.id, testUserId)
      const found = db.agents.getAgentByIdForUser(agent.id, testUserId)
      assert.strictEqual(found, null)
    })

    it('应保存和查询聊天消息', () => {
      const agent = db.agents.createAgent({
        userId: testUserId, name: '聊天测试', industry: '',
        description: '', config: {}, score: 0, skills: [], constraints: [],
      })

      db.agents.saveChatMessage(agent.id, testUserId, 'user', '你好')
      db.agents.saveChatMessage(agent.id, testUserId, 'assistant', '您好！')

      const messages = db.agents.getChatMessages(agent.id, testUserId)
      assert.strictEqual(messages.length, 2)
      assert.strictEqual(messages[0].role, 'user')
    })
  })

  describe('OrderRepository', () => {
    let testUserId

    before(() => {
      const user = db.users.createUser({
        email: `order-test-${Date.now()}@example.com`,
        industry: '', scale: '', role: '', inviteCode: `ORD${Date.now()}`,
      })
      testUserId = user.id
    })

    it('应创建订单并按流水号查询', () => {
      const order = db.orders.createOrder({
        userId: testUserId, amount: 100, tradeNo: `TN${Date.now()}`,
      })

      assert.strictEqual(order.status, 'pending')

      const found = db.orders.getOrderByTradeNo(order.tradeNo)
      assert.ok(found)
      assert.strictEqual(found.amount, 100)
    })

    it('应更新订单状态', () => {
      const order = db.orders.createOrder({
        userId: testUserId, amount: 200, tradeNo: `TN2${Date.now()}`,
      })

      db.orders.updateOrderStatus(order.id, 'paid', new Date().toISOString())
      const updated = db.orders.getOrderByTradeNo(order.tradeNo)
      assert.strictEqual(updated.status, 'paid')
    })
  })

  describe('CodeRepository', () => {
    it('应创建并验证验证码', () => {
      const email = `code-${Date.now()}@example.com`
      const code = '123456'
      const expiresAt = Date.now() + 5 * 60 * 1000

      db.codes.createEmailCode(email, code, expiresAt)
      assert.strictEqual(db.codes.verifyEmailCode(email, code), true)
    })

    it('应拒绝已使用的验证码', () => {
      const email = `used-${Date.now()}@example.com`
      const code = '654321'
      const expiresAt = Date.now() + 5 * 60 * 1000

      db.codes.createEmailCode(email, code, expiresAt)
      db.codes.verifyEmailCode(email, code) // 第一次使用
      assert.strictEqual(db.codes.verifyEmailCode(email, code), false) // 第二次应失败
    })

    it('应拒绝过期的验证码', () => {
      const email = `expired-${Date.now()}@example.com`
      const code = '111111'
      const expiredAt = Date.now() - 1000 // 已过期

      db.codes.createEmailCode(email, code, expiredAt)
      assert.strictEqual(db.codes.verifyEmailCode(email, code), false)
    })
  })

  describe('AdminRepository', () => {
    it('应返回统计数据', () => {
      const stats = db.admin.getFullStats()
      assert.ok(typeof stats.userCount === 'number')
      assert.ok(typeof stats.agentCount === 'number')
      assert.ok(typeof stats.orderCount === 'number')
    })

    it('应添加并查询知识库', () => {
      db.admin.addKnowledge('餐饮', '成本控制', '通过批量采购降低成本', '系统')
      const knowledge = db.admin.getRecentKnowledge(10)
      assert.ok(knowledge.length > 0)
    })
  })
})
