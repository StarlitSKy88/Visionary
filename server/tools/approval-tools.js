/**
 * 审批工具
 * 帮老板审批请假/报销/订单
 */

const { BaseTool, ValidationError, ToolExecutionError } = require('./base-tool')

/**
 * 查看待审批列表
 */
class ApprovalListTool extends BaseTool {
  constructor() {
    super({
      name: 'approval_list',
      description: '查看待审批列表，可以按状态和类型筛选',
      category: 'approval',
      parameters: [
        { name: 'status', type: 'string', default: 'pending', required: false, description: '审批状态: pending/approved/rejected/all' },
        { name: 'type', type: 'string', required: false, description: '审批类型: leave/reimbursement/order/purchase/custom' },
        { name: 'limit', type: 'number', default: 20, required: false, description: '返回数量' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { status, type, limit } = args

    let where = {}
    if (status && status !== 'all') {
      where.status = status
    }
    if (type) {
      where.approvalType = type
    }

    const approvals = await prisma.approval.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { email: true, displayName: true } },
      },
    })

    return {
      count: approvals.length,
      approvals: approvals.map(a => ({
        id: a.id,
        type: a.approvalType,
        title: a.title,
        description: a.description,
        requester: a.requesterId,
        requesterEmail: a.user?.email,
        amount: a.amount,
        currency: a.currency,
        status: a.status,
        createdAt: a.createdAt,
        expiresAt: a.expiresAt,
      })),
    }
  }
}

/**
 * 创建审批请求
 */
class ApprovalCreateTool extends BaseTool {
  constructor() {
    super({
      name: 'approval_create',
      description: '创建一个新的审批请求（如请假、报销）',
      category: 'approval',
      requiresConfirmation: true,
      parameters: [
        { name: 'approval_type', type: 'string', required: true, description: '审批类型: leave/reimbursement/order/purchase/custom' },
        { name: 'title', type: 'string', required: true, description: '审批标题' },
        { name: 'description', type: 'string', required: false, description: '审批说明' },
        { name: 'amount', type: 'number', required: false, description: '金额（如果是费用相关）' },
        { name: 'currency', type: 'string', default: 'CNY', required: false, description: '货币' },
        { name: 'start_date', type: 'string', required: false, description: '开始日期 (YYYY-MM-DD)，用于请假' },
        { name: 'end_date', type: 'string', required: false, description: '结束日期 (YYYY-MM-DD)，用于请假' },
        { name: 'days', type: 'number', required: false, description: '天数，用于请假' },
        { name: 'attachments', type: 'array', required: false, description: '附件 URL 列表' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { approval_type, title, description, amount, currency, start_date, end_date, days, attachments } = args

    // 验证日期格式
    if (start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      throw new ValidationError('start_date must be YYYY-MM-DD format')
    }
    if (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      throw new ValidationError('end_date must be YYYY-MM-DD format')
    }

    const approval = await prisma.approval.create({
      data: {
        userId: context.userId,
        approvalType: approval_type,
        title,
        description,
        amount: amount || null,
        currency: currency || 'CNY',
        status: 'pending',
        attachments: attachments || [],
        approvalHistory: [{
          approver_id: context.userId,
          action: 'create',
          timestamp: new Date().toISOString(),
        }],
      },
    })

    return {
      success: true,
      approvalId: approval.id,
      message: `已创建审批请求: ${title}`,
      approval: {
        id: approval.id,
        type: approval.approvalType,
        title: approval.title,
        status: approval.status,
        createdAt: approval.createdAt,
      },
    }
  }
}

/**
 * 审批操作（批准/拒绝）
 */
class ApprovalActionTool extends BaseTool {
  constructor() {
    super({
      name: 'approval_action',
      description: '审批操作（批准或拒绝）',
      category: 'approval',
      requiresConfirmation: true,
      parameters: [
        { name: 'approval_id', type: 'string', required: true, description: '审批 ID' },
        { name: 'action', type: 'string', required: true, enum: ['approve', 'reject'], description: '操作: approve 或 reject' },
        { name: 'comment', type: 'string', required: false, description: '审批意见' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { approval_id, action, comment } = args

    const approval = await prisma.approval.findUnique({
      where: { id: approval_id },
    })

    if (!approval) {
      throw new ToolExecutionError(`审批不存在: ${approval_id}`, this.name)
    }

    if (approval.status !== 'pending') {
      throw new ToolExecutionError(`该审批已被处理，当前状态: ${approval.status}`, this.name)
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const updated = await prisma.approval.update({
      where: { id: approval_id },
      data: {
        status: newStatus,
        decidedAt: new Date(),
        decisionNote: comment || null,
        approvalHistory: [
          ...(approval.approvalHistory || []),
          {
            approver_id: context.userId,
            action: action,
            comment: comment || '',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    })

    return {
      success: true,
      message: `已${action === 'approve' ? '批准' : '拒绝'}审批: ${approval.title}`,
      approval: {
        id: updated.id,
        type: updated.approvalType,
        title: updated.title,
        status: updated.status,
        decidedAt: updated.decidedAt,
      },
    }
  }
}

/**
 * 审批历史
 */
class ApprovalHistoryTool extends BaseTool {
  constructor() {
    super({
      name: 'approval_history',
      description: '查看某个审批的完整处理历史',
      category: 'approval',
      parameters: [
        { name: 'approval_id', type: 'string', required: true, description: '审批 ID' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { approval_id } = args

    const approval = await prisma.approval.findUnique({
      where: { id: approval_id },
      include: {
        user: { select: { email: true, displayName: true } },
      },
    })

    if (!approval) {
      throw new ToolExecutionError(`审批不存在: ${approval_id}`, this.name)
    }

    return {
      approval: {
        id: approval.id,
        type: approval.approvalType,
        title: approval.title,
        description: approval.description,
        amount: approval.amount,
        currency: approval.currency,
        status: approval.status,
        requester: approval.requesterId,
        requesterEmail: approval.user?.email,
        decisionNote: approval.decisionNote,
        createdAt: approval.createdAt,
        decidedAt: approval.decidedAt,
        history: approval.approvalHistory || [],
      },
    }
  }
}

module.exports = {
  ApprovalListTool,
  ApprovalCreateTool,
  ApprovalActionTool,
  ApprovalHistoryTool,
}
