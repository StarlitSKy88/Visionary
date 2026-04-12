/**
 * 邮件工具
 * 读写邮件、搜索、文件夹管理
 */

const { BaseTool, ValidationError, ToolExecutionError } = require('./base-tool')
const { sendEmail } = require('../lib/email-service')

/**
 * 读取邮件
 */
class EmailReadTool extends BaseTool {
  constructor() {
    super({
      name: 'email_read',
      description: '读取邮件详细内容',
      category: 'email',
      parameters: [
        { name: 'email_id', type: 'string', required: true, description: '邮件 ID' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { email_id } = args

    const email = await prisma.email.findUnique({
      where: { id: email_id },
    })

    if (!email) {
      throw new ToolExecutionError(`邮件不存在: ${email_id}`, this.name)
    }

    // 标记为已读
    await prisma.email.update({
      where: { id: email_id },
      data: { isRead: true },
    })

    return {
      id: email.id,
      fromAddress: email.fromAddress,
      fromName: email.fromName,
      toAddresses: email.toAddresses,
      ccAddresses: email.ccAddresses,
      subject: email.subject,
      bodyText: email.bodyText,
      bodyHtml: email.bodyHtml,
      attachments: email.attachments,
      isRead: true,
      isStarred: email.isStarred,
      importance: email.importance,
      receivedAt: email.receivedAt,
      folder: email.folder,
    }
  }
}

/**
 * 发送邮件
 */
class EmailSendTool extends BaseTool {
  constructor() {
    super({
      name: 'email_send',
      description: '发送邮件',
      category: 'email',
      requiresConfirmation: true,
      parameters: [
        { name: 'to', type: 'string', required: true, description: '收件人邮箱，多个用逗号分隔' },
        { name: 'cc', type: 'string', required: false, description: '抄送邮箱，多个用逗号分隔' },
        { name: 'subject', type: 'string', required: true, description: '邮件主题' },
        { name: 'body', type: 'string', required: true, description: '邮件正文' },
        { name: 'is_html', type: 'boolean', default: false, required: false, description: '是否为 HTML 格式' },
        { name: 'importance', type: 'string', default: 'normal', required: false, description: '重要程度: low/normal/high' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { to, cc, subject, body, is_html, importance } = args

    // 解析收件人
    const toAddresses = to.split(',').map(a => a.trim()).filter(Boolean)
    const ccAddresses = cc ? cc.split(',').map(a => a.trim()).filter(Boolean) : []

    if (!toAddresses.length) {
      throw new ValidationError('至少需要一个收件人')
    }

    // 构建邮件内容
    const htmlContent = is_html ? body : `<pre style="white-space: pre-wrap;">${body}</pre>`

    // 真正发送邮件
    const sendResult = await sendEmail(
      toAddresses,
      subject,
      htmlContent,
      context.agentName ? `AI员工 ${context.agentName}` : 'AI 经营助手'
    )

    // 创建邮件记录到数据库
    const email = await prisma.email.create({
      data: {
        userId: context.userId,
        fromAddress: context.userEmail || 'agent@company.com',
        fromName: context.agentName || 'AI 员工',
        toAddresses,
        ccAddresses,
        subject,
        bodyText: is_html ? null : body,
        bodyHtml: is_html ? body : null,
        folder: 'sent',
        sentAt: new Date(),
        importance: importance || 'normal',
      },
    })

    return {
      success: sendResult.sent,
      emailId: email.id,
      message: sendResult.sent
        ? `邮件已发送: ${subject}`
        : `邮件已创建（${sendResult.method}）: ${subject}`,
      to: toAddresses,
      method: sendResult.method,
    }
  }
}

/**
 * 搜索邮件
 */
class EmailSearchTool extends BaseTool {
  constructor() {
    super({
      name: 'email_search',
      description: '搜索邮件',
      category: 'email',
      parameters: [
        { name: 'query', type: 'string', required: true, description: '搜索关键词' },
        { name: 'folder', type: 'string', required: false, description: '搜索文件夹: inbox/sent/draft/trash' },
        { name: 'limit', type: 'number', default: 20, required: false, description: '返回数量' },
        { name: 'offset', type: 'number', default: 0, required: false, description: '偏移量' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { query, folder, limit, offset } = args

    let where = {
      userId: context.userId,
    }

    if (folder) {
      where.folder = folder
    }

    // 简单关键词匹配 (实际生产应使用全文搜索)
    where.OR = [
      { subject: { contains: query } },
      { bodyText: { contains: query } },
      { fromAddress: { contains: query } },
    ]

    const emails = await prisma.email.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return {
      count: emails.length,
      emails: emails.map(e => ({
        id: e.id,
        fromAddress: e.fromAddress,
        fromName: e.fromName,
        subject: e.subject,
        isRead: e.isRead,
        isStarred: e.isStarred,
        importance: e.importance,
        receivedAt: e.receivedAt,
        folder: e.folder,
        preview: (e.bodyText || '').substring(0, 100),
      })),
    }
  }
}

/**
 * 列出邮件文件夹
 */
class EmailListFoldersTool extends BaseTool {
  constructor() {
    super({
      name: 'email_list_folders',
      description: '列出所有邮件文件夹及未读数',
      category: 'email',
      parameters: [],
    })
  }

  async execute(args, context) {
    const { prisma } = context

    const folders = await prisma.email.groupBy({
      by: ['folder'],
      where: { userId: context.userId },
      _count: { id: true },
    })

    // 获取每个文件夹的未读数
    const foldersWithUnread = await Promise.all(
      folders.map(async (f) => {
        const unread = await prisma.email.count({
          where: {
            userId: context.userId,
            folder: f.folder,
            isRead: false,
          },
        })
        return {
          name: f.folder,
          total: f._count.id,
          unread,
        }
      })
    )

    return {
      folders: foldersWithUnread,
    }
  }
}

module.exports = {
  EmailReadTool,
  EmailSendTool,
  EmailSearchTool,
  EmailListFoldersTool,
}
