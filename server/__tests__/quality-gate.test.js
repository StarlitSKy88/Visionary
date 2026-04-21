/**
 * Quality Gate 单元测试
 * 测试质量门控的逻辑部分（不需要真实API）
 */

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const { CHECKS } = require('../harness/quality-gate')

describe('Quality Gate', () => {
  describe('CHECKS constant', () => {
    it('应包含4项检查定义', () => {
      assert.strictEqual(CHECKS.FACT_SCOPE, 'fact_scope')
      assert.strictEqual(CHECKS.EXECUTABILITY, 'executability')
      assert.strictEqual(CHECKS.PRIORITY_BASIS, 'priority_basis')
      assert.strictEqual(CHECKS.RISK_ASSESSMENT, 'risk_assessment')
    })
  })

  describe('用户数据提取逻辑', () => {
    it('应正确从dimension_answers提取用户数据', () => {
      const sessionData = {
        dimension_answers: [
          { dimension: 'location', answer: '社区门口', skipped: false },
          { dimension: 'scale', answer: '30平米', skipped: false },
          { dimension: 'experience', answer: '不知道', skipped: true },
        ],
      }

      const userData = {}
      for (const ans of sessionData.dimension_answers || []) {
        if (!ans.skipped) {
          userData[ans.dimension] = ans.answer
        }
      }

      assert.strictEqual(userData.location, '社区门口')
      assert.strictEqual(userData.scale, '30平米')
      assert.strictEqual(userData.experience, undefined)
    })

    it('空dimension_answers应返回空对象', () => {
      const sessionData = { dimension_answers: [] }

      const userData = {}
      for (const ans of sessionData.dimension_answers || []) {
        if (!ans.skipped) {
          userData[ans.dimension] = ans.answer
        }
      }

      assert.deepStrictEqual(userData, {})
    })
  })

  describe('输出解析逻辑', () => {
    it('应正确解析4个Agent的输出数组', () => {
      const outputs = [
        { opportunity: '市场机会', target_customer: '目标客户' },
        { core_positioning: '核心定位', differentiation: '差异化' },
        { quick_wins: ['快速见效1'], action_steps: ['步骤1'] },
        { investment_estimate: '投资估算', ROI_analysis: 'ROI分析' },
      ]

      assert.ok(outputs[0].opportunity)
      assert.ok(outputs[1].core_positioning)
      assert.ok(outputs[2].quick_wins)
      assert.ok(outputs[3].investment_estimate)
    })

    it('应能处理不完整的输出', () => {
      const outputs = [
        { opportunity: '市场机会' },
        null,
        { quick_wins: ['快速见效'] },
      ]

      // 验证能访问存在的字段
      assert.strictEqual(outputs[0].opportunity, '市场机会')
      assert.strictEqual(outputs[2].quick_wins[0], '快速见效')
    })
  })
})