import { NextRequest, NextResponse } from 'next/server'
import { createNativePayOrder, isConfigured } from '@/server/lib/wechat-mini'

// 微信支付真实对接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, price = 99 } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '缺少sessionId' },
        { status: 400 }
      )
    }

    // 生成商户订单号
    const outTradeNo = `SBTI${Date.now().toString(36).toUpperCase()}`

    // 检查是否配置了微信支付
    if (isConfigured()) {
      // 真实调用微信支付 API
      const notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ceo-ti.com'}/api/sbti/callback`

      const result = await createNativePayOrder({
        description: 'CEO-TI 山海经老板测试完整报告',
        outTradeNo,
        amount: price * 100, // 微信支付以分为单位
        notifyUrl,
      })

      if (result) {
        return NextResponse.json({
          success: true,
          data: {
            orderId: outTradeNo,
            qrCodeUrl: result.codeUrl,
            tradeNo: result.tradeNo,
            expireTime: Date.now() + 15 * 60 * 1000 // 15分钟后过期
          }
        })
      }
    }

    // 如果未配置微信支付，使用模拟模式
    const orderId = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        qrCodeUrl: `weixin://wxpay/bizpayurl?pr=${orderId}`,
        qrCodeImage: '', // 需要用户提供微信支付二维码后填充
        tradeNo: outTradeNo,
        expireTime: Date.now() + 30 * 60 * 1000 // 30分钟后过期
      }
    })
  } catch (error) {
    console.error('CEO-TI Payment Error:', error)
    return NextResponse.json(
      { success: false, error: '支付创建失败' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const configured = isConfigured()
  return NextResponse.json({
    message: 'CEO-TI Payment API',
    status: configured ? '微信支付已配置' : '微信支付未配置（模拟模式）',
    configured
  })
}
