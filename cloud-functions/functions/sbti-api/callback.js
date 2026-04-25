/**
 * SBTI 微信支付回调 - 云函数版本
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.env.IDENTIFIER })

const db = cloud.database()

exports.handler = async (event, context) => {
  // 处理微信支付回调（XML格式）
  const headers = {
    'Content-Type': 'application/xml'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>' }
  }

  try {
    const body = event.body || ''

    // 解析XML
    const parseXML = (xml) => {
      const result = {}
      const regex = /<(\w+)><!\[CDATA\[([^\]]*)\]\]><\/\1>|<(\w+)>([^<]+)<\/\3/g
      let match
      while ((match = regex.exec(xml)) !== null) {
        result[match[1] || match[3]] = match[2] || match[4]
      }
      return result
    }

    const data = parseXML(body)
    const { return_code, return_msg, transaction_id, out_trade_no, result_code } = data

    if (return_code !== 'SUCCESS') {
      return {
        statusCode: 200,
        headers,
        body: '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名验证失败]]></return_msg></xml>'
      }
    }

    if (result_code === 'SUCCESS') {
      // 支付成功，更新订单状态
      const payments = await db.collection('sbti_payments').where({ outTradeNo: out_trade_no }).get()

      if (payments.data && payments.data.length > 0) {
        await db.collection('sbti_payments').doc(payments.data[0]._id).update({
          data: {
            status: 'paid',
            transactionId: transaction_id,
            paidAt: new Date()
          }
        })

        // 解锁报告
        const sessionId = payments.data[0].sessionId
        await db.collection('sbti_sessions').where({ sessionId }).update({
          data: {
            reportUnlocked: true,
            unlockedAt: new Date()
          }
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
    }
  } catch (error) {
    console.error('Payment Callback Error:', error)
    return {
      statusCode: 200,
      headers,
      body: '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[处理失败]]></return_msg></xml>'
    }
  }
}