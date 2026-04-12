/**
 * 提醒工具
 * 设置提醒、列出提醒、取消提醒
 */

const { BaseTool, ValidationError, ToolExecutionError } = require('./base-tool')

/**
 * 设置提醒
 */
class ReminderSetTool extends BaseTool {
  constructor() {
    super({
      name: 'reminder_set',
      description: '设置提醒',
      category: 'reminder',
      parameters: [
        { name: 'title', type: 'string', required: true, description: '提醒标题' },
        { name: 'description', type: 'string', required: false, description: '提醒描述' },
        { name: 'remind_at', type: 'string', required: true, description: '提醒时间 (ISO 8601 格式)' },
        { name: 'type', type: 'string', default: 'one-time', required: false, description: '类型: one-time/recurring' },
        { name: 'recurring_config', type: 'string', required: false, description: '重复配置 (JSON)，如 {"interval": "daily"}' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { title, description, remind_at, type, recurring_config } = args

    const remindAt = new Date(remind_at)
    if (isNaN(remindAt.getTime())) {
      throw new ValidationError('remind_at 必须是有效的 ISO 8601 时间格式')
    }

    // 提醒存储在 LongTermMemory 中
    const reminder = await prisma.longTermMemory.create({
      data: {
        userId: context.userId,
        agentId: context.agentId,
        content: JSON.stringify({
          type: 'reminder',
          title,
          description,
          remindAt: remind_at,
          reminderType: type,
          recurringConfig: recurring_config ? JSON.parse(recurring_config) : null,
        }),
        contentSummary: title,
        memoryType: 'fact',
        category: 'reminder',
        source: 'tool',
        importance: 8,
      },
    })

    return {
      success: true,
      reminderId: reminder.id,
      title,
      remindAt,
      message: `已设置提醒: ${title}`,
    }
  }
}

/**
 * 列出提醒
 */
class ReminderListTool extends BaseTool {
  constructor() {
    super({
      name: 'reminder_list',
      description: '列出所有提醒',
      category: 'reminder',
      parameters: [
        { name: 'status', type: 'string', required: false, description: '状态: upcoming/completed/all' },
        { name: 'limit', type: 'number', default: 20, required: false, description: '返回数量' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { status, limit } = args

    const reminders = await prisma.longTermMemory.findMany({
      where: {
        userId: context.userId,
        category: 'reminder',
        memoryType: 'fact',
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // 解析提醒内容
    const parsedReminders = reminders
      .map(r => {
        try {
          const data = JSON.parse(r.content)
          return {
            id: r.id,
            title: data.title,
            description: data.description,
            remindAt: data.remindAt,
            type: data.reminderType,
            isCompleted: data.isCompleted || false,
            createdAt: r.createdAt,
          }
        } catch {
          return null
        }
      })
      .filter(Boolean)

    // 过滤状态
    let filtered = parsedReminders
    if (status === 'upcoming') {
      filtered = parsedReminders.filter(r => !r.isCompleted && new Date(r.remindAt) > new Date())
    } else if (status === 'completed') {
      filtered = parsedReminders.filter(r => r.isCompleted)
    }

    return {
      count: filtered.length,
      reminders: filtered,
    }
  }
}

/**
 * 取消提醒
 */
class ReminderCancelTool extends BaseTool {
  constructor() {
    super({
      name: 'reminder_cancel',
      description: '取消提醒',
      category: 'reminder',
      parameters: [
        { name: 'reminder_id', type: 'string', required: true, description: '提醒 ID' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { reminder_id } = args

    const reminder = await prisma.longTermMemory.findUnique({
      where: { id: reminder_id },
    })

    if (!reminder) {
      throw new ToolExecutionError(`提醒不存在: ${reminder_id}`, this.name)
    }

    // 软删除 - 标记为非活跃
    await prisma.longTermMemory.update({
      where: { id: reminder_id },
      data: { isActive: false },
    })

    return {
      success: true,
      message: `已取消提醒`,
    }
  }
}

module.exports = {
  ReminderSetTool,
  ReminderListTool,
  ReminderCancelTool,
}
