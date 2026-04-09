/**
 * AI服务测试脚本
 */

const AIService = require('./server/lib/ai-service')

async function testAIService() {
  console.log('🧪 测试OpenRouter AI服务...\n')

  try {
    // 测试1: 简单对话
    console.log('测试1: 简单对话')
    const response1 = await AIService.chat([
      { role: 'user', content: '你好，请介绍一下你自己' }
    ])
    console.log('响应:', response1.substring(0, 200))
    console.log('✅ 测试1 通过\n')

    // 测试2: 需求理解
    console.log('测试2: 需求理解')
    const result2 = await AIService.understandDemand(
      '我超市早7-9买菜人多、傍晚下班高峰挤，年轻人不愿上夜班，生鲜3天不卖就烂'
    )
    console.log('行业:', result2.industry)
    console.log('痛点:', result2.painPoints.slice(0, 3))
    console.log('✅ 测试2 通过\n')

    console.log('🎉 所有测试通过！AI服务正常工作')
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

testAIService()
