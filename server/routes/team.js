/**
 * Team Routes - 团队操作 API
 *
 * 权限矩阵：
 * - admin:  完整权限 (CRUD)
 * - member: 查询 + 发起请求
 * - viewer: 仅查询
 */

const express = require('express')
const router = express.Router()
const Database = require('../db')
const { authMiddleware, requireTeamMember, requireTeamAdmin, requireTeamMemberOrAdmin, ROLE_LEVELS } = require('../lib/auth')
const nlService = require('../lib/nl-service')
const { safeLog } = require('../lib/logger')

// ===== 工具函数 =====

function success(res, data, meta) {
  const result = { success: true, data }
  if (meta) result.meta = meta
  res.json(result)
}

function error(res, status, message) {
  res.status(status).json({ success: false, error: message })
}

function logAudit(teamId, actorUserId, action, targetType, targetId, details) {
  Database.audit.log({ teamId, actorUserId, action, targetType, targetId, details })
}

// ===== 团队管理 =====

// 创建团队 (需认证)
router.post('/teams', authMiddleware, (req, res) => {
  const { name } = req.body
  if (!name || name.trim().length < 2) {
    return error(res, 400, '团队名称至少需要2个字符')
  }

  const team = Database.teams.createTeam({
    name: name.trim(),
    ownerUserId: req.user.userId,
  })

  // 创建者自动成为 admin
  Database.teamMembers.addMember({
    teamId: team.id,
    userId: req.user.userId,
    role: 'admin',
  })

  logAudit(team.id, req.user.userId, 'team_created', 'team', team.id, { name: team.name })

  success(res, team)
})

// 获取用户的团队列表
router.get('/teams', authMiddleware, (req, res) => {
  const userId = req.user.userId

  // 获取用户作为所有者的团队
  const ownedTeams = Database.teams.getTeamsByOwner(userId)

  // 获取用户作为成员的团队
  const memberTeams = Database.teamMembers.getMembersByTeam
    ? [] // 需要通过其他方式获取
    : []

  // 简单方式：查询所有团队，然后过滤
  const allTeams = ownedTeams // 目前只有所有者在 members 表之外
  success(res, { owned: allTeams, asMember: [] })
})

// 获取团队详情
router.get('/teams/:teamId', authMiddleware, requireTeamMember('params'), (req, res) => {
  const team = Database.teams.getTeamById(req.params.teamId)
  if (!team) return error(res, 404, '团队不存在')

  const members = Database.teamMembers.getMembersByTeam(req.params.teamId)
  const memberCount = Database.teamMember?.getMemberCount
    ? Database.teamMembers.getMemberCount(req.params.teamId)
    : { count: members.length }

  success(res, { ...team, members, memberCount: memberCount.count })
})

// 更新团队名称
router.put('/teams/:teamId', authMiddleware, requireTeamAdmin('params'), (req, res) => {
  const { name } = req.body
  if (!name || name.trim().length < 2) {
    return error(res, 400, '团队名称至少需要2个字符')
  }

  const team = Database.teams.getTeamById(req.params.teamId)
  if (!team) return error(res, 404, '团队不存在')

  Database.teams.updateTeamName(req.params.teamId, name.trim())
  logAudit(req.params.teamId, req.user.userId, 'team_updated', 'team', req.params.teamId, { name })

  success(res, { ...team, name: name.trim() })
})

// 删除团队
router.delete('/teams/:teamId', authMiddleware, requireTeamAdmin('params'), (req, res) => {
  const team = Database.teams.getTeamById(req.params.teamId)
  if (!team) return error(res, 404, '团队不存在')

  // 只有所有者可以删除
  if (team.owner_user_id !== req.user.userId) {
    return error(res, 403, '只有团队所有者可以删除团队')
  }

  Database.teams.deleteTeam(req.params.teamId)
  logAudit(req.params.teamId, req.user.userId, 'team_deleted', 'team', req.params.teamId, { name: team.name })

  success(res, { message: '团队已删除' })
})

// ===== 团队成员管理 =====

// 获取团队成员列表
router.get('/teams/:teamId/members', authMiddleware, requireTeamMember('params'), (req, res) => {
  const members = Database.teamMembers.getMembersByTeam(req.params.teamId)
  success(res, members)
})

// 添加团队成员
router.post('/teams/:teamId/members', authMiddleware, requireTeamAdmin('params'), (req, res) => {
  const { userId, role = 'member' } = req.body

  if (!userId) return error(res, 400, '缺少 userId 参数')

  // 验证用户存在
  const user = Database.users.getUserById(userId)
  if (!user) return error(res, 404, '用户不存在')

  // 验证角色有效
  if (!ROLE_LEVELS[role]) return error(res, 400, '无效的角色')

  // 不能添加比自己权限高的
  if (ROLE_LEVELS[role] > ROLE_LEVELS[req.teamMember.role]) {
    return error(res, 403, '不能添加比自己权限更高的成员')
  }

  try {
    const member = Database.teamMembers.addMember({
      teamId: parseInt(req.params.teamId),
      userId,
      role,
    })
    logAudit(req.params.teamId, req.user.userId, 'member_added', 'team_member', member.id, { userId, role })
    success(res, member)
  } catch (err) {
    if (err.message.includes('已在团队中')) {
      return error(res, 400, '该成员已在团队中')
    }
    throw err
  }
})

// 更新成员角色
router.put('/teams/:teamId/members/:memberId', authMiddleware, requireTeamAdmin('params'), (req, res) => {
  const { role } = req.body
  if (!ROLE_LEVELS[role]) return error(res, 400, '无效的角色')

  const member = Database.teamMembers.getMemberById(req.params.memberId)
  if (!member) return error(res, 404, '成员不存在')

  if (member.team_id !== parseInt(req.params.teamId)) {
    return error(res, 400, '成员不属于该团队')
  }

  // 不能修改所有者的角色
  const team = Database.teams.getTeamById(req.params.teamId)
  if (team.owner_user_id === member.user_id) {
    return error(res, 400, '不能修改团队所有者的角色')
  }

  // 不能把自己改成更高的权限
  if (parseInt(req.params.memberId) === req.teamMember.id) {
    return error(res, 400, '不能修改自己的角色')
  }

  Database.teamMembers.updateMemberRole(req.params.memberId, role)
  logAudit(req.params.teamId, req.user.userId, 'role_changed', 'team_member', req.params.memberId, { role })

  success(res, { ...member, role })
})

// 移除团队成员
router.delete('/teams/:teamId/members/:memberId', authMiddleware, requireTeamAdmin('params'), (req, res) => {
  const member = Database.teamMembers.getMemberById(req.params.memberId)
  if (!member) return error(res, 404, '成员不存在')

  if (member.team_id !== parseInt(req.params.teamId)) {
    return error(res, 400, '成员不属于该团队')
  }

  // 不能移除所有者
  const team = Database.teams.getTeamById(req.params.teamId)
  if (team.owner_user_id === member.user_id) {
    return error(res, 400, '不能移除团队所有者')
  }

  Database.teamMembers.removeMember(req.params.memberId)
  logAudit(req.params.teamId, req.user.userId, 'member_removed', 'team_member', req.params.memberId, { userId: member.user_id })

  success(res, { message: '成员已移除' })
})

// 主动离开团队
router.post('/teams/:teamId/leave', authMiddleware, requireTeamMember('params'), (req, res) => {
  const team = Database.teams.getTeamById(req.params.teamId)
  if (team.owner_user_id === req.user.userId) {
    return error(res, 400, '所有者不能离开团队，请先转让所有权或删除团队')
  }

  Database.teamMembers.removeMember(req.teamMember.id)
  logAudit(req.params.teamId, req.user.userId, 'member_left', 'team_member', req.teamMember.id, {})

  success(res, { message: '已离开团队' })
})

// ===== 请假管理 =====

// 获取请假余额
router.get('/teams/:teamId/leave/balance', authMiddleware, requireTeamMember('params'), (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear()
  const balances = Database.leave.getBalance(req.teamMember.id, year)
  success(res, balances)
})

// 获取请假记录
router.get('/teams/:teamId/leave/requests', authMiddleware, requireTeamMember('params'), (req, res) => {
  const { status, limit } = req.query
  const filters = {}
  if (status) filters.status = status
  if (limit) filters.limit = parseInt(limit)

  // admin 可以看所有，member 只能看自己的
  const isAdmin = ROLE_LEVELS[req.teamMember.role] >= ROLE_LEVELS.admin
  if (isAdmin) {
    const requests = Database.leave.getRequestsByTeam(req.params.teamId, filters)
    return success(res, requests)
  }

  const requests = Database.leave.getRequestsByMember(req.teamMember.id)
  success(res, requests)
})

// 发起请假请求
router.post('/teams/:teamId/leave/requests', authMiddleware, requireTeamMemberOrAdmin('params'), (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body

  if (!leaveType || !startDate || !endDate) {
    return error(res, 400, '缺少必填参数')
  }

  // 计算天数
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (start > end) return error(res, 400, '结束日期不能早于开始日期')

  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1

  // 检查余额
  const available = Database.leave.getAvailableDays(req.teamMember.id, leaveType)
  if (days > available) {
    return error(res, 400, `余额不足，可用天数：${available}天`)
  }

  const request = Database.leave.createRequest({
    teamMemberId: req.teamMember.id,
    leaveType,
    startDate,
    endDate,
    days,
    reason,
  })

  logAudit(req.params.teamId, req.user.userId, 'leave_requested', 'leave_request', request.id, { leaveType, days })

  success(res, request)
})

// 审批请假请求 (admin only)
router.put('/teams/:teamId/leave/requests/:requestId', authMiddleware, requireTeamAdmin('params'), (req, res) => {
  const { status } = req.body
  if (!['approved', 'rejected'].includes(status)) {
    return error(res, 400, '状态只能是 approved 或 rejected')
  }

  const request = Database.leave.getRequestById(req.params.requestId)
  if (!request) return error(res, 404, '请假记录不存在')

  if (request.team_id !== parseInt(req.params.teamId)) {
    return error(res, 400, '该请求不属于此团队')
  }

  if (request.status !== 'pending') {
    return error(res, 400, '该请求已被处理')
  }

  // 更新状态
  Database.leave.updateRequestStatus(req.params.requestId, status, req.user.userId)

  // 如果批准，更新余额
  if (status === 'approved') {
    const balances = Database.leave.getBalance(request.team_member_id)
    const balance = balances.find(b => b.leave_type === request.leave_type)
    if (balance) {
      Database.leave.updateBalance(
        request.team_member_id,
        request.leave_type,
        balance.used_days + request.days
      )
    }
  }

  logAudit(req.params.teamId, req.user.userId, `leave_${status}`, 'leave_request', req.params.requestId, {
    originalRequest: request,
  })

  success(res, { ...request, status, reviewed_by: req.user.userId })
})

// ===== 业务规则 =====

// 获取团队规则
router.get('/teams/:teamId/rules', authMiddleware, requireTeamMember('params'), (req, res) => {
  const { enabled, ruleType } = req.query
  const filters = {}
  if (enabled !== undefined) filters.enabled = enabled === 'true'
  if (ruleType) filters.ruleType = ruleType

  const rules = Database.businessRules.getRulesByTeam(req.params.teamId, filters)
  success(res, rules)
})

// 创建规则
router.post('/teams/:teamId/rules', authMiddleware, requireTeamAdmin('params'), (req, res) => {
  const { ruleType, ruleConfig } = req.body
  if (!ruleType || !ruleConfig) {
    return error(res, 400, '缺少必填参数')
  }

  const rule = Database.businessRules.createRule({
    teamId: req.params.teamId,
    ruleType,
    ruleConfig,
  })

  logAudit(req.params.teamId, req.user.userId, 'rule_created', 'business_rule', rule.id, { ruleType })

  success(res, rule)
})

// 更新规则
router.put('/teams/:teamId/rules/:ruleId', authMiddleware, requireTeamAdmin('params'), (req, res) => {
  const { ruleConfig, enabled } = req.body

  const rule = Database.businessRules.getRuleById(req.params.ruleId)
  if (!rule) return error(res, 404, '规则不存在')

  if (rule.team_id !== parseInt(req.params.teamId)) {
    return error(res, 400, '该规则不属于此团队')
  }

  if (ruleConfig !== undefined) {
    Database.businessRules.updateRuleConfig(req.params.ruleId, ruleConfig)
  }

  if (enabled !== undefined) {
    Database.businessRules.toggleRule(req.params.ruleId, enabled)
  }

  logAudit(req.params.teamId, req.user.userId, 'rule_updated', 'business_rule', req.params.ruleId, { ruleConfig, enabled })

  success(res, { ...rule, ruleConfig: ruleConfig || rule.rule_config, enabled: enabled !== undefined ? enabled : !!rule.enabled })
})

// 删除规则
router.delete('/teams/:teamId/rules/:ruleId', authMiddleware, requireTeamAdmin('params'), (req, res) => {
  const rule = Database.businessRules.getRuleById(req.params.ruleId)
  if (!rule) return error(res, 404, '规则不存在')

  if (rule.team_id !== parseInt(req.params.teamId)) {
    return error(res, 400, '该规则不属于此团队')
  }

  Database.businessRules.deleteRule(req.params.ruleId)
  logAudit(req.params.teamId, req.user.userId, 'rule_deleted', 'business_rule', req.params.ruleId, { ruleType: rule.rule_type })

  success(res, { message: '规则已删除' })
})

// ===== 定时任务 =====

// 获取团队定时任务
router.get('/teams/:teamId/schedules', authMiddleware, requireTeamMember('params'), (req, res) => {
  const schedules = Database.schedules.getSchedulesByTeam(req.params.teamId)
  success(res, schedules)
})

// 创建定时任务
router.post('/teams/:teamId/schedules', authMiddleware, requireTeamAdmin('params'), (req, res) => {
  const { jobType, cronExpression, payload, nextRunAt } = req.body
  if (!jobType || !cronExpression) {
    return error(res, 400, '缺少必填参数')
  }

  // 简单 cron 表达式验证
  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length < 5 || parts.length > 6) {
    return error(res, 400, '无效的 cron 表达式')
  }

  const schedule = Database.schedules.createSchedule({
    teamId: req.params.teamId,
    jobType,
    cronExpression,
    payload,
    nextRunAt,
  })

  logAudit(req.params.teamId, req.user.userId, 'schedule_created', 'recurring_schedule', schedule.id, { jobType, cronExpression })

  success(res, schedule)
})

// 更新定时任务
router.put('/teams/:teamId/schedules/:scheduleId', authMiddleware, requireTeamAdmin('params'), (req, res) => {
  const { cronExpression, payload, enabled } = req.body

  const schedule = Database.schedules.getScheduleById(req.params.scheduleId)
  if (!schedule) return error(res, 404, '任务不存在')

  if (schedule.team_id !== parseInt(req.params.teamId)) {
    return error(res, 400, '该任务不属于此团队')
  }

  if (cronExpression !== undefined) {
    // 简单验证
    const parts = cronExpression.trim().split(/\s+/)
    if (parts.length < 5 || parts.length > 6) {
      return error(res, 400, '无效的 cron 表达式')
    }
    Database.schedules._run(
      `UPDATE recurring_schedules SET cron_expression = ? WHERE id = ?`,
      [cronExpression, req.params.scheduleId]
    )
  }

  if (payload !== undefined) {
    const payloadJson = typeof payload === 'string' ? payload : JSON.stringify(payload)
    Database.schedules._run(
      `UPDATE recurring_schedules SET payload = ? WHERE id = ?`,
      [payloadJson, req.params.scheduleId]
    )
  }

  if (enabled !== undefined) {
    Database.schedules.toggleSchedule(req.params.scheduleId, enabled)
  }

  Database.schedules.store.debouncedSave()

  logAudit(req.params.teamId, req.user.userId, 'schedule_updated', 'recurring_schedule', req.params.scheduleId, {
    cronExpression,
    enabled,
  })

  success(res, { ...schedule, cronExpression: cronExpression || schedule.cron_expression, enabled: enabled !== undefined ? enabled : !!schedule.enabled })
})

// 删除定时任务
router.delete('/teams/:teamId/schedules/:scheduleId', authMiddleware, requireTeamAdmin('params'), (req, res) => {
  const schedule = Database.schedules.getScheduleById(req.params.scheduleId)
  if (!schedule) return error(res, 404, '任务不存在')

  if (schedule.team_id !== parseInt(req.params.teamId)) {
    return error(res, 400, '该任务不属于此团队')
  }

  Database.schedules.deleteSchedule(req.params.scheduleId)
  logAudit(req.params.teamId, req.user.userId, 'schedule_deleted', 'recurring_schedule', req.params.scheduleId, { jobType: schedule.job_type })

  success(res, { message: '任务已删除' })
})

// ===== 审计日志 =====

// 获取审计日志
router.get('/teams/:teamId/audit', authMiddleware, requireTeamMember('params'), (req, res) => {
  const { action, targetType, limit } = req.query
  const filters = {}
  if (action) filters.action = action
  if (targetType) filters.targetType = targetType
  if (limit) filters.limit = parseInt(limit)

  const logs = Database.audit.getLogsByTeam(req.params.teamId, filters)
  success(res, logs)
})

// ===== 自然语言接口 =====

// 处理自然语言输入
router.post('/teams/:teamId/nl', authMiddleware, requireTeamMember('params'), async (req, res) => {
  const { message, confirmed, intent, entities } = req.body

  if (!message && !confirmed) {
    return error(res, 400, '请提供 message 参数')
  }

  // 如果是确认后的执行
  if (confirmed && intent) {
    try {
      const result = await nlService.executeAction(intent, entities || {}, {
        teamId: parseInt(req.params.teamId),
        userId: req.user.userId,
        teamMember: req.teamMember,
        db: Database,
      })
      return success(res, result)
    } catch (err) {
      safeLog({ error: err.message, type: 'nl_execute_error' }, '❌ NL 执行失败')
      return error(res, 500, '执行失败：' + err.message)
    }
  }

  // 正常分类 + 可能的确认
  try {
    const result = await nlService.processNLInput(message, {
      teamId: parseInt(req.params.teamId),
      userId: req.user.userId,
      teamMember: req.teamMember,
    }, Database)

    return success(res, result)
  } catch (err) {
    safeLog({ error: err.message, type: 'nl_process_error' }, '❌ NL 处理失败')
    return error(res, 500, '处理失败：' + err.message)
  }
})

module.exports = router
