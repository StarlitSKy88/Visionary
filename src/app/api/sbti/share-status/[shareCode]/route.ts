import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb } from '@/lib/sbti-db'

/**
 * GET /api/sbti/share-status/[shareCode]
 * 查询指定 shareCode 的分享状态
 */
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

    const db = await getDb()
    const result = db.exec(
      `SELECT share_code, share_opens, share_unlocked, status, created_at FROM sbti_sessions WHERE share_code = ?`,
      [shareCode]
    )

    if (result.length === 0 || result[0].values.length === 0) {
      return NextResponse.json(
        { success: false, error: '分享码不存在' },
        { status: 404 }
      )
    }

    const row = result[0].values[0]
    const columns = result[0].columns
    const obj: Record<string, unknown> = {}
    columns.forEach((col: string, i: number) => { obj[col] = row[i] })

    const opens = obj.share_opens as number
    const unlocked = Boolean(obj.share_unlocked)

    return NextResponse.json({
      success: true,
      data: {
        shareCode: obj.share_code,
        opens,
        unlocked,
        status: obj.status,
        createdAt: obj.created_at,
        unlockThreshold: 3,
        message: unlocked
          ? '已解锁完整报告'
          : `分享 ${3 - opens} 次即可解锁完整报告`
      }
    })
  } catch (error) {
    console.error('SBTI Share Status GET Error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sbti/share-status/[shareCode]
 * 记录一次分享打开，累加 share_opens，达到阈值自动解锁
 */
export async function POST(
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

    const db = await getDb()

    // 查询当前 shareCode 对应的 session
    const result = db.exec(
      `SELECT id, share_opens, share_unlocked FROM sbti_sessions WHERE share_code = ?`,
      [shareCode]
    )

    if (result.length === 0 || result[0].values.length === 0) {
      return NextResponse.json(
        { success: false, error: '分享码不存在' },
        { status: 404 }
      )
    }

    const row = result[0].values[0]
    const sessionId = row[0] as string
    const currentOpens = (row[1] as number) || 0
    const alreadyUnlocked = Boolean(row[2])

    // 累加打开次数
    const newOpens = currentOpens + 1

    // 达到阈值（3次）自动解锁
    const unlocked = newOpens >= 3 || alreadyUnlocked

    db.run(
      `UPDATE sbti_sessions SET share_opens = ?, share_unlocked = ?, updated_at = datetime('now') WHERE id = ?`,
      [newOpens, unlocked ? 1 : 0, sessionId]
    )

    saveDb(db)

    return NextResponse.json({
      success: true,
      data: {
        shareCode,
        opens: newOpens,
        unlocked,
        unlockThreshold: 3,
        message: unlocked
          ? '已解锁完整报告'
          : `还需分享 ${3 - newOpens} 次即可解锁完整报告`
      }
    })
  } catch (error) {
    console.error('SBTI Share Status POST Error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}
