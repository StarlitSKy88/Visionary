/**
 * 认证中间件 - HMAC签名Token
 */

const crypto = require('crypto')
const Database = require('../db')

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

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  optionalAuth,
  sanitizeInput,
  isValidEmail,
  rateLimiter,
}
