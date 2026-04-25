import { NextRequest, NextResponse } from 'next/server'
import { createSession, getDb, initSchema, saveDb } from '@/lib/sbti-db'
import { questions } from '@/lib/questions'

// Session 已迁移到 sql.js 数据库持久化

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lang = 'zh', deviceId } = body

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: '缺少设备ID' },
        { status: 400 }
      )
    }

    // 创建新session（使用 sql.js 持久化）
    const session = await createSession(deviceId, lang)

    const firstQuestion = questions[0]

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      shareCode: session.shareCode,
      shareUrl: session.shareUrl,
      currentQuestion: firstQuestion.id,
      question: firstQuestion
    })
  } catch (error) {
    console.error('SBTI Start Error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'CEO-TI Start API' })
}
