import { NextRequest, NextResponse } from 'next/server'

// 模拟支付创建
// 实际需要微信支付API配置
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

    // 模拟支付订单创建
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 实际实现需要:
    // 1. 调用微信支付统一下单API
    // 2. 获取prepay_id
    // 3. 生成支付二维码

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        qrCodeUrl: `weixin://wxpay/bizpayurl?pr=${orderId}`,
        // 测试模式下返回base64占位图
        qrCodeImage: '', // 等用户提供微信支付二维码后填充
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
  return NextResponse.json({ message: 'CEO-TI Payment API - 需要微信支付配置' })
}
