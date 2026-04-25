import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// 微信支付回调处理
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    // 解析XML回调数据
    const parseXML = (xml: string): Record<string, string> => {
      const result: Record<string, string> = {}
      const regex = /<(\w+)><!\[CDATA\[([^\]]*)\]\]><\/\1>|<(\w+)>([^<]+)<\/\3/g
      let match
      while ((match = regex.exec(xml)) !== null) {
        result[match[1] || match[3]] = match[2] || match[4]
      }
      return result
    }

    const data = parseXML(body)

    // 验证签名
    const { return_code, return_msg, transaction_id, out_trade_no, result_code } = data

    if (return_code !== 'SUCCESS') {
      const xmlResponse = `<xml><return_code>FAIL</return_code><return_msg><![CDATA[${return_msg || '签名验证失败'}]]></return_msg></xml>`
      return new NextResponse(xmlResponse, {
        headers: { 'Content-Type': 'application/xml' }
      })
    }

    // 实际实现需要验证签名
    // const signType = data.sign_type || 'HMAC-SHA256'
    // const calculatedSign = ...

    // 处理支付结果
    if (result_code === 'SUCCESS') {
      // 支付成功
      // 1. 更新订单状态
      // 2. 解锁报告
      // 3. 记录支付信息

      console.log('Payment success:', {
        transaction_id,
        out_trade_no
      })

      // 这里可以调用数据库更新订单状态
      // await updateOrderStatus(out_trade_no, 'PAID')
      // await unlockReport(out_trade_no)
    }

    // 返回成功响应
    const xmlResponse = `<xml><return_code>SUCCESS</return_code><return_msg><![CDATA[OK]]></return_msg></xml>`
    return new NextResponse(xmlResponse, {
      headers: { 'Content-Type': 'application/xml' }
    })
  } catch (error) {
    console.error('CEO-TI Payment Callback Error:', error)
    const xmlResponse = `<xml><return_code>FAIL</return_code><return_msg><![CDATA[处理失败]]></return_msg></xml>`
    return new NextResponse(xmlResponse, {
      headers: { 'Content-Type': 'application/xml' }
    })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'CEO-TI Payment Callback API' })
}