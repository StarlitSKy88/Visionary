/**
 * 配额中间件 - 防止单用户耗尽 API 额度
 */

// 默认配额配置
const DEFAULT_QUOTA = {
  monthlyTokens: 100000,  // 免费用户每月 10 万 tokens
}

// 缓存用户配额检查结果（避免频繁查询数据库）
const quotaCache = new Map()
const QUOTA_CACHE_TTL = 60 * 1000 // 1分钟缓存

/**
 * 检查用户配额
 * @param {number} userId - 用户 ID
 * @returns {{ allowed: boolean, used: number, limit: number, resetAt: string }}
 */
async function checkUserQuota(userId) {
  const Database = require('../db')

  // 检查缓存
  const cached = quotaCache.get(userId)
  if (cached && Date.now() - cached.ts < QUOTA_CACHE_TTL) {
    return cached.result
  }

  // 获取当月用量
  const usage = Database.tokenUsage.getUserMonthlyUsage(userId)
  const used = usage?.totalTokens || 0
  const limit = DEFAULT_QUOTA.monthlyTokens

  // 计算下月重置日期
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const resetAt = nextMonth.toISOString()

  const result = {
    allowed: used < limit,
    used,
    limit,
    resetAt,
    remaining: Math.max(0, limit - used),
  }

  // 缓存结果
  quotaCache.set(userId, { result, ts: Date.now() })

  return result
}

/**
 * 清除用户配额缓存（用户消耗 token 后调用）
 */
function clearQuotaCache(userId) {
  quotaCache.delete(userId)
}

/**
 * 配额中间件 - 用于需要检查配额的路由
 */
function quotaMiddleware(options = {}) {
  const { resourceType = 'chat' } = options

  return async (req, res, next) => {
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({ success: false, error: '未授权' })
    }

    try {
      const quota = await checkUserQuota(userId)

      // 将配额信息附加到请求对象，供后续使用
      req.userQuota = quota

      if (!quota.allowed) {
        return res.status(429).json({
          success: false,
          error: '本月配额已用尽，请下月再试或升级服务',
          quota: {
            used: quota.used,
            limit: quota.limit,
            resetAt: quota.resetAt,
          },
        })
      }

      next()
    } catch (error) {
      console.error('配额检查失败:', error)
      // 配额检查失败时，允许通过（避免影响正常服务）
      next()
    }
  }
}

module.exports = {
  quotaMiddleware,
  checkUserQuota,
  clearQuotaCache,
  DEFAULT_QUOTA,
}
