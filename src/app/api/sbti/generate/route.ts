import { NextRequest, NextResponse } from 'next/server'

// 模拟报告生成状态存储（生产环境应使用数据库）
const generationStatus: Record<string, {
  status: 'pending' | 'generating' | 'completed' | 'failed'
  progress: number
  reportId?: string
  error?: string
  startedAt?: string
  completedAt?: string
}> = {}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '缺少sessionId' },
        { status: 400 }
      )
    }

    // 检查是否已有生成中的任务
    const existingStatus = generationStatus[sessionId]
    if (existingStatus && existingStatus.status === 'generating') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'generating',
          progress: existingStatus.progress,
          message: '报告生成中，请稍候'
        }
      })
    }

    // 创建新的生成任务
    const reportId = `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    generationStatus[sessionId] = {
      status: 'generating',
      progress: 0,
      startedAt: new Date().toISOString()
    }

    // 模拟异步报告生成流程
    // 实际实现中，这里应该触发真实的AI报告生成
    simulateReportGeneration(sessionId, reportId)

    return NextResponse.json({
      success: true,
      data: {
        status: 'pending',
        progress: 0,
        reportId,
        message: '报告生成任务已创建'
      }
    })
  } catch (error) {
    console.error('CEO-TI Generate Error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: '缺少sessionId' },
      { status: 400 }
    )
  }

  const status = generationStatus[sessionId]
  if (!status) {
    return NextResponse.json({
      success: true,
      data: {
        status: 'not_found',
        progress: 0,
        message: '未找到生成任务'
      }
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      status: status.status,
      progress: status.progress,
      reportId: status.reportId,
      error: status.error,
      startedAt: status.startedAt,
      completedAt: status.completedAt
    }
  })
}

// 模拟报告生成过程
async function simulateReportGeneration(sessionId: string, reportId: string) {
  const steps = [
    { progress: 10, delay: 500, message: '分析答题数据...' },
    { progress: 30, delay: 800, message: '计算人格维度得分...' },
    { progress: 50, delay: 600, message: '匹配精怪人格类型...' },
    { progress: 70, delay: 700, message: '生成市场分析...' },
    { progress: 85, delay: 500, message: '生成策略建议...' },
    { progress: 95, delay: 400, message: '生成执行方案...' },
    { progress: 100, delay: 300, message: '报告生成完成' }
  ]

  for (const step of steps) {
    await new Promise(resolve => setTimeout(resolve, step.delay))
    generationStatus[sessionId].progress = step.progress

    if (step.progress === 100) {
      generationStatus[sessionId].status = 'completed'
      generationStatus[sessionId].reportId = reportId
      generationStatus[sessionId].completedAt = new Date().toISOString()
    }
  }
}