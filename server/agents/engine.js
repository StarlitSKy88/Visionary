/**
 * 多Agent协作引擎 V3
 * 基于 GenerationStateMachine 的状态机管道
 * 支持中断恢复、验证门禁、分级错误处理、实时进度
 */

const { GenerationStateMachine, setSession, getSession, removeSession } = require('./state-machine')
const AIService = require('../lib/ai-service')
const { safeLog } = require('../lib/logger')

class AgentEngine {
  /**
   * 主生成流程（使用状态机）
   */
  async generate(input, userId) {
    safeLog({ input: input.substring(0, 50), type: 'engine_start' }, `🚀 启动Agent生成引擎`)

    const machine = new GenerationStateMachine(input, userId)
    setSession(machine.sessionId, machine)

    try {
      const result = await machine.run()
      return result
    } finally {
      removeSession(machine.sessionId)
    }
  }

  /**
   * 与Agent对话（直连 AI 服务）
   */
  static async chat(message, history, config) {
    return AIService.chatWithAgent(message, history, config)
  }
}

module.exports = { AgentEngine }
