/**
 * 基础工具类
 * 所有工具必须继承此类
 */

class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

class ToolExecutionError extends Error {
  constructor(message, toolName) {
    super(message)
    this.name = 'ToolExecutionError'
    this.toolName = toolName
  }
}

class BaseTool {
  constructor(config) {
    this.name = config.name
    this.description = config.description
    this.category = config.category // email/file/approval/spreadsheet/reminder/search
    this.parameters = config.parameters || []
    this.outputSchema = config.outputSchema
    this.requiredCapabilities = config.requiredCapabilities || []
    // 需要用户确认的操作（如发邮件、删文件）
    this.requiresConfirmation = config.requiresConfirmation || false
    // 是否需要管理员权限
    this.requiredRole = config.requiredRole || null
  }

  /**
   * 验证参数
   * @returns {object} 验证后的参数
   * @throws {ValidationError}
   */
  validateArgs(args) {
    const errors = []
    for (const param of this.parameters) {
      if (param.required && !(param.name in args) && !(param.default !== undefined)) {
        errors.push(`Missing required parameter: ${param.name}`)
      }
    }
    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '))
    }
    // 应用默认值
    const validated = {}
    for (const param of this.parameters) {
      if (args[param.name] !== undefined) {
        validated[param.name] = args[param.name]
      } else if (param.default !== undefined) {
        validated[param.name] = param.default
      }
    }
    return validated
  }

  /**
   * 执行工具（子类必须实现）
   * @param {object} args 验证后的参数
   * @param {object} context 上下文 { userId, agentId, sessionId, prisma }
   * @returns {Promise<object>} 执行结果
   */
  async execute(args, context) {
    throw new Error(`Tool ${this.name} must implement execute()`)
  }

  /**
   * 获取 OpenAI 格式的工具定义（用于 function calling）
   */
  getSpec() {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: this._buildParametersSchema(),
      },
    }
  }

  /**
   * 构建 JSON Schema for parameters
   */
  _buildParametersSchema() {
    const properties = {}
    const required = []

    for (const param of this.parameters) {
      properties[param.name] = {
        type: param.type,
        description: param.description || '',
      }
      if (param.enum) {
        properties[param.name].enum = param.enum
      }
      if (param.default !== undefined) {
        properties[param.name].default = param.default
      }
      if (param.required) {
        required.push(param.name)
      }
    }

    return {
      type: 'object',
      properties,
      required,
    }
  }

  /**
   * 生成脱敏的日志摘要
   */
  summarizeForLog(args) {
    return { tool: this.name, args }
  }
}

module.exports = {
  BaseTool,
  ValidationError,
  ToolExecutionError,
}
