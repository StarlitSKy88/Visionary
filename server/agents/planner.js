/**
 * Planner - 意图分解与计划生成
 * 将用户复杂请求拆解为可执行的步骤序列
 */

const { aiService } = require('../lib/ai-service')

class Planner {
  /**
   * 分解用户意图为执行计划
   */
  async decompose(userMessage, context = {}) {
    const { availableTools = [] } = context

    const prompt = `用户消息: ${userMessage}

可用工具: ${availableTools.map(t => `${t.name}: ${t.description}`).join('\n')}

请分析用户意图，生成执行计划：

1. 核心目标是什么？
2. 需要哪些步骤？
3. 每步需要调用什么工具（如果有）？
4. 步骤之间的依赖关系？

以JSON格式返回：
{
  "goal": "核心目标描述",
  "steps": [
    {
      "id": 1,
      "description": "步骤描述",
      "tool": "工具名（如果没有则为空）",
      "args": {},
      "depends_on": []
    }
  ]
}`

    const result = await aiService.chat(
      [{ role: 'user', content: prompt }],
      { taskType: 'planning' }
    )

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (jsonMatch) return JSON.parse(jsonMatch[0])
      return JSON.parse(result)
    } catch {
      return {
        goal: userMessage,
        steps: [{ id: 1, description: result, tool: null, args: {} }],
      }
    }
  }

  /**
   * 判断是否为复杂任务（需要多步骤）
   */
  isComplexTask(userMessage) {
    const indicators = [
      '首先', '然后', '接下来', '最后',
      '一方面', '另一方面',
      '包括', '以及', '还有',
      '帮我', '请', '能不能',
    ]

    return indicators.some(i => userMessage.includes(i))
  }
}

module.exports = { Planner }
