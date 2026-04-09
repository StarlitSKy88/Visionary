/**
 * NL Service - 自然语言意图分类与执行
 *
 * 6 种意图类型：
 * - schedule_reminder: 安排提醒
 * - query_leave: 查询请假
 * - approve_request: 审批请求
 * - add_member: 添加成员
 * - update_rule: 更新规则
 * - general_query: 通用查询
 */

const aiService = require('./ai-service')

// 意图分类 prompt
const CLASSIFY_SYSTEM_PROMPT = `你是一个专业的团队管理助手。你需要将用户的自然语言输入分类到以下6种意图之一：

1. schedule_reminder - 安排提醒、创建定时任务
2. query_leave - 查询请假余额、历史、状态
3. approve_request - 审批请假请求（需要管理员权限）
4. add_member - 添加团队成员
5. update_rule - 更新业务规则
6. general_query - 通用问题或无法归类

请严格只输出一个词：意图类型，不要有任何其他文字。`

/**
 * 分类用户意图
 * @param {string} message - 用户的自然语言输入
 * @param {string} teamContext - 团队上下文信息
 * @returns {Promise<{intent: string, confidence: number, reason: string}>}
 */
async function classifyIntent(message, teamContext = '') {
  const schema = {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        enum: ['schedule_reminder', 'query_leave', 'approve_request', 'add_member', 'update_rule', 'general_query'],
        description: '识别的意图类型',
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: '分类置信度 (0-1)',
      },
      reason: {
        type: 'string',
        description: '分类理由简述',
      },
      entities: {
        type: 'object',
        description: '提取的关键实体',
        properties: {
          memberName: { type: 'string', description: '成员姓名' },
          memberEmail: { type: 'string', description: '成员邮箱' },
          leaveType: { type: 'string', description: '请假类型 (annual/sick/personal)' },
          startDate: { type: 'string', description: '开始日期 YYYY-MM-DD' },
          endDate: { type: 'string', description: '结束日期 YYYY-MM-DD' },
          days: { type: 'number', description: '天数' },
          reason: { type: 'string', description: '原因/备注' },
          ruleType: { type: 'string', description: '规则类型' },
          cronExpression: { type: 'string', description: 'cron表达式' },
          message: { type: 'string', description: '提醒内容' },
        },
      },
    },
    required: ['intent', 'confidence', 'reason'],
  }

  const contextPrompt = teamContext
    ? `\n\n团队上下文：\n${teamContext}\n\n请根据团队信息理解用户的意图。`
    : ''

  try {
    const result = await aiService.chatJSON(
      [
        { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `用户输入：${message}${contextPrompt}\n\n请分类这个输入的意图。`,
        },
      ],
      schema,
      { taskType: 'nl-classify', timeout: 10000 }
    )

    return {
      intent: result.intent || 'general_query',
      confidence: result.confidence || 0,
      reason: result.reason || '',
      entities: result.entities || {},
    }
  } catch (error) {
    console.error('NL 分类失败:', error)
    // 超时或其他错误，返回低置信度的通用查询
    return {
      intent: 'general_query',
      confidence: 0,
      reason: '分类服务暂时不可用',
      entities: {},
    }
  }
}

/**
 * 生成确认消息（用于置信度 < 0.8 时）
 * @param {string} intent - 识别的意图
 * @param {object} entities - 提取的实体
 */
function generateConfirmationMessage(intent, entities) {
  const confirmations = {
    schedule_reminder: `蕾姆理解您想创建一个提醒：\n• 内容：${entities.message || '（未提取到）'}\n• 时间：${entities.cronExpression || '（未提取到）'}\n\n确认执行吗？`,

    query_leave: `蕾姆理解您想查询请假信息：\n• 类型：${entities.leaveType || '全部'}\n• 成员：${entities.memberName || '（您自己）'}\n\n确认执行吗？`,

    approve_request: `蕾姆理解您想审批请假请求：\n• 成员：${entities.memberName || '（未指定）'}\n• 类型：${entities.leaveType || '年假'}\n\n确认执行吗？`,

    add_member: `蕾姆理解您想添加团队成员：\n• 姓名：${entities.memberName || '（未提取到）'}\n• 邮箱：${entities.memberEmail || '（未提取到）'}\n\n确认执行吗？`,

    update_rule: `蕾姆理解您想更新业务规则：\n• 规则类型：${entities.ruleType || '（未提取到）'}\n\n确认执行吗？`,

    general_query: `蕾姆不确定您的意思，可以说得更具体一些吗？`,
  }

  return confirmations[intent] || confirmations.general_query
}

/**
 * 执行意图动作
 * @param {string} intent - 意图类型
 * @param {object} entities - 提取的实体
 * @param {object} context - 执行上下文 { teamId, userId, teamMember, db }
 */
async function executeAction(intent, entities, context) {
  const { teamId, userId, teamMember, db } = context

  switch (intent) {
    case 'schedule_reminder': {
      // 计算下次执行时间（简化版）
      let nextRunAt = null
      if (entities.startDate) {
        nextRunAt = new Date(entities.startDate).toISOString()
      }

      const schedule = db.schedules.createSchedule({
        teamId,
        jobType: 'reminder',
        cronExpression: entities.cronExpression || '0 9 * * *',
        payload: {
          type: 'reminder',
          message: entities.message,
          createdBy: userId,
        },
        nextRunAt,
      })

      db.audit.log({
        teamId,
        actorUserId: userId,
        action: 'schedule_created',
        targetType: 'recurring_schedule',
        targetId: schedule.id,
        details: { jobType: 'reminder', message: entities.message },
      })

      return {
        message: `已为您创建定时提醒：${entities.message}`,
        schedule,
      }
    }

    case 'query_leave': {
      const year = new Date().getFullYear()
      const memberId = entities.memberName ? teamMember.id : teamMember.id

      // 查询余额
      const balances = db.leave.getBalance(memberId, year)

      if (entities.leaveType) {
        const balance = balances.find(b => b.leave_type === entities.leaveType)
        const available = balance ? balance.total_days - balance.used_days : 0
        return {
          message: `您的 ${entities.leaveType} 余额：${available} 天（已用 ${balance?.used_days || 0} 天）`,
          balances: [balance],
        }
      }

      const summary = balances
        .map(b => `• ${b.leave_type}: ${b.total_days - b.used_days}/${b.total_days} 天`)
        .join('\n')

      return {
        message: `您的请假余额（${year}年）：\n${summary}`,
        balances,
      }
    }

    case 'approve_request': {
      // 查找待审批的请求
      if (!entities.memberName) {
        return { message: '请指定要审批的成员姓名，例如："审批李华的请假"' }
      }

      const requests = db.leave.getRequestsByTeam(teamId, { status: 'pending' })
      const targetRequest = requests.find(r =>
        r.member_email && r.member_email.includes(entities.memberName)
      )

      if (!targetRequest) {
        return { message: `没有找到 ${entities.memberName} 的待审批请假请求` }
      }

      db.leave.updateRequestStatus(targetRequest.id, 'approved', userId)

      // 更新余额
      const balances = db.leave.getBalance(targetRequest.team_member_id)
      const balance = balances.find(b => b.leave_type === targetRequest.leave_type)
      if (balance) {
        db.leave.updateBalance(
          targetRequest.team_member_id,
          targetRequest.leave_type,
          balance.used_days + targetRequest.days
        )
      }

      db.audit.log({
        teamId,
        actorUserId: userId,
        action: 'leave_approved',
        targetType: 'leave_request',
        targetId: targetRequest.id,
        details: { memberName: entities.memberName },
      })

      return {
        message: `已批准 ${entities.memberName} 的请假申请（${targetRequest.days}天）`,
        request: targetRequest,
      }
    }

    case 'add_member': {
      if (!entities.memberEmail) {
        return { message: '请提供要添加成员的邮箱，例如："添加 test@example.com 到团队"' }
      }

      // 查找用户
      const user = db.users.getUserByEmail(entities.memberEmail)
      if (!user) {
        return { message: `邮箱 ${entities.memberEmail} 尚未注册` }
      }

      // 检查是否已在团队
      const existing = db.teamMembers.getMemberByUserAndTeam(user.id, teamId)
      if (existing) {
        return { message: `${entities.memberEmail} 已在团队中` }
      }

      const member = db.teamMembers.addMember({
        teamId,
        userId: user.id,
        role: 'member',
      })

      db.audit.log({
        teamId,
        actorUserId: userId,
        action: 'member_added',
        targetType: 'team_member',
        targetId: member.id,
        details: { email: entities.memberEmail },
      })

      return {
        message: `已添加 ${entities.memberEmail} 到团队`,
        member,
      }
    }

    case 'update_rule': {
      if (!entities.ruleType) {
        return { message: '请指定要更新的规则类型' }
      }

      const existing = db.businessRules.getRuleByType(teamId, entities.ruleType)
      if (!existing) {
        return { message: `团队中没有找到类型为 ${entities.ruleType} 的规则` }
      }

      // 更新规则（这里简化处理，实际可能需要更多参数）
      if (entities.ruleConfig) {
        db.businessRules.updateRuleConfig(existing.id, entities.ruleConfig)
      }

      db.audit.log({
        teamId,
        actorUserId: userId,
        action: 'rule_updated',
        targetType: 'business_rule',
        targetId: existing.id,
        details: { ruleType: entities.ruleType },
      })

      return {
        message: `已更新 ${entities.ruleType} 规则`,
        rule: existing,
      }
    }

    case 'general_query':
    default: {
      // 尝试理解并回答
      try {
        const members = db.teamMembers.getMembersByTeam(teamId)
        const memberList = members.map(m => `• ${m.email} (${m.role})`).join('\n')

        const response = await aiService.chatJSON(
          [
            {
              role: 'system',
              content: `你是团队管理助手。团队成员列表：\n${memberList}\n\n请回答关于团队管理的问题。`,
            },
            { role: 'user', content: entities.originalMessage || '' },
          ],
          {
            type: 'object',
            properties: {
              answer: { type: 'string' },
            },
            required: ['answer'],
          },
          { taskType: 'nl-chat' }
        )

        return {
          message: response.answer,
        }
      } catch {
        return {
          message: '蕾姆暂时无法回答这个问题。您可以试试：\n• "我的年假还剩多少"\n• "添加张三到团队"\n• "下周提醒我开会"',
        }
      }
    }
  }
}

/**
 * 处理自然语言输入
 * @param {string} message - 用户输入
 * @param {object} context - 上下文 { teamId, userId, teamMember }
 * @param {object} db - 数据库实例
 * @returns {Promise<{type: 'confirm'|'execute', ...}>}
 */
async function processNLInput(message, context, db) {
  const { teamId, userId, teamMember } = context

  // 获取团队上下文
  const members = db.teamMembers.getMembersByTeam(teamId)
  const balances = db.leave.getBalance(teamMember.id)

  const teamContext = `
团队信息：
- 团队ID: ${teamId}
- 成员数量: ${members.length}
- 成员列表: ${members.map(m => `${m.email}(${m.role})`).join(', ') || '暂无'}
您的请假余额: ${balances.map(b => `${b.leave_type}: ${b.total_days - b.used_days}/${b.total_days}`).join(', ')}
`.trim()

  // 分类意图
  const classification = await classifyIntent(message, teamContext)

  // 低置信度，返回确认
  if (classification.confidence < 0.8) {
    return {
      type: 'confirm',
      intent: classification.intent,
      confidence: classification.confidence,
      confirmationMessage: generateConfirmationMessage(classification.intent, {
        ...classification.entities,
        originalMessage: message,
      }),
    }
  }

  // 高置信度，直接执行
  const result = await executeAction(classification.intent, classification.entities, {
    teamId,
    userId,
    teamMember,
    db,
  })

  return {
    type: 'execute',
    intent: classification.intent,
    confidence: classification.confidence,
    ...result,
  }
}

module.exports = {
  classifyIntent,
  generateConfirmationMessage,
  executeAction,
  processNLInput,
}
