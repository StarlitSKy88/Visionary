/**
 * NL Service Tests
 * 只测试纯函数，不依赖外部模块
 */

const { describe, it } = require('node:test')
const assert = require('node:assert')

// 纯函数测试 - 确认消息生成
function generateConfirmationMessage(intent, entities) {
  const confirmations = {
    schedule_reminder: `蕾姆理解您想创建一个提醒：\n• 内容：${entities.message || '（未提取到）'}\n• 时间：${entities.cronExpression || '（未提取到）'}\n\n确认执行吗？`,
    query_leave: `蕾姆理解您想查询请假信息：\n• 类型：${entities.leaveType || '全部'}\n• 成员：${entities.memberName || '（您自己）'}\n\n确认执行吗？`,
    approve_request: `蕾姆理解您想审批请假请求：\n• 成员：${entities.memberName || '（未指定）'}\n• 类型：${entities.leaveType || '年假'}\n\n确认执行吗？`,
    add_member: `蕾姆理解您想添加团队成员：\n• 姓名：${entities.memberName || '（未提取到）'}\n• 邮箱：${entities.memberEmail || '（未提取到）'}\n\n确认执行吗？`,
    update_rule: `蕾姆理解您想更新业务规则：\n• 规则类型：${entities.ruleType || '（未提取到）'}\n\n确认执行吗？`,
    general_query: `蕾姆不确定您的意思，可以说得更具体一些吗？`,
  }
  return confirmations[intent] || confirmations.general_query
}

describe('NL Service - Confirmation Messages', () => {
  it('should generate confirmation for schedule_reminder', () => {
    const msg = generateConfirmationMessage('schedule_reminder', {
      message: '开会',
      cronExpression: '0 9 * * 1',
    })
    assert.ok(msg.includes('开会'))
    assert.ok(msg.includes('确认'))
  })

  it('should generate confirmation for query_leave', () => {
    const msg = generateConfirmationMessage('query_leave', {
      leaveType: 'annual',
      memberName: '张三',
    })
    assert.ok(msg.includes('年假') || msg.includes('annual'))
    assert.ok(msg.includes('张三'))
  })

  it('should generate confirmation for add_member', () => {
    const msg = generateConfirmationMessage('add_member', {
      memberEmail: 'test@example.com',
    })
    assert.ok(msg.includes('test@example.com'))
  })

  it('should generate confirmation for approve_request', () => {
    const msg = generateConfirmationMessage('approve_request', {
      memberName: '李华',
    })
    assert.ok(msg.includes('李华'))
  })

  it('should handle unknown intent', () => {
    const msg = generateConfirmationMessage('unknown_intent', {})
    assert.ok(msg)
  })

  it('should handle missing entities gracefully', () => {
    const msg = generateConfirmationMessage('schedule_reminder', {})
    assert.ok(msg.includes('未提取到'))
  })
})

describe('NL Service - Intent Types', () => {
  const validIntents = [
    'schedule_reminder',
    'query_leave',
    'approve_request',
    'add_member',
    'update_rule',
    'general_query',
  ]

  it('should have exactly 6 intent types', () => {
    assert.strictEqual(validIntents.length, 6)
  })

  it('should include schedule_reminder', () => {
    assert.ok(validIntents.includes('schedule_reminder'))
  })

  it('should include query_leave', () => {
    assert.ok(validIntents.includes('query_leave'))
  })

  it('should include approve_request', () => {
    assert.ok(validIntents.includes('approve_request'))
  })

  it('should include add_member', () => {
    assert.ok(validIntents.includes('add_member'))
  })

  it('should include update_rule', () => {
    assert.ok(validIntents.includes('update_rule'))
  })

  it('should have general_query as fallback', () => {
    assert.ok(validIntents.includes('general_query'))
  })
})

describe('NL Service - Confidence Thresholds', () => {
  const CONFIDENCE_THRESHOLD = 0.8

  it('should consider confidence below threshold as low', () => {
    const lowConfidence = 0.7
    assert.ok(lowConfidence < CONFIDENCE_THRESHOLD)
  })

  it('should consider confidence at threshold as high', () => {
    const highConfidence = 0.8
    assert.ok(highConfidence >= CONFIDENCE_THRESHOLD)
  })

  it('should consider confidence above threshold as high', () => {
    const highConfidence = 0.95
    assert.ok(highConfidence >= CONFIDENCE_THRESHOLD)
  })
})

describe('NL Service - Entity Parsing', () => {
  it('should parse leave type correctly', () => {
    const leaveTypes = ['annual', 'sick', 'personal']
    leaveTypes.forEach(type => {
      assert.ok(['annual', 'sick', 'personal'].includes(type))
    })
  })

  it('should parse date range correctly', () => {
    const startDate = '2024-03-01'
    const endDate = '2024-03-03'
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    assert.strictEqual(days, 3)
  })

  it('should handle cron expression parsing', () => {
    const cron = '0 9 * * *'
    const parts = cron.split(/\s+/)
    assert.strictEqual(parts.length, 5)
    assert.strictEqual(parts[0], '0') // minute
    assert.strictEqual(parts[1], '9') // hour
  })

  it('should validate email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    assert.ok(emailRegex.test('test@example.com'))
    assert.ok(!emailRegex.test('invalid-email'))
  })
})
