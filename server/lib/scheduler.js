/**
 * Scheduler - 定时任务调度器
 *
 * 使用 node-cron 实现进程内调度
 * 支持从数据库加载和恢复定时任务
 */

const cron = require('node-cron')
const Database = require('../db')
const { safeLog } = require('./logger')

// 存储活跃的 cron 任务
const activeJobs = new Map()

// 获取数据库实例（延迟获取避免循环依赖）
function getDb() {
  return Database
}

/**
 * 解析 cron 表达式，计算下次执行时间
 */
function getNextRunTime(cronExpression) {
  // node-cron 解析并获取下次执行时间
  try {
    // 使用简单的 cron 解析估算下次时间
    const parts = cronExpression.trim().split(/\s+/)
    if (parts.length < 5) return null

    const now = new Date()
    // 简化：每分钟检查一次
    const next = new Date(now.getTime() + 60 * 1000)
    return next.toISOString()
  } catch {
    return null
  }
}

/**
 * 根据任务类型执行任务
 */
async function executeJob(schedule) {
  const { id, team_id, job_type, payload } = schedule
  const db = getDb()

  try {
    safeLog({ scheduleId: id, jobType: job_type, type: 'job_executed' }, '[Scheduler] 执行任务')

    switch (job_type) {
      case 'reminder': {
        const { message, createdBy } = payload
        // 记录到审计日志
        db.audit.log({
          teamId: team_id,
          actorUserId: createdBy || 0,
          action: 'reminder_sent',
          targetType: 'recurring_schedule',
          targetId: id,
          details: { message },
        })
        safeLog({ scheduleId: id, message, type: 'reminder_sent' }, '[Scheduler] 提醒任务')
        break
      }

      case 'leave_summary': {
        // 每周五发送请假汇总
        const members = db.teamMembers.getMembersByTeam(team_id)
        for (const member of members) {
          const balances = db.leave.getBalance(member.id)
          const pendingRequests = db.leave.getRequestsByTeam(team_id, {
            status: 'pending',
            memberId: member.id,
          })
          safeLog({ scheduleId: id, email: member.email, pending: pendingRequests.length, type: 'leave_summary' }, '[Scheduler] 请假汇总')
        }
        break
      }

      case 'balance_check': {
        // 每月检查一次余额
        const members = db.teamMembers.getMembersByTeam(team_id)
        for (const member of members) {
          const balances = db.leave.getBalance(member.id)
          const lowBalance = balances.filter(b => (b.total_days - b.used_days) < 2)
          if (lowBalance.length > 0) {
            safeLog({ scheduleId: id, email: member.email, lowBalance: lowBalance.map(b => b.leave_type), type: 'balance_check' }, '[Scheduler] 余额预警')
          }
        }
        break
      }

      default:
        safeLog({ scheduleId: id, jobType: job_type, type: 'unknown_job_type' }, '[Scheduler] 未知任务类型')
    }

    // 更新下次执行时间
    const nextRunAt = getNextRunTime(schedule.cron_expression)
    if (nextRunAt) {
      db.schedules.updateNextRun(id, nextRunAt)
    }
  } catch (error) {
    safeLog({ scheduleId: id, error: error.message, type: 'job_failed' }, `[Scheduler] 任务 #${id} 执行失败`)
  }
}

/**
 * 启动一个定时任务
 */
function startJob(schedule) {
  const db = getDb()
  const { id, cron_expression, enabled } = schedule

  if (!enabled) return
  if (activeJobs.has(id)) return

  // 验证 cron 表达式
  if (!cron.validate(cron_expression)) {
    safeLog({ cronExpression: cron_expression, type: 'invalid_cron' }, `[Scheduler] 无效的 cron 表达式`)
    return
  }

  const job = cron.schedule(cron_expression, async () => {
    // 重新从数据库获取最新状态
    const freshSchedule = db.schedules.getScheduleById(id)
    if (!freshSchedule || !freshSchedule.enabled) {
      if (activeJobs.has(id)) {
        activeJobs.get(id).stop()
        activeJobs.delete(id)
      }
      return
    }
    await executeJob(freshSchedule)
  })

  activeJobs.set(id, job)
  safeLog({ scheduleId: id, cronExpression: cron_expression, type: 'job_started' }, `[Scheduler] 已启动任务`)
}

/**
 * 停止一个定时任务
 */
function stopJob(scheduleId) {
  if (activeJobs.has(scheduleId)) {
    activeJobs.get(scheduleId).stop()
    activeJobs.delete(scheduleId)
    safeLog({ scheduleId, type: 'job_stopped' }, `[Scheduler] 已停止任务`)
  }
}

/**
 * 从数据库加载所有定时任务并启动
 */
function loadAndStartAll() {
  safeLog({ type: 'scheduler_loading' }, '[Scheduler] 从数据库加载定时任务...')

  const db = getDb()
  const schedules = db.schedules.getEnabledSchedules()
  safeLog({ count: schedules.length, type: 'schedules_loaded' }, `[Scheduler] 找到 ${schedules.length} 个启用的定时任务`)

  for (const schedule of schedules) {
    startJob(schedule)
  }
}

/**
 * 初始化调度器
 */
function init() {
  safeLog({ type: 'scheduler_init' }, '[Scheduler] 初始化调度器...')
  loadAndStartAll()
}

/**
 * 优雅关闭
 */
function shutdown() {
  safeLog({ type: 'scheduler_shutdown' }, '[Scheduler] 关闭调度器...')
  for (const [id, job] of activeJobs) {
    job.stop()
    safeLog({ scheduleId: id, type: 'job_stopped_during_shutdown' }, `[Scheduler] 已停止任务`)
  }
  activeJobs.clear()
}

module.exports = {
  init,
  shutdown,
  startJob,
  stopJob,
  executeJob,
  loadAndStartAll,
}
