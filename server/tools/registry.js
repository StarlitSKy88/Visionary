/**
 * 工具注册表
 * 管理所有可用工具，支持按类别和能力筛选
 */

const { BaseTool } = require('./base-tool')

// 动态加载所有工具
const EmailTool = require('./email-tools')
const ApprovalTool = require('./approval-tools')
const FileTool = require('./file-tools')
const SpreadsheetTool = require('./spreadsheet-tools')
const ReminderTool = require('./reminder-tools')
const SearchTool = require('./search-tools')
const MemoryTool = require('./memory-tools')

class ToolRegistry {
  constructor() {
    /** @type {Map<string, BaseTool>} */
    this.tools = new Map()
    /** @type {Map<string, BaseTool[]>} */
    this.categories = new Map()
    this._registerBuiltInTools()
  }

  _registerBuiltInTools() {
    // 邮件工具
    this.register(new EmailTool.EmailReadTool())
    this.register(new EmailTool.EmailSendTool())
    this.register(new EmailTool.EmailSearchTool())
    this.register(new EmailTool.EmailListFoldersTool())

    // 审批工具
    this.register(new ApprovalTool.ApprovalListTool())
    this.register(new ApprovalTool.ApprovalCreateTool())
    this.register(new ApprovalTool.ApprovalActionTool())
    this.register(new ApprovalTool.ApprovalHistoryTool())

    // 文件工具
    this.register(new FileTool.FileUploadTool())
    this.register(new FileTool.FileDownloadTool())
    this.register(new FileTool.FileListTool())
    this.register(new FileTool.FileDeleteTool())
    this.register(new FileTool.FilePreviewTool())

    // 表格工具
    this.register(new SpreadsheetTool.SpreadsheetReadTool())
    this.register(new SpreadsheetTool.SpreadsheetWriteTool())
    this.register(new SpreadsheetTool.SpreadsheetAnalyzeTool())
    this.register(new SpreadsheetTool.SpreadsheetCreateTool())

    // 提醒工具
    this.register(new ReminderTool.ReminderSetTool())
    this.register(new ReminderTool.ReminderListTool())
    this.register(new ReminderTool.ReminderCancelTool())

    // 搜索工具
    this.register(new SearchTool.WebSearchTool())
    this.register(new SearchTool.KnowledgeBaseSearchTool())

    // 记忆工具
    this.register(new MemoryTool.MemoryAddTool())
    this.register(new MemoryTool.MemoryReplaceTool())
    this.register(new MemoryTool.MemoryRemoveTool())
    this.register(new MemoryTool.MemorySearchTool())
  }

  /**
   * 注册工具
   */
  register(tool) {
    if (!(tool instanceof BaseTool)) {
      throw new Error(`Tool must be instance of BaseTool: ${tool}`)
    }
    this.tools.set(tool.name, tool)

    if (!this.categories.has(tool.category)) {
      this.categories.set(tool.category, [])
    }
    this.categories.get(tool.category).push(tool)
  }

  /**
   * 按名称获取工具
   */
  getTool(name) {
    return this.tools.get(name)
  }

  /**
   * 获取某类别的所有工具
   */
  getToolsByCategory(category) {
    return this.categories.get(category) || []
  }

  /**
   * 获取所有工具
   */
  getAllTools() {
    return Array.from(this.tools.values())
  }

  /**
   * 获取所有工具的 OpenAI function calling 规格
   */
  getToolsSpec() {
    return this.getAllTools().map(t => t.getSpec())
  }

  /**
   * 根据 Agent 能力返回可用工具
   * @param {string[]} agentCapabilities Agent 的能力列表
   * @returns {BaseTool[]}
   */
  getToolsForAgent(agentCapabilities) {
    return this.getAllTools().filter(
      tool => !agentCapabilities.length || agentCapabilities.includes(tool.name)
    )
  }

  /**
   * 检查用户是否有权限使用工具
   */
  checkPermission(tool, userRole, userId, agentOwnerId) {
    if (tool.requiredRole === 'admin' && userRole !== 'admin') {
      return { allowed: false, reason: `Tool ${tool.name} requires admin role` }
    }
    // 如果工具需要是 agent 的 owner 才能使用
    if (tool.requiredRole === 'owner' && userId !== agentOwnerId) {
      return { allowed: false, reason: `Tool ${tool.name} requires agent owner` }
    }
    return { allowed: true }
  }
}

// 单例导出
const registry = new ToolRegistry()

module.exports = { ToolRegistry, registry }
