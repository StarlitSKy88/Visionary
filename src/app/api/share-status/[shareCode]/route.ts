import { NextRequest, NextResponse } from 'next/server'

// 模拟分享状态数据
const shareStatusCache = new Map()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  try {
    const { shareCode } = await params

    if (!shareCode) {
      return NextResponse.json(
        { success: false, error: '缺少分享码' },
        { status: 400 }
      )
    }

    // 获取或创建分享状态
    let status = shareStatusCache.get(shareCode)
    if (!status) {
      // 模拟数据：初始状态
      status = {
        shareCode,
        opens: Math.floor(Math.random() * 100),
        unlocked: true,
        remaining: 0,
        totalUnlocks: Math.floor(Math.random() * 50)
      }
      shareStatusCache.set(shareCode, status)
    }

    return NextResponse.json({
      success: true,
      ...status
    })
  } catch (error) {
    console.error('CEO-TI Status Error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}
