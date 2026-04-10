/**
 * 微信支付 V3 服务
 * 支持：Native支付、JSAPI支付、回调验证
 *
 * 环境变量：
 *   WECHAT_MCHID         - 商户号
 *   WECHAT_SERIAL_NO     - 证书序列号
 *   WECHAT_API_V3_KEY    - APIv3密钥（32字符）
 *   WECHAT_PRIVATE_KEY_PATH - 私钥文件路径
 *   WECHAT_CERT_PATH      - 平台证书路径（可选，用于验证回调）
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { safeLog } = require('./logger')

// ===== 微信支付 API V3 配置 =====

const WECHAT_PAY_V3_URL = 'https://api.mch.weixin.qq.com/v3'

function getConfig() {
  return {
    mchId: process.env.WECHAT_MCHID,
    serialNo: process.env.WECHAT_SERIAL_NO,
    apiV3Key: process.env.WECHAT_API_V3_KEY,
    privateKeyPath: process.env.WECHAT_PRIVATE_KEY_PATH,
    certPath: process.env.WECHAT_CERT_PATH,
  }
}

function isConfigured() {
  const cfg = getConfig()
  return !!(cfg.mchId && cfg.serialNo && cfg.apiV3Key && cfg.privateKeyPath)
}

/**
 * 获取私钥内容
 */
function getPrivateKey() {
  const { privateKeyPath } = getConfig()
  if (!privateKeyPath) return null
  try {
    return fs.readFileSync(path.resolve(privateKeyPath), 'utf8')
  } catch {
    return null
  }
}

/**
 * 获取平台证书（用于验证回调）
 */
function getPlatformCert() {
  const { certPath } = getConfig()
  if (!certPath) return null
  try {
    return fs.readFileSync(path.resolve(certPath), 'utf8')
  } catch {
    return null
  }
}

/**
 * 生成请求签名 (RSA-SHA256)
 */
function signRequest(method, urlPath, timestamp, nonceStr, body) {
  const privateKey = getPrivateKey()
  if (!privateKey) return null

  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body || ''}\n`
  const sign = crypto.sign('RSA-SHA256', Buffer.from(message), {
    key: privateKey,
    padding: crypto.constants.RSSI_PKCS1v15,
  })
  return sign.toString('base64')
}

/**
 * 构建 HTTP 签名头
 */
function buildAuthHeaders(method, urlPath, body) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonceStr = crypto.randomBytes(16).toString('hex')
  const signature = signRequest(method, urlPath, timestamp, nonceStr, body)

  if (!signature) return null

  return {
    'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${getConfig().mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${getConfig().serialNo}"`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}

/**
 * 统一下单 API
 * @param {string} description - 商品描述
 * @param {string} outTradeNo - 商户订单号
 * @param {number} amount - 金额（分）
 * @param {string} notifyUrl - 回调URL
 * @param {string} tradeType - 交易类型：NATIVE / JSAPI / APP
 * @param {object} extra - 额外参数
 */
async function createUnifiedOrder({ description, outTradeNo, amount, notifyUrl, tradeType = 'NATIVE', extra = {} }) {
  if (!isConfigured()) return null

  const urlPath = '/v3/pay/transactions/unified'
  const body = JSON.stringify({
    appid: process.env.WECHAT_APPID || '',
    mchid: getConfig().mchId,
    description,
    out_trade_no: outTradeNo,
    time_expire: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15分钟过期
    attach: extra.attach || '',
    notify_url: notifyUrl,
    amount: {
      total: amount,
      currency: 'CNY',
    },
    ...(tradeType === 'JSAPI' && extra.openid ? { payer: { openid: extra.openid } } : {}),
  })

  const headers = buildAuthHeaders('POST', urlPath, body)
  if (!headers) return null

  const response = await fetch(`${WECHAT_PAY_V3_URL}${urlPath}`, {
    method: 'POST',
    headers,
    body,
  })

  const data = await response.json()

  if (!response.ok) {
    safeLog({ type: 'wechat_create_order_error', code: data.code, message: data.message }, '❌ 微信支付下单失败')
    throw new Error(`微信支付下单失败: ${data.code} ${data.message}`)
  }

  return data
}

/**
 * Native 支付：生成支付链接
 */
async function createNativePayOrder({ description, outTradeNo, amount, notifyUrl }) {
  const result = await createUnifiedOrder({
    description,
    outTradeNo,
    amount,
    notifyUrl,
    tradeType: 'NATIVE',
  })

  if (!result) return null

  return {
    tradeNo: outTradeNo,
    codeUrl: result.code_url,  // Native支付二维码链接
  }
}

/**
 * JSAPI 支付：获取发起支付所需参数
 */
async function createJsapiPayOrder({ description, outTradeNo, amount, notifyUrl, openid }) {
  const result = await createUnifiedOrder({
    description,
    outTradeNo,
    amount,
    notifyUrl,
    tradeType: 'JSAPI',
    extra: { openid },
  })

  if (!result) return null

  // 生成调起支付的签名参数
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonceStr = crypto.randomBytes(16).toString('hex')
  const packageStr = `prepay_id=${result.prepay_id}`

  const signMessage = `${process.env.WECHAT_APPID}\n${timestamp}\n${nonceStr}\n${packageStr}\n`
  const paySign = crypto.sign('RSA-SHA256', Buffer.from(signMessage), {
    key: getPrivateKey(),
    padding: crypto.constants.RSSI_PKCS1v15,
  }).toString('base64')

  return {
    tradeNo: outTradeNo,
    prepayId: result.prepay_id,
    timeStamp: timestamp,
    nonceStr,
    package: packageStr,
    signType: 'RSA',
    paySign,
  }
}

/**
 * 查询订单
 */
async function queryOrder(outTradeNo) {
  if (!isConfigured()) return null

  const urlPath = `/v3/pay/transactions/out-trade-no/${outTradeNo}`
  const queryUrl = `${urlPath}?mchid=${getConfig().mchId}`
  const headers = buildAuthHeaders('GET', queryUrl, '')

  if (!headers) return null

  const response = await fetch(`${WECHAT_PAY_V3_URL}${queryUrl}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) return null
  return await response.json()
}

/**
 * 验证微信支付回调签名
 */
function verifyCallbackSignature({ timestamp, nonce, body, signature }, cert) {
  const message = `${timestamp}\n${nonce}\n${body}\n`
  try {
    const verified = crypto.verify('RSA-SHA256', Buffer.from(message), cert, Buffer.from(signature, 'base64'))
    return verified
  } catch {
    return false
  }
}

/**
 * 解密回调通知（AES-256-GCM）
 */
function decryptCallback(encryptData, apiV3Key) {
  try {
    const buffer = Buffer.from(encryptData, 'base64')
    const iv = buffer.slice(0, 12)
    const authTag = buffer.slice(buffer.length - 16)
    const ciphertext = buffer.slice(12, buffer.length - 16)

    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(apiV3Key), iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return JSON.parse(decrypted.toString('utf8'))
  } catch (e) {
    safeLog({ error: e.message, type: 'wechat_decrypt_error' }, '❌ 微信支付回调解密失败')
    return null
  }
}

/**
 * 构建微信 JSAPI 调起参数（前端使用）
 */
function buildJsapiParams({ prepayId }) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonceStr = crypto.randomBytes(16).toString('hex')
  const packageStr = `prepay_id=${prepayId}`

  const signMessage = `${process.env.WECHAT_APPID}\n${timestamp}\n${nonceStr}\n${packageStr}\n`
  const paySign = crypto.sign('RSA-SHA256', Buffer.from(signMessage), {
    key: getPrivateKey(),
    padding: crypto.constants.RSSI_PKCS1v15,
  }).toString('base64')

  return {
    appId: process.env.WECHAT_APPID || '',
    timeStamp: timestamp,
    nonceStr,
    package: packageStr,
    signType: 'RSA',
    paySign,
  }
}

module.exports = {
  isConfigured,
  createNativePayOrder,
  createJsapiPayOrder,
  queryOrder,
  verifyCallbackSignature,
  decryptCallback,
  buildJsapiParams,
}
