/**
 * 认证中间件 - HMAC签名Token
 */

const crypto = require('crypto')
const Database = require('../db')

// 角色权限级别
const ROLE_LEVELS = {
  admin: 3,
  member: 2,
  viewer: 1,
}

const JWT_SECRET = process.env.JWT_SECRET || 'ai-agent-secret-key-change-in-production'

// Token有效期：7天
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000

// 用户缓存（60秒TTL）
const userCache = new Map()

/**
 * 生成安全Token
 * 格式: base64(userId):base64(email):timestamp:signature
 */
function generateToken(userId, email) {
  const timestamp = Date.now()
  const bUserId = Buffer.from(String(userId)).toString('base64url')
  const bEmail = Buffer.from(email).toString('base64url')
  const payload = `${bUserId}:${bEmail}:${timestamp}`
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payload)
    .digest('hex')
    .substring(0, 32)

  return `${payload}:${signature}`
}

/**
 * 验证Token
 */
function verifyToken(token) {
  try {
    const parts = token.split(':')
    if (parts.length !== 4) {
      return null
    }

    const [bUserId, bEmail, timestampStr, signature] = parts
    const userId = parseInt(Buffer.from(bUserId, 'base64url').toString())
    const email = Buffer.from(bEmail, 'base64url').toString()
    const timestamp = parseInt(timestampStr)

    // 检查过期
    if (Date.now() - timestamp > TOKEN_EXPIRY) {
      return null
    }

    // 验证签名
    const payload = `${bUserId}:${bEmail}:${timestampStr}`
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(payload)
      .digest('hex')
      .substring(0, 32)

    if (signature !== expectedSignature) {
      return null
    }

    return { userId, email, timestamp }
  } catch {
    return null
  }
}

/**
 * 认证中间件
 */
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未登录' })
  }

  const token = auth.substring(7)
  const payload = verifyToken(token)

  if (!payload) {
    return res.status(401).json({ success: false, error: '登录已过期，请重新登录' })
  }

  // 附加用户信息到请求
  req.user = payload

  // 验证用户存在（带简短缓存，避免每次请求查库）
  const cacheKey = `user:${payload.userId}`
  const cached = userCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < 60000) {
    req.userRecord = cached.user
  } else {
    const user = Database.getUserById(payload.userId)
    if (!user) {
      return res.status(401).json({ success: false, error: '用户不存在' })
    }
    userCache.set(cacheKey, { user, ts: Date.now() })
    req.userRecord = user
  }

  next()
}

/**
 * 可选认证（不强制）
 */
function optionalAuth(req, res, next) {
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.substring(7)
    const payload = verifyToken(token)
    if (payload) {
      req.user = payload
      const user = Database.getUserById(payload.userId)
      if (user) {
        req.userRecord = user
      }
    }
  }
  next()
}

/**
 * 输入净化
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input

  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
}

/**
 * 邮箱验证
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * 简易速率限制
 */
const rateLimiter = {
  _counts: new Map(),
  _lastCleanup: Date.now(),

  check(key, limit = 10, windowMs = 60 * 1000) {
    const now = Date.now()

    // 每10分钟清理过期条目
    if (now - this._lastCleanup > 10 * 60 * 1000) {
      for (const [k, v] of this._counts) {
        if (now - v.startTime > 10 * 60 * 1000) this._counts.delete(k)
      }
      this._lastCleanup = now
    }

    const record = this._counts.get(key)

    if (!record || now - record.startTime > windowMs) {
      this._counts.set(key, { count: 1, startTime: now })
      return true
    }

    if (record.count >= limit) {
      return false
    }

    record.count++
    return true
  }
}

/**
 * 团队认证中间件
 * 验证用户是否为团队成员，并检查角色权限
 *
 * @param {string|string[]} requiredRoles - 允许访问的角色列表，或单个角色
 * @param {string} teamIdSource - team_id 的来源：'body' | 'query' | 'params'
 */
function teamAuthMiddleware(requiredRoles = [], teamIdSource = 'body') {
  // 统一为数组
  const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  // 如果未指定角色，则只要是成员即可
  const checkRole = rolesArray.length > 0

  return (req, res, next) => {
    // authMiddleware 应该已经运行过
    if (!req.user || !req.userRecord) {
      return res.status(401).json({ success: false, error: '请先登录' })
    }

    // 获取 team_id
    let teamId
    if (teamIdSource === 'body') {
      teamId = req.body?.teamId || req.body?.team_id
    } else if (teamIdSource === 'query') {
      teamId = req.query?.teamId || req.query?.team_id
    } else if (teamIdSource === 'params') {
      teamId = req.params?.teamId || req.params?.team_id
    }

    if (!teamId) {
      return res.status(400).json({ success: false, error: '缺少 team_id 参数' })
    }

    teamId = parseInt(teamId, 10)
    if (isNaN(teamId)) {
      return res.status(400).json({ success: false, error: '无效的 team_id' })
    }

    // 查找用户在团队中的成员记录
    const member = Database.teamMembers.getMemberByUserAndTeam(req.user.userId, teamId)
    if (!member) {
      return res.status(403).json({ success: false, error: '您不是该团队成员' })
    }

    // 角色权限检查
    if (checkRole) {
      const userRoleLevel = ROLE_LEVELS[member.role] || 0
      const allowed = rolesArray.some(r => ROLE_LEVELS[r] && ROLE_LEVELS[r] <= userRoleLevel)
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: `需要 ${rolesArray.join('/')} 权限，您的角色是 ${member.role}`,
        })
      }
    }

    // 附加团队成员信息到请求
    req.teamMember = member
    req.teamId = teamId

    next()
  }
}

/**
 * 便捷方法：仅检查团队成员身份（不检查具体角色）
 * @param {string} teamIdSource - team_id 来源：'body' | 'query' | 'params'
 */
function requireTeamMember(teamIdSource = 'body') {
  return teamAuthMiddleware([], teamIdSource)
}

/**
 * 便捷方法：要求 admin 角色
 * @param {string} teamIdSource - team_id 来源：'body' | 'query' | 'params'
 */
function requireTeamAdmin(teamIdSource = 'body') {
  return teamAuthMiddleware(['admin'], teamIdSource)
}

/**
 * 便捷方法：要求 admin 或 member 角色
 * @param {string} teamIdSource - team_id 来源：'body' | 'query' | 'params'
 */
function requireTeamMemberOrAdmin(teamIdSource = 'body') {
  return teamAuthMiddleware(['admin', 'member'], teamIdSource)
}

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  optionalAuth,
  sanitizeInput,
  isValidEmail,
  rateLimiter,
  teamAuthMiddleware,
  requireTeamMember,
  requireTeamAdmin,
  requireTeamMemberOrAdmin,
  ROLE_LEVELS,
}
