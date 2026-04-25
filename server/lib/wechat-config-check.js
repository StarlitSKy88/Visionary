/**
 * 微信支付环境变量检查工具
 *
 * 使用方法：在 .env.local 中配置以下变量
 *
 * 必要配置（WECHAT_MCHID, WECHAT_API_V3_KEY, WECHAT_SERIAL_NO, WECHAT_PRIVATE_KEY_PATH）：
 *   WECHAT_MCHID=1234567890          # 商户号
 *   WECHAT_API_V3_KEY=xxxxxxxxxxxx   # APIv3密钥（32字符）
 *   WECHAT_SERIAL_NO=XXXXXXXXXX      # 证书序列号
 *   WECHAT_PRIVATE_KEY_PATH=./certs/apiclient_key.pem  # 私钥文件路径
 *
 * 可选配置：
 *   WECHAT_APPID=wx1234567890        # 小程序AppID（用于JSAPI支付）
 *   WECHAT_CERT_PATH=./certs/apiclient_cert.pem  # 平台证书路径（用于回调验证）
 *   WECHAT_TOKEN=your_token          # 回调Token（微信后台配置）
 */

const fs = require('fs')
const path = require('path')

interface WechatConfig {
  mchId?: string
  appId?: string
  serialNo?: string
  apiV3Key?: string
  privateKeyPath?: string
  certPath?: string
  token?: string
}

interface ConfigCheckResult {
  configured: boolean
  missing: string[]
  warnings: string[]
  valid: boolean
}

function checkPrivateKey(privateKeyPath: string): { valid: boolean; error?: string } {
  try {
    const fullPath = path.resolve(privateKeyPath)
    if (!fs.existsSync(fullPath)) {
      return { valid: false, error: '私钥文件不存在' }
    }

    const content = fs.readFileSync(fullPath, 'utf8')
    if (!content.includes('-----BEGIN RSA PRIVATE KEY-----')) {
      return { valid: false, error: '私钥格式不正确，应该包含 RSA 私钥 PEM 格式' }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: `读取私钥文件失败: ${error}` }
  }
}

function checkApiV3Key(apiV3Key: string): { valid: boolean; error?: string } {
  if (apiV3Key.length !== 32) {
    return { valid: false, error: 'APIv3密钥必须是32字符' }
  }
  return { valid: true }
}

export function checkWechatConfig(): ConfigCheckResult {
  const result: ConfigCheckResult = {
    configured: false,
    missing: [],
    warnings: [],
    valid: false
  }

  // 检查必要配置
  const required = [
    { key: 'WECHAT_MCHID', name: '商户号' },
    { key: 'WECHAT_API_V3_KEY', name: 'APIv3密钥' },
    { key: 'WECHAT_SERIAL_NO', name: '证书序列号' },
    { key: 'WECHAT_PRIVATE_KEY_PATH', name: '私钥文件路径' },
  ]

  const config: WechatConfig = {
    mchId: process.env.WECHAT_MCHID,
    appId: process.env.WECHAT_APPID,
    serialNo: process.env.WECHAT_SERIAL_NO,
    apiV3Key: process.env.WECHAT_API_V3_KEY,
    privateKeyPath: process.env.WECHAT_PRIVATE_KEY_PATH,
    certPath: process.env.WECHAT_CERT_PATH,
    token: process.env.WECHAT_TOKEN,
  }

  for (const item of required) {
    if (!config[item.key as keyof WechatConfig]) {
      result.missing.push(item.name)
    }
  }

  // 如果缺少必要配置
  if (result.missing.length > 0) {
    return result
  }

  // 验证 API v3 Key
  const v3KeyCheck = checkApiV3Key(config.apiV3Key!)
  if (!v3KeyCheck.valid) {
    result.warnings.push(`APIv3密钥: ${v3KeyCheck.error}`)
  }

  // 验证私钥文件
  const keyCheck = checkPrivateKey(config.privateKeyPath!)
  if (!keyCheck.valid) {
    result.warnings.push(`私钥文件: ${keyCheck.error}`)
  }

  // 检查可选配置
  if (!config.appId) {
    result.warnings.push('未配置 WECHAT_APPID，JSAPI支付将不可用')
  }
  if (!config.certPath) {
    result.warnings.push('未配置平台证书，支付回调签名验证将跳过')
  }
  if (!config.token) {
    result.warnings.push('未配置 WECHAT_TOKEN，回调URL验证将不可用')
  }

  // 验证通过
  result.configured = true
  result.valid = result.warnings.length === 0

  return result
}

// 快速检查函数
export function isWechatPayReady(): boolean {
  return !!(
    process.env.WECHAT_MCHID &&
    process.env.WECHAT_API_V3_KEY &&
    process.env.WECHAT_SERIAL_NO &&
    process.env.WECHAT_PRIVATE_KEY_PATH
  )
}

// 打印配置状态
export function printWechatConfigStatus(): void {
  const result = checkWechatConfig()

  console.log('\n========== 微信支付配置检查 ==========\n')

  if (!result.configured) {
    console.log('❌ 微信支付未配置完整')
    console.log(`\n缺失配置：`)
    result.missing.forEach(item => console.log(`  - ${item}`))
    console.log('\n请在 .env.local 中配置以下环境变量：')
    console.log(`
WECHAT_MCHID=你的商户号
WECHAT_API_V3_KEY=32位APIv3密钥
WECHAT_SERIAL_NO=证书序列号
WECHAT_PRIVATE_KEY_PATH=./certs/apiclient_key.pem
    `)
  } else {
    console.log('✅ 微信支付基础配置完成')
    console.log(`  商户号: ${process.env.WECHAT_MCHID}`)
    console.log(`  序列号: ${process.env.WECHAT_SERIAL_NO}`)

    if (result.warnings.length > 0) {
      console.log('\n⚠️  配置警告：')
      result.warnings.forEach(w => console.log(`  - ${w}`))
    }

    if (result.valid) {
      console.log('\n✅ 微信支付完全可用')
    } else {
      console.log('\n⚠️  微信支付部分可用，但存在警告')
    }
  }

  console.log('\n========================================\n')
}

// 运行检查
if (require.main === module) {
  printWechatConfigStatus()
}

module.exports = {
  checkWechatConfig,
  isWechatPayReady,
  printWechatConfigStatus,
}