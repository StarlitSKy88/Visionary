const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const Database = require('../db')
const { formatUserResponse } = require('../db')
const { generateToken, authMiddleware, sanitizeInput, isValidEmail, rateLimiter } = require('../lib/auth')
const { sendVerificationCode } = require('../lib/email-service')
const { safeLog } = require('../lib/logger')

// 验证码暴力破解锁定配置
const MAX_FAILED_ATTEMPTS = 5      // 5次失败后锁定
const LOCKOUT_DURATION_MS = 15 * 60 * 1000  // 锁定15分钟

/**
 * 检查邮箱+IP是否被锁定
 */
function isEmailCodeLocked(email, ip) {
  const { getDb, saveDatabase } = require('../db/store-sqlite')
  const db = getDb()
  if (!db) return false

  const result = db.exec(
    `SELECT locked_until FROM email_code_attempts WHERE email = ? AND ip = ? LIMIT 1`,
    [email, ip]
  )

  if (result.length === 0 || result[0].values.length === 0) return false

  const lockedUntil = result[0].values[0][0]
  if (!lockedUntil) return false

  return Date.now() < lockedUntil
}

/**
 * 记录验证码验证失败
 */
function recordEmailCodeFailure(email, ip) {
  const { getDb, saveDatabase } = require('../db/store-sqlite')
  const db = getDb()
  if (!db) return

  // 查找现有记录
  const existing = db.exec(
    `SELECT id, failed_count FROM email_code_attempts WHERE email = ? AND ip = ?`,
    [email, ip]
  )

  if (existing.length > 0 && existing[0].values.length > 0) {
    const id = existing[0].values[0][0]
    const failedCount = existing[0].values[0][1] + 1

    const lockedUntil = failedCount >= MAX_FAILED_ATTEMPTS
      ? Date.now() + LOCKOUT_DURATION_MS
      : null

    db.run(
      `UPDATE email_code_attempts SET failed_count = ?, locked_until = ? WHERE id = ?`,
      [failedCount, lockedUntil, id]
    )
  } else {
    db.run(
      `INSERT INTO email_code_attempts (email, ip, failed_count, locked_until) VALUES (?, ?, 1, NULL)`,
      [email, ip]
    )
  }

  require('../db/store-sqlite').store.debouncedSave()
}

/**
 * 清除验证码失败记录（验证成功后调用）
 */
function clearEmailCodeAttempts(email, ip) {
  const { getDb } = require('../db/store-sqlite')
  const db = getDb()
  if (!db) return

  db.run(`DELETE FROM email_code_attempts WHERE email = ? AND ip = ?`, [email, ip])
  require('../db/store-sqlite').store.debouncedSave()
}

router.post('/send-email-code', async (req, res) => {
  const { email } = req.body

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, error: '请输入正确的邮箱地址' })
  }

  const sanitizedEmail = sanitizeInput(email)
  const clientIp = req.ip || req.connection.remoteAddress

  if (!rateLimiter.check(`email:${sanitizedEmail}`, 1, 60 * 1000)) {
    return res.status(429).json({ success: false, error: '发送过于频繁，请60秒后重试' })
  }

  if (!rateLimiter.check(`ip:${clientIp}`, 5, 60 * 1000)) {
    return res.status(429).json({ success: false, error: '操作过于频繁，请稍后重试' })
  }

  // 检查是否被锁定
  if (isEmailCodeLocked(sanitizedEmail, clientIp)) {
    return res.status(429).json({ success: false, error: '验证次数过多，请15分钟后再试' })
  }

  const code = Math.random().toString().slice(2, 8)
  const expiresAt = Date.now() + 5 * 60 * 1000

  Database.createEmailCode(sanitizedEmail, code, expiresAt)

  // 尝试发送真实邮件（降级到 console）
  await sendVerificationCode(sanitizedEmail, code)

  res.json({ success: true, message: '验证码已发送' })
})

router.post('/login', (req, res) => {
  const { email, code } = req.body
  if (!email || !code) {
    return res.status(400).json({ success: false, error: '请输入邮箱和验证码' })
  }

  const sanitizedEmail = sanitizeInput(email)
  const clientIp = req.ip || req.connection.remoteAddress

  if (!rateLimiter.check(`login:${sanitizedEmail}`, 5, 60 * 1000)) {
    return res.status(429).json({ success: false, error: '尝试次数过多，请稍后重试' })
  }

  // 检查是否被锁定
  if (isEmailCodeLocked(sanitizedEmail, clientIp)) {
    return res.status(429).json({ success: false, error: '验证次数过多，请15分钟后再试' })
  }

  if (!Database.verifyEmailCode(sanitizedEmail, code)) {
    recordEmailCodeFailure(sanitizedEmail, clientIp)
    return res.status(400).json({ success: false, error: '验证码错误或已过期' })
  }

  // 验证成功，清除失败记录
  clearEmailCodeAttempts(sanitizedEmail, clientIp)

  const user = Database.getUserByEmail(sanitizedEmail)
  if (!user) {
    return res.status(404).json({ success: false, error: '用户不存在，请先注册' })
  }

  const token = generateToken(user.id, user.email)
  res.json({ success: true, token, user: formatUserResponse(user) })
})

router.post('/register', (req, res) => {
  const { email, code, industry, scale, role, invitedBy } = req.body

  if (!email || !code) {
    return res.status(400).json({ success: false, error: '请输入邮箱和验证码' })
  }

  const sanitizedEmail = sanitizeInput(email)
  const clientIp = req.ip || req.connection.remoteAddress

  // 检查是否被锁定
  if (isEmailCodeLocked(sanitizedEmail, clientIp)) {
    return res.status(429).json({ success: false, error: '验证次数过多，请15分钟后再试' })
  }

  if (!Database.verifyEmailCode(sanitizedEmail, code)) {
    recordEmailCodeFailure(sanitizedEmail, clientIp)
    return res.status(400).json({ success: false, error: '验证码错误或已过期' })
  }

  // 验证成功，清除失败记录
  clearEmailCodeAttempts(sanitizedEmail, clientIp)

  const existingUser = Database.getUserByEmail(sanitizedEmail)
  if (existingUser) {
    return res.status(400).json({ success: false, error: '该邮箱已注册' })
  }

  const inviteCode = uuidv4().substring(0, 8).toUpperCase()

  try {
    const user = Database.createUser({
      email: sanitizedEmail,
      industry: sanitizeInput(industry || ''),
      scale: sanitizeInput(scale || ''),
      role: sanitizeInput(role || ''),
      inviteCode,
    })

    if (invitedBy) {
      const inviter = Database.getUserByInviteCode(sanitizeInput(invitedBy))
      if (inviter) {
        const newProgress = (inviter.invite_progress || 0) + 1
        Database.updateInviteProgress(inviter.id, newProgress)
        if (newProgress >= 3 && inviter.refunded !== 1) {
          safeLog({ email: inviter.email, type: 'invite_refund_eligible' }, '🎉 邀请达标，可退款')
        }
      }
    }

    const token = generateToken(user.id, sanitizedEmail)
    safeLog({ email: sanitizedEmail, inviteCode, type: 'user_registered' }, '✅ 新用户注册')

    res.json({ success: true, token, user: formatUserResponse(user) })
  } catch (error) {
    safeLog({ error: error.message, type: 'register_failed' }, '❌ 注册失败')
    res.status(500).json({ success: false, error: error.message || '注册失败' })
  }
})

router.get('/me', authMiddleware, (req, res) => {
  res.json({ success: true, user: formatUserResponse(req.userRecord) })
})

module.exports = router
