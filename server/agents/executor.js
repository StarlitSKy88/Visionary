/**
 * Executor - 工具调用执行器
 * 负责执行单个工具调用
 */

const { registry } = require('../tools/registry')

class Executor {
  constructor() {
    this.registry = registry
  }

  /**
   * 执行单个工具
   */
  async execute(toolName, args, context) {
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

    try {
      // 验证参数
      const validatedArgs = tool.validateArgs(args)

      // 执行工具
      const result = await tool.execute(validatedArgs, context)

      return {
        success: true,
        toolName,
        result,
      }
    } catch (error) {
      return {
        success: false,
        toolName,
        error: error.message || String(error),
        errorName: error.name,
      }
    }
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
