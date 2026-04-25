import { NextRequest, NextResponse } from 'next/server'

// 模拟报告数据存储（生产环境应使用数据库）
const reportCache: Record<string, any> = {}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // 查找对应的报告数据
    let reportData = reportCache[id]

    // 如果没有，生成模拟数据
    if (!reportData) {
      // 模拟已完成报告
      reportData = {
        sessionId: parseInt(id) || Date.now(),
        personalityId: 'DRAGON',
        sbtiScores: {
          d1: 4,
          d2: 3,
          d3: 5,
          d4: 4,
          d5: 3
        },
        completedAt: new Date().toISOString(),
        report: {
          marketAnalysis: {
            opportunity: 'BOSS类创业市场持续增长，中小企业主提升管理能力需求旺盛',
            personalityInsight: '你属于龙啸九天型，天生具有领导气质，适合开拓性市场策略'
          },
          strategyPlan: {
            core_positioning: '打造"老板商学院"差异化品牌，突出山海经人格特色',
            personalityInsight: '你的帝王型人格适合强势品牌定位，建议打造个人IP',
            personalityWarning: '注意避免过于独断，适当倾听团队意见'
          },
          executionPlan: {
            quick_wins: [
              '立即启动"老板人格测试"免费试用活动',
              '建立老板社群，通过分享解锁报告形成传播',
              '设计"人格定制化"付费报告服务'
            ],
            personalityInsight: '你的执行力爆棚型人格适合快速MVP验证，但需注意细节把控'
          },
          financialPlan: {
            investment_estimate: '首期投入5-10万，主要用于流量获取和产品迭代',
            break_even: '预计3-6个月实现盈亏平衡',
            personalityInsight: '作为散财童子型，建议合理控制前期投入节奏'
          }
        }
      }
      reportCache[id] = reportData
    }

    return NextResponse.json({
      success: true,
      ...reportData
    })
  } catch (error) {
    console.error('Report fetch error:', error)
    return NextResponse.json(
      { success: false, error: '获取报告失败' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { action } = body

    if (action === 'generate') {
      // 触发报告生成（异步）
      // 在实际环境中，这里应该触发AI报告生成流程
      return NextResponse.json({
        success: true,
        message: '报告生成中',
        status: 'generating'
      })
    }

    return NextResponse.json(
      { success: false, error: '未知操作' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Report action error:', error)
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    )
  }
}
