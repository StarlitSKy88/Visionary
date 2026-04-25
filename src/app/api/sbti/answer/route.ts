import { NextRequest, NextResponse } from 'next/server'
import { getSession, updateSessionAnswer } from '@/lib/sbti-db'
import { questions } from '@/lib/questions'

// 模拟AI思考吐槽
const aiThoughts = [
  "哦？选择这个答案的人，八成是个狠角色",
  "有意思，大多数老板都会选这个，但你不一般",
  "这个选择嘛...我只能说懂得都懂",
  "哈哈哈，这个答案太真实了，我见多了",
  "不得不说，你这个选择很有老板味儿",
  "好家伙，这个回答让我对你的印象大为改观",
  "有意思，看来你是个有故事的人",
  "这个选择嘛...嗯，很符合我对老板的想象"
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, questionId, answer } = body

    if (!sessionId || questionId === undefined || !answer) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 从数据库获取session
    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session不存在' },
        { status: 404 }
      )
    }

    // 获取当前题目
    const question = questions.find(q => q.id === questionId)
    if (!question) {
      return NextResponse.json(
        { success: false, error: '题目不存在' },
        { status: 404 }
      )
    }

    // 找到选择的选项
    const selectedOption = question.options.find(o => o.key === answer)
    if (!selectedOption) {
      return NextResponse.json(
        { success: false, error: '无效的选项' },
        { status: 400 }
      )
    }

    // 更新维度得分
    const dimensionScores = { ...session.dimensionScores }
    for (const [dim, score] of Object.entries(selectedOption.scores)) {
      dimensionScores[parseInt(dim)] = (dimensionScores[parseInt(dim)] || 0) + score
    }

    // 保存到数据库
    await updateSessionAnswer(sessionId, questionId, answer, dimensionScores)

    // 获取下一题
    const nextQuestionIndex = questionId + 1
    const nextQuestion = questions.find(q => q.id === nextQuestionIndex)

    // 随机生成AI思考
    const aiThinking = aiThoughts[Math.floor(Math.random() * aiThoughts.length)]

    return NextResponse.json({
      success: true,
      dimensionScores,
      aiThinking,
      nextQuestion: nextQuestion ? {
        id: nextQuestion.id,
        question: nextQuestion.question,
        options: nextQuestion.options.map(o => ({ key: o.key, text: o.text }))
      } : null,
      currentQuestion: nextQuestion ? nextQuestion.id : null,
      completed: !nextQuestion
    })
  } catch (error) {
    console.error('CEO-TI Answer Error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'CEO-TI Answer API' })
}
