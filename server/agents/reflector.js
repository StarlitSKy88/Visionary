/**
 * Reflector - 结果反思与质量控制
 * 评估工具执行结果，决定是否需要进一步操作
 */

const { aiService } = require('../lib/ai-service')

class Reflector {
  constructor(config = {}) {
    this.confidenceThreshold = config.confidenceThreshold || 0.7
  }

  /**
   * 反思执行结果
   */
  async reflect(originalGoal, executionHistory, context = {}) {
    const prompt = `原始目标: ${originalGoal}

执行历史:
${this._formatHistory(executionHistory)}

请评估执行结果：

1. 是否达到了原始目标？
2. 置信度是多少（0.0-1.0）？
3. 是否需要进一步操作？
4. 如果需要，应该做什么？

以JSON格式返回：
{
  "isComplete": true/false,
  "confidence": 0.0-1.0,
  "assessment": "评估说明",
  "nextAction": {
    "type": "continue/reply/askclarification",
    "content": "具体内容"
  }
}`

    const result = await aiService.chat(
      [{ role: 'user', content: prompt }],
      { taskType: 'reflection' }
    )

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (jsonMatch) return JSON.parse(jsonMatch[0])
      return JSON.parse(result)
    } catch {
      return {
        isComplete: true,
        confidence: 0.5,
        assessment: result,
        nextAction: { type: 'reply', content: result },
      }
    }
  }

  /**
   * 格式化执行历史
   */
  _formatHistory(history) {
    if (!Array.isArray(history)) {
      return JSON.stringify(history)
    }

    return history.map((h, i) => {
      if (h.description) {
        return `${i + 1}. ${h.description}`
      }
      if (h.toolName) {
        return `${i + 1}. ${h.toolName}: ${h.success ? '成功' : '失败 - ' + h.error}`
      }
      return `${i + 1}. ${JSON.stringify(h)}`
    }).join('\n')
  }

  /**
   * 快速检查（用于简单场景）
   */
  quickCheck(result) {
    // 检查是否有明显错误
    if (!result) {
      return { isComplete: false, reason: '空结果' }
    }

    if (result.error) {
      return { isComplete: false, reason: result.error }
    }

    return { isComplete: true, confidence: 0.9 }
  }
}

module.exports = { Reflector }
