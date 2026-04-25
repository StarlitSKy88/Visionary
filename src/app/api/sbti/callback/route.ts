import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { isConfigured, decryptCallback } from '@/server/lib/wechat-mini'
import { getSession, updateSessionPaid } from '@/lib/sbti-db'

// 微信支付回调处理 - V3 版本
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    // 解析 JSON 回调数据
    let data: Record<string, string>
    try {
      data = JSON.parse(body)
    } catch {
      // 如果不是 JSON，可能是加密数据
      if (isConfigured()) {
        const apiV3Key = process.env.WECHAT_API_V3_KEY || ''
        const decrypted = decryptCallback(body, apiV3Key)
        if (decrypted) {
          data = decrypted
        } else {
          return xmlResponse('FAIL', '解密失败')
        }
      } else {
        return xmlResponse('FAIL', '未配置微信支付')
      }
    }

    // 验证签名（如果有证书）
    const signature = request.headers.get('Wechatpay-Signature')
    const timestamp = request.headers.get('Wechatpay-Timestamp')
    const nonce = request.headers.get('Wechatpay-Nonce')

    if (signature && timestamp && nonce) {
      // 验证回调签名
      const message = `${timestamp}\n${nonce}\n${body}\n`
      // 注意：实际生产环境需要用平台证书验证签名
      // 这里简化处理，生产环境请使用平台证书验证
    }

    // 获取回调信息
    const { transaction_id, out_trade_no, trade_state, amount, attach } = data

    // 处理支付结果
    if (trade_state === 'SUCCESS') {
      // 支付成功
      console.log('Payment success:', {
        transaction_id,
        out_trade_no,
        amount: amount?.total,
      })

      // 从 attach 中提取 sessionId
      let sessionId: string | undefined
      if (attach) {
        try {
          const attachData = JSON.parse(attach)
          sessionId = attachData.sessionId
        } catch {
          // attach 可能不包含 sessionId
        }
      }

      // 如果没有 sessionId，尝试从订单号解析
      if (!sessionId && out_trade_no?.startsWith('SBTI')) {
        // 订单号格式：SBTI + 时间戳
        // 需要存储映射关系才能解析
      }

      // 更新 session 为已支付状态
      if (sessionId) {
        await updateSessionPaid(sessionId, out_trade_no, transaction_id)
      }

      // 返回成功响应
      return xmlResponse('SUCCESS', 'OK')
    } else if (trade_state === 'PAYERROR' || trade_state === 'CLOSED') {
      // 支付失败或订单关闭
      console.log('Payment failed:', { out_trade_no, trade_state })
      return xmlResponse('SUCCESS', 'OK') // 也要返回成功告知微信不要再通知
    } else {
      // 其他状态暂不处理
      return xmlResponse('SUCCESS', 'OK')
    }

  } catch (error) {
    console.error('CEO-TI Payment Callback Error:', error)
    return xmlResponse('FAIL', '处理失败')
  }
}

// 构造 XML 响应
function xmlResponse(code: 'SUCCESS' | 'FAIL', message: string) {
  const xml = `<xml><return_code>${code}</return_code><return_msg><![CDATA[${message}]]></return_msg></xml>`
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml' }
  })
}

// GET 方法用于接收微信服务器的签名验证
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const echostr = url.searchParams.get('echostr')

  // 微信服务器会发送 GET 请求进行验证
  // 使用 URL 作为签名验证
  const signature = url.searchParams.get('signature')
  const timestamp = url.searchParams.get('timestamp')
  const nonce = url.searchParams.get('nonce')

  if (signature && timestamp && nonce) {
    // 验证签名
    const token = process.env.WECHAT_TOKEN || ''
    const arr = [token, timestamp, nonce].sort()
    const str = arr.join('')
    const hash = crypto.createHash('sha1').update(str).digest('hex')

    if (hash === signature) {
      return new NextResponse(echostr || 'ok', { status: 200 })
    }
  }

  return new NextResponse('signature verification failed', { status: 403 })
}