/**
 * 邮件发送服务
 * 支持 Resend API（优先）和 SMTP（备选）
 * OPC 原则：零额外依赖，使用 Node.js 原生能力 + fetch
 */

// ===== Resend API（推荐，免费额度 100封/天）=====
async function sendViaResend(to, subject, html) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) return null

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'AI经营助手 <noreply@yourdomain.com>',
      to: [to],
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
async function sendViaSMTP(to, subject, html) {
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
      from: process.env.EMAIL_FROM || SMTP_USER,
      to,
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
      console.log(`📧 验证码邮件已发送 (Resend): ${email}`)
      return { sent: true, method: 'resend' }
    }
  } catch (e) {
    console.warn('Resend 发送失败:', e.message)
  }

  try {
    const smtpResult = await sendViaSMTP(email, subject, html)
    if (smtpResult) {
      console.log(`📧 验证码邮件已发送 (SMTP): ${email}`)
      return { sent: true, method: 'smtp' }
    }
  } catch (e) {
    console.warn('SMTP 发送失败:', e.message)
  }

  // 降级：输出到 console（开发模式）
  console.log(`\n📧 验证码 → ${email}: ${code} (5分钟有效) [未配置邮件服务，使用console输出]\n`)
  return { sent: false, method: 'console', code }
}

module.exports = { sendVerificationCode }
