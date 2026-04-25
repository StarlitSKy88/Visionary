/**
 * 分享状态查询 - 云函数版本
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.env.IDENTIFIER })

const db = cloud.database()

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const shareCode = event.pathParameters?.shareCode || ''

    if (!shareCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '缺少分享码' })
      }
    }

    // 查询分享状态
    const shares = await db.collection('sbti_shares').where({ shareCode }).get()

    if (shares.data && shares.data.length > 0) {
      const shareData = shares.data[0]
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          shareCode,
          opens: shareData.opens || 0,
          unlocked: shareData.unlocked || false,
          remaining: Math.max(0, 10 - (shareData.opens || 0)),
          totalUnlocks: shareData.totalUnlocks || 0
        })
      }
    }

    // 默认返回未解锁状态
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        shareCode,
        opens: 0,
        unlocked: false,
        remaining: 10,
        totalUnlocks: 0
      })
    }
  } catch (error) {
    console.error('Share Status Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: '服务器错误' })
    }
  }
}