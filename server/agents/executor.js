/**
 * Executor - 工具调用执行器
 * 负责执行单个工具调用，记录详细日志
 */

const { registry } = require('../tools/registry')

class Executor {
  constructor() {
    this.registry = registry
  }

  /**
   * 执行单个工具（带日志记录）
   */
  async execute(toolName, args, context) {
    const { prisma } = require('../lib/prisma')
    const startTime = Date.now()

    const tool = this.registry.getTool(toolName)

    if (!tool) {
      return {
        success: false,
        error: `工具不存在: ${toolName}`,
      }
    }

    // 权限检查
    const permission = this.registry.checkPermission(
      tool,
      context.userRole,
      context.userId,
      context.agentOwnerId
    )

    if (!permission.allowed) {
      return {
        success: false,
        error: permission.reason,
      }
    }

    // 构建日志记录
    const logData = {
      toolName,
      toolCategory: tool.category,
      agentId: context.agentId,
      userId: context.userId,
      sessionId: context.sessionId,
      messageId: context.messageId,
      arguments: args,
      argumentsSummary: this._sanitizeArgs(toolName, args),
    }

    try {
      // 验证参数
      const validatedArgs = tool.validateArgs(args)

      // 执行工具
      const result = await tool.execute(validatedArgs, context)

      const durationMs = Date.now() - startTime

      // 记录成功日志
      await this._logExecution(prisma, {
        ...logData,
        status: 'success',
        result,
        resultSummary: this._summarizeResult(result),
        durationMs,
      })

      return {
        success: true,
        toolName,
        result,
        durationMs,
      }
    } catch (error) {
      const durationMs = Date.now() - startTime

      // 记录失败日志
      await this._logExecution(prisma, {
        ...logData,
        status: 'failed',
        errorMessage: error.message || String(error),
        durationMs,
      })

      return {
        success: false,
        toolName,
        error: error.message || String(error),
        errorName: error.name,
        durationMs,
      }
    }
  }

  /**
   * 记录工具执行日志到数据库
   */
  async _logExecution(prisma, data) {
    try {
      const {
        toolName, toolCategory, agentId, userId, sessionId, messageId,
        arguments, argumentsSummary, result, resultSummary, errorMessage,
        status, durationMs, tokensUsed, cost,
      } = data

      await prisma.toolExecution.create({
        data: {
          toolName,
          toolCategory,
          agentId,
          userId,
          sessionId,
          messageId,
          arguments: arguments || undefined,
          argumentsSummary,
          result: result || undefined,
          resultSummary,
          errorMessage,
          status,
          durationMs,
          tokensUsed,
          cost,
        },
      })
    } catch (e) {
      // 日志记录失败不影响主流程
      console.error('工具执行日志记录失败:', e.message)
    }
  }

  /**
   * 脱敏敏感参数
   */
  _sanitizeArgs(toolName, args) {
    if (!args) return undefined

    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization', 'cookie']
    const sanitized = { ...args }

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    }

    // 截断过长参数
    const str = JSON.stringify(sanitized)
    if (str.length > 500) {
      return str.substring(0, 500) + '...'
    }
    return str
  }

  /**
   * 生成结果摘要
   */
  _summarizeResult(result) {
    if (!result) return undefined

    // 如果是文本，截断
    if (typeof result === 'string') {
      return result.length > 300 ? result.substring(0, 300) + '...' : result
    }

    // 如果是对象，提取关键字段
    if (typeof result === 'object') {
      const summary = {}
      for (const [key, value] of Object.entries(result)) {
        if (['success', 'message', 'error', 'count', 'id', 'fileId'].includes(key)) {
          summary[key] = value
        }
      }
      const str = JSON.stringify(summary)
      return str.length > 300 ? str.substring(0, 300) + '...' : str
    }

    return String(result).substring(0, 300)
  }

  /**
   * 批量执行工具（用于多步骤任务）
   */
  async executeBatch(steps, context) {
    const results = []

    for (const step of steps) {
      const { tool, args } = step

      if (!tool) {
        // 直接返回描述（不需要工具）
        results.push({
          success: true,
          description: step.description,
        })
        continue
      }

      const result = await this.execute(tool, args, context)
      results.push(result)

      // 如果失败，停止执行
      if (!result.success) {
        break
      }
    }

    return results
  }
}

module.exports = { Executor }
