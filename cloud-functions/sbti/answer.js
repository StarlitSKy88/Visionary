/**
 * SBTI 答题 - 云函数版本
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.env.IDENTIFIER })

const db = cloud.database()

const questions = [
  { id: 1, dimension: 1, question: "开会时老板突然问你意见，你的第一反应是？", options: [{ key: "A", text: "立刻发言，说出我的想法", scores: { 1: 10, 3: 8 } }, { key: "B", text: "先听别人说，再考虑要不要开口", scores: { 1: 5, 2: 7 } }, { key: "C", text: "低头假装看手机", scores: { 1: 2, 6: 8 } }, { key: "D", text: "等老板点名才说", scores: { 1: 3, 7: 6 } }] },
  { id: 2, dimension: 2, question: "员工犯了个大错，你的反应是？", options: [{ key: "A", text: "当场发火，骂到他哭", scores: { 4: 3, 2: 2 } }, { key: "B", text: "背后吐槽，但不当面说", scores: { 4: 5, 2: 4 } }, { key: "C", text: "沉默，思考怎么处理", scores: { 4: 7, 2: 8 } }, { key: "D", text: "一起扛，先解决问题", scores: { 4: 10, 2: 9 } }] },
  { id: 3, dimension: 3, question: "听说有个高风险高回报的项目，你会？", options: [{ key: "A", text: "直接投，富贵险中求", scores: { 3: 10, 15: 9 } }, { key: "B", text: "研究三天三夜再决定", scores: { 3: 6, 16: 7 } }, { key: "C", text: "不投稳稳当当最好", scores: { 3: 2, 16: 10 } }, { key: "D", text: "问卦后再决定", scores: { 3: 5, 25: 10 } }] },
  { id: 4, dimension: 4, question: "下班后老板突然发消息，你会？", options: [{ key: "A", text: "秒回，这叫敬业", scores: { 4: 8, 6: 6 } }, { key: "B", text: "已读不回，明天再说", scores: { 4: 5, 21: 9 } }, { key: "C", text: "偶尔关心一下", scores: { 4: 7, 23: 8 } }, { key: "D", text: "随时在线，根本没有下班概念", scores: { 4: 10, 6: 10 } }] },
  { id: 5, dimension: 5, question: "听到员工说'报销'两个字，你的表情是？", options: [{ key: "A", text: "秒批，钱不是问题", scores: { 5: 10, 3: 7 } }, { key: "B", text: "眉头一皱，开始审审审", scores: { 5: 3, 10: 8 } }, { key: "C", text: "开始哭穷，说公司难", scores: { 5: 2, 10: 5 } }, { key: "D", text: "当没看见，不回复", scores: { 5: 4, 24: 7 } }] },
  { id: 6, dimension: 6, question: "你的加班时间是？", options: [{ key: "A", text: "随叫随到，24小时待命", scores: { 6: 10, 7: 6 } }, { key: "B", text: "限定时间，到点就跑", scores: { 6: 3, 21: 8 } }, { key: "C", text: "看心情，心情好就加班", scores: { 6: 5, 25: 10 } }, { key: "D", text: "正常上班，从不加班", scores: { 6: 2, 2: 4 } }] },
  { id: 7, dimension: 7, question: "应酬场合你一般是？", options: [{ key: "A", text: "主动敬酒，控场大师", scores: { 7: 10, 11: 9 } }, { key: "B", text: "能躲就躲，角落待着", scores: { 7: 2, 12: 8 } }, { key: "C", text: "假装上厕所，溜了溜了", scores: { 7: 3, 12: 6 } }, { key: "D", text: "身体不适，提前离场", scores: { 7: 4, 24: 10 } }] },
  { id: 8, dimension: 1, question: "做一个重大决策需要多久？", options: [{ key: "A", text: "三秒钟，不能再多了", scores: { 1: 10, 19: 9 } }, { key: "B", text: "三天，要深思熟虑", scores: { 1: 5, 16: 8 } }, { key: "C", text: "三个月，拖拖再说", scores: { 1: 2, 21: 7 } }, { key: "D", text: "看心情", scores: { 1: 3, 25: 10 } }] },
  { id: 9, dimension: 2, question: "员工跟你汇报工作，你通常？", options: [{ key: "A", text: "直接打断，说重点", scores: { 2: 10, 22: 8 } }, { key: "B", text: "微笑点头，鼓励说完", scores: { 2: 5, 23: 10 } }, { key: "C", text: "沉默，让气氛尴尬", scores: { 2: 2, 24: 9 } }, { key: "D", text: "边看手机边听", scores: { 2: 4, 12: 6 } }] },
  { id: 10, dimension: 3, question: "公司账上有一笔闲钱，你会？", options: [{ key: "A", text: "投资新项目，扩张！", scores: { 3: 10, 15: 8 } }, { key: "B", text: "存银行，稳健第一", scores: { 3: 4, 16: 10 } }, { key: "C", text: "给员工发奖金", scores: { 3: 6, 14: 7 } }, { key: "D", text: "先观望，不动", scores: { 3: 2, 16: 6 } }] },
  { id: 11, dimension: 4, question: "你会如何形容自己的管理风格？", options: [{ key: "A", text: "军事化，纪律第一", scores: { 4: 10, 22: 8 } }, { key: "B", text: "放权型，给员工自由", scores: { 4: 5, 23: 9 } }, { key: "C", text: "朋友式，一起吃喝玩乐", scores: { 4: 6, 14: 8 } }, { key: "D", text: "甩手掌柜，我只看结果", scores: { 4: 3, 12: 7 } }] },
  { id: 12, dimension: 5, question: "年底奖金，你更愿意？", options: [{ key: "A", text: "发现金，大大方方", scores: { 5: 10, 14: 7 } }, { key: "B", text: "发现金刺激，但肉疼", scores: { 5: 4, 10: 8 } }, { key: "C", text: "请吃饭，氛围更重要", scores: { 5: 6, 11: 9 } }, { key: "D", text: "无所谓，发多少都行", scores: { 5: 3, 21: 10 } }] },
  { id: 13, dimension: 6, question: "你工作效率最高的时间是？", options: [{ key: "A", text: "清晨，脑子最清醒", scores: { 6: 3, 9: 10 } }, { key: "B", text: "深夜，没人打扰", scores: { 6: 8, 8: 10 } }, { key: "C", text: "随时，没有固定时间", scores: { 6: 5, 25: 8 } }, { key: "D", text: "没有效率，从不高", scores: { 6: 2, 2: 5 } }] },
  { id: 14, dimension: 7, question: "参加行业峰会，你通常？", options: [{ key: "A", text: "积极发言，建立人脉", scores: { 7: 10, 11: 9 } }, { key: "B", text: "默默听课，记笔记", scores: { 7: 4, 17: 8 } }, { key: "C", text: "到处加微信，换名片", scores: { 7: 8, 11: 7 } }, { key: "D", text: "找个角落睡觉", scores: { 7: 1, 2: 6 } }] },
  { id: 15, dimension: 1, question: "员工提出一个疯狂的想法，你会？", options: [{ key: "A", text: "立刻拍板，干！", scores: { 1: 10, 18: 8 } }, { key: "B", text: "可行性分析再决定", scores: { 1: 5, 17: 9 } }, { key: "C", text: "先否决，太冒险", scores: { 1: 2, 16: 8 } }, { key: "D", text: "看老板心情决定", scores: { 1: 3, 25: 7 } }] },
  { id: 16, dimension: 2, question: "员工离职面谈，你通常？", options: [{ key: "A", text: "画饼挽留，说前景", scores: { 2: 7, 3: 6 } }, { key: "B", text: "了解原因，友好告别", scores: { 2: 8, 14: 9 } }, { key: "C", text: "直接批准，不废话", scores: { 2: 3, 24: 8 } }, { key: "D", text: "惊讶，没想到他会走", scores: { 2: 5, 12: 5 } }] },
  { id: 17, dimension: 3, question: "有个客户要求垫资，你会？", options: [{ key: "A", text: "垫！大不了就是赔", scores: { 3: 10, 15: 7 } }, { key: "B", text: "详细评估风险再定", scores: { 3: 5, 16: 9 } }, { key: "C", text: "不垫，谁知道能不能回", scores: { 3: 2, 10: 8 } }, { key: "D", text: "先问卦", scores: { 3: 3, 25: 10 } }] },
  { id: 18, dimension: 4, question: "你会亲自面试候选人吗？", options: [{ key: "A", text: "每一轮都亲自面", scores: { 4: 10, 20: 7 } }, { key: "B", text: "只面最后一轮", scores: { 4: 6, 18: 6 } }, { key: "C", text: "HR全权负责", scores: { 4: 3, 12: 8 } }, { key: "D", text: "看岗位重要程度", scores: { 4: 5, 17: 7 } }] },
  { id: 19, dimension: 5, question: "听到'涨薪'两个字，你的反应是？", options: [{ key: "A", text: "主动提出，人才要舍得", scores: { 5: 10, 14: 8 } }, { key: "B", text: "哭穷，年度调薪再说", scores: { 5: 3, 10: 9 } }, { key: "C", text: "看预算和绩效", scores: { 5: 6, 17: 8 } }, { key: "D", text: "假装没听到", scores: { 5: 2, 24: 7 } }] },
  { id: 20, dimension: 6, question: "周末突然有工作安排，你会？", options: [{ key: "A", text: "没问题，随时到岗", scores: { 6: 10, 7: 7 } }, { key: "B", text: "可以，但要调休", scores: { 6: 5, 21: 8 } }, { key: "C", text: "不行，周末不工作", scores: { 6: 2, 2: 7 } }, { key: "D", text: "看给多少加班费", scores: { 6: 6, 5: 8 } }] },
  { id: 21, dimension: 7, question: "公司团建，你通常？", options: [{ key: "A", text: "最嗨的那个，控场", scores: { 7: 10, 11: 10 } }, { key: "B", text: "安静旁观，默默参与", scores: { 7: 3, 12: 8 } }, { key: "C", text: "找个借口不去", scores: { 7: 2, 24: 7 } }, { key: "D", text: "去了也是玩手机", scores: { 7: 4, 2: 6 } }] },
  { id: 22, dimension: 1, question: "公司遇到危机，你的反应是？", options: [{ key: "A", text: "立刻决策，不能乱", scores: { 1: 10, 22: 9 } }, { key: "B", text: "召开会议，集思广益", scores: { 1: 6, 17: 8 } }, { key: "C", text: "等待，看看情况再说", scores: { 1: 2, 21: 7 } }, { key: "D", text: "焦虑，但不知道怎么办", scores: { 1: 3, 5: 5 } }] },
  { id: 23, dimension: 2, question: "员工私下吐槽公司，你会？", options: [{ key: "A", text: "装作没听到", scores: { 2: 5, 24: 8 } }, { key: "B", text: "主动找他聊，了解情况", scores: { 2: 8, 23: 9 } }, { key: "C", text: "秋后算账", scores: { 2: 2, 22: 6 } }, { key: "D", text: "和他一起吐槽", scores: { 2: 6, 4: 5 } }] },
  { id: 24, dimension: 3, question: "有人推荐一个'稳赚'项目，你会？", options: [{ key: "A", text: "直接投，不犹豫", scores: { 3: 10, 15: 6 } }, { key: "B", text: "尽职调查全套来一遍", scores: { 3: 5, 16: 10 } }, { key: "C", text: "不投，没有稳赚的事", scores: { 3: 2, 16: 8 } }, { key: "D", text: "先看有没有坑", scores: { 3: 4, 20: 7 } }] }
]

const aiThoughts = [
  "哦？选择这个答案的人，八成是个狠角色",
  "有意思，大多数老板都会选这个，但你不一般",
  "这个选择嘛...我只能说懂得都懂",
  "哈哈哈，这个答案太真实了，我见多了",
  "不得不说，你这个选择很有老板味儿"
]

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    const { sessionId, questionId, answer } = body

    if (!sessionId || questionId === undefined || !answer) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '缺少必要参数' })
      }
    }

    // 获取题目
    const question = questions.find(q => q.id === questionId)
    if (!question) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '题目不存在' })
      }
    }

    // 找到选项
    const selectedOption = question.options.find(o => o.key === answer)
    if (!selectedOption) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '无效的选项' })
      }
    }

    // 更新数据库中的 session
    const session = await db.collection('sbti_sessions').where({ sessionId }).get()
    if (!session.data || session.data.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Session不存在' })
      }
    }

    const currentSession = session.data[0]
    const answers = currentSession.answers || []
    const dimensionScores = currentSession.dimensionScores || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }

    // 记录答案
    answers.push({ questionId, answer })

    // 更新维度得分
    for (const [dim, score] of Object.entries(selectedOption.scores)) {
      dimensionScores[parseInt(dim)] = (dimensionScores[parseInt(dim)] || 0) + score
    }

    // 更新数据库
    await db.collection('sbti_sessions').doc(sessionId).update({
      data: {
        answers,
        dimensionScores,
        currentQuestionIndex: questionId + 1
      }
    })

    // 获取下一题
    const nextQuestionId = questionId + 1
    const nextQuestion = questions.find(q => q.id === nextQuestionId)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        dimensionScores,
        aiThinking: aiThoughts[Math.floor(Math.random() * aiThoughts.length)],
        nextQuestion: nextQuestion ? {
          id: nextQuestion.id,
          question: nextQuestion.question,
          options: nextQuestion.options.map(o => ({ key: o.key, text: o.text }))
        } : null,
        currentQuestion: nextQuestion ? nextQuestion.id : null,
        completed: !nextQuestion
      })
    }
  } catch (error) {
    console.error('CEO-TI Answer Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: '服务器错误' })
    }
  }
}