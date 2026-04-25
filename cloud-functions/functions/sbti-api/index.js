/**
 * 腾讯云云函数入口
 * 主入口文件 index.ts
 */

const start = require('./sbti/start')
const answer = require('./sbti/answer')
const complete = require('./sbti/complete')
const payment = require('./sbti/payment')
const callback = require('./sbti/callback')
const shareStatus = require('./share-status')

exports.main = async (event, context) => {
  const { httpMethod, path, queryStringParameters, body } = event

  // 路由分发
  const pathParts = path.split('/').filter(Boolean)
  const module = pathParts[0] || ''
  const action = pathParts[1] || ''

  try {
    // SBTI 模块路由
    if (module === 'sbti') {
      switch (action) {
        case 'start':
          return await start.handler(event, context)
        case 'answer':
          return await answer.handler(event, context)
        case 'complete':
          return await complete.handler(event, context)
        case 'payment':
          return await payment.handler(event, context)
        case 'callback':
          return await callback.handler(event, context)
        default:
          return { statusCode: 404, body: JSON.stringify({ error: 'Not Found' }) }
      }
    }

    // 分享状态路由
    if (module === 'share-status') {
      return await shareStatus.handler(event, context)
    }

    return { statusCode: 404, body: JSON.stringify({ error: 'Not Found' }) }
  } catch (error) {
    console.error('Cloud Function Error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) }
  }
}