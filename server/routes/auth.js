const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const Database = require('../db')
const { formatUserResponse } = require('../db')
const { generateToken, authMiddleware, sanitizeInput, isValidEmail, rateLimiter } = require('../lib/auth')
const { sendVerificationCode } = require('../lib/email-service')
const { safeLog } = require('../lib/logger')

router.post('/send-email-code', async (req, res) => {
  const { email } = req.body

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, error: '请输入正确的邮箱地址' })
  }

  if (!rateLimiter.check(`email:${email}`, 1, 60 * 1000)) {
    return res.status(429).json({ success: false, error: '发送过于频繁，请60秒后重试' })
  }

  const clientIp = req.ip || req.connection.remoteAddress
  if (!rateLimiter.check(`ip:${clientIp}`, 5, 60 * 1000)) {
    return res.status(429).json({ success: false, error: '操作过于频繁，请稍后重试' })
  }

  const code = Math.random().toString().slice(2, 8)
  const expiresAt = Date.now() + 5 * 60 * 1000

  Database.createEmailCode(email, code, expiresAt)

  // 尝试发送真实邮件（降级到 console）
  await sendVerificationCode(email, code)

  res.json({ success: true, message: '验证码已发送' })
})

router.post('/login', (req, res) => {
  const { email, code } = req.body
  if (!email || !code) {
    return res.status(400).json({ success: false, error: '请输入邮箱和验证码' })
  }

  const sanitizedEmail = sanitizeInput(email)

  if (!rateLimiter.check(`login:${sanitizedEmail}`, 5, 60 * 1000)) {
    return res.status(429).json({ success: false, error: '尝试次数过多，请稍后重试' })
  }

  if (!Database.verifyEmailCode(sanitizedEmail, code)) {
    return res.status(400).json({ success: false, error: '验证码错误或已过期' })
  }

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

  if (!Database.verifyEmailCode(sanitizedEmail, code)) {
    return res.status(400).json({ success: false, error: '验证码错误或已过期' })
  }

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
