/**
 * 邮件发送服务
 * 支持 Resend API（优先）和 SMTP（备选）
 * OPC 原则：零额外依赖，使用 Node.js 原生能力 + fetch
 */

const { safeLog } = require('./logger')

// ===== Resend API（推荐，免费额度 100封/天）=====
async function sendViaResend(to, subject, html, fromName) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) return null

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: fromName || process.env.EMAIL_FROM || 'AI经营助手 <noreply@yourdomain.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Resend 发送失败: ${response.status} ${err}`)
  }

  return await response.json()
}

// ===== SMTP（备选方案，使用 nodemailer 风格的 net 连接）=====
// 如果没有 Resend Key 且配置了 SMTP，使用 simple SMTP
async function sendViaSMTP(to, subject, html, fromName) {
  const SMTP_HOST = process.env.SMTP_HOST
  const SMTP_PORT = process.env.SMTP_PORT
  const SMTP_USER = process.env.SMTP_USER
  const SMTP_PASS = process.env.SMTP_PASS

  if (!SMTP_HOST || !SMTP_USER) return null

  // 使用 nodemailer 如果已安装
  try {
    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT) || 587,
      secure: (parseInt(SMTP_PORT) || 587) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })

    await transporter.sendMail({
      from: fromName || process.env.EMAIL_FROM || SMTP_USER,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    })

    return { sent: true, method: 'smtp' }
  } catch (e) {
    // nodemailer 未安装
    return null
  }
}

/**
 * 通用邮件发送函数
 * 尝试 Resend → SMTP → 降级
 * @param {string|string[]} to - 收件人
 * @param {string} subject - 主题
 * @param {string} html - HTML内容
 * @param {string} fromName - 发件人名称（可选）
 */
async function sendEmail(to, subject, html, fromName) {
  // 尝试 Resend
  try {
    const resendResult = await sendViaResend(to, subject, html, fromName)
    if (resendResult) {
      safeLog({ to, subject, type: 'email_sent_resend' }, '📧 邮件已发送 (Resend)')
      return { sent: true, method: 'resend', result: resendResult }
    }
  } catch (e) {
    safeLog({ to, subject, error: e.message }, '⚠️ Resend 发送失败')
  }

  // 尝试 SMTP
  try {
    const smtpResult = await sendViaSMTP(to, subject, html, fromName)
    if (smtpResult) {
      safeLog({ to, subject, type: 'email_sent_smtp' }, '📧 邮件已发送 (SMTP)')
      return { sent: true, method: 'smtp', result: smtpResult }
    }
  } catch (e) {
    safeLog({ to, subject, error: e.message }, '⚠️ SMTP 发送失败')
  }

  // 降级：输出到 console（开发模式）
  safeLog({ to, subject, type: 'email_fallback' }, '📧 邮件降级输出（生产请配置 Resend 或 SMTP）')
  return { sent: false, method: 'console' }
}

/**
 * 发送验证码邮件
 * @param {string} email - 收件人
 * @param {string} code - 验证码
 */
async function sendVerificationCode(email, code) {
  const subject = '【AI经营助手】你的验证码'
  const html = `
    <div style="max-width:480px;margin:0 auto;font-family:sans-serif;background:#2e3440;color:#eceff4;padding:32px;border-radius:16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:48px;height:48px;background:#88c0d0;border-radius:12px;line-height:48px;font-size:24px;font-weight:bold;color:#2e3440;">AI</div>
        <h1 style="margin:16px 0 0;color:#eceff4;font-size:20px;">AI经营助手</h1>
      </div>
      <div style="background:#3b4252;border-radius:12px;padding:24px;text-align:center;">
        <p style="margin:0 0 12px;color:#81a1c1;font-size:14px;">你的验证码是</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#88c0d0;font-family:monospace;">${code}</div>
        <p style="margin:12px 0 0;color:#616e88;font-size:12px;">5分钟内有效，请勿泄露给他人</p>
      </div>
      <p style="text-align:center;color:#616e88;font-size:12px;margin-top:16px;">如果你没有请求此验证码，请忽略此邮件</p>
    </div>
  `

  // 尝试 Resend → SMTP → 降级到 console
  try {
    const resendResult = await sendViaResend(email, subject, html)
    if (resendResult) {
      safeLog({ email, type: 'email_sent_resend' }, '📧 验证码邮件已发送 (Resend)')
      return { sent: true, method: 'resend' }
    }
  } catch (e) {
    safeLog({ email, error: e.message }, '⚠️ Resend 发送失败')
  }

  try {
    const smtpResult = await sendViaSMTP(email, subject, html)
    if (smtpResult) {
      safeLog({ email, type: 'email_sent_smtp' }, '📧 验证码邮件已发送 (SMTP)')
      return { sent: true, method: 'smtp' }
    }
  } catch (e) {
    safeLog({ email, error: e.message }, '⚠️ SMTP 发送失败')
  }

  // 降级：输出到 console（开发模式）- 已脱敏
  safeLog({ email, type: 'verification_code_fallback', validMinutes: 5 }, '📧 验证码降级输出（生产请配置 Resend）')
  return { sent: false, method: 'console', code }
}

module.exports = { sendEmail, sendVerificationCode }
