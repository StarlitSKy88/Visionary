import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb } from '@/lib/sbti-db'

/**
 * POST /api/sbti/share/open
 * 记录分享被打开，增加 share_opens 计数
 * 当达到阈值（3次）时自动解锁
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shareCode, visitorId } = body

    if (!shareCode) {
      return NextResponse.json(
        { success: false, error: '缺少分享码' },
        { status: 400 }
      )
    }

    // 使用 visitorId 防止同一设备重复计数
    const db = await getDb()

    // 检查是否已经记录过此 visitorId 的打开
    const existingVisitor = db.exec(
      `SELECT id FROM sbti_share_visitors WHERE share_code = ? AND visitor_id = ?`,
      [shareCode, visitorId]
    )

    if (existingVisitor.length > 0 && existingVisitor[0].values.length > 0) {
      // 已经记录过，仅返回当前状态
      const session = db.exec(
        `SELECT share_opens, share_unlocked FROM sbti_sessions WHERE share_code = ?`,
        [shareCode]
      )
      if (session.length > 0 && session[0].values.length > 0) {
        return NextResponse.json({
          success: true,
          data: {
            opens: session[0].values[0][0],
            unlocked: Boolean(session[0].values[0][1]),
            message: '已经记录过了'
          }
        })
      }
    }

    // 记录新的 visitor
    try {
      db.run(
        `INSERT INTO sbti_share_visitors (share_code, visitor_id, created_at) VALUES (?, ?, datetime('now'))`,
        [shareCode, visitorId]
      )
    } catch {
      // 忽略唯一约束错误（重复记录）
    }

    // 检查是否是新的 visitor（通过再次查询）
    const checkVisitor = db.exec(
      `SELECT COUNT(*) FROM sbti_share_visitors WHERE share_code = ? AND visitor_id = ?`,
      [shareCode, visitorId]
    )
    const visitCount = checkVisitor[0]?.values[0]?.[0] as number || 0

    // 只有当是新的 visitor 时才增加计数
    if (visitCount === 1) {
      // 获取当前 session 信息
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
          opens: newOpens,
          unlocked,
          unlockThreshold: 3,
          message: unlocked ? '已解锁完整报告' : `还需分享 ${3 - newOpens} 次即可解锁`
        }
      })
    }

    // 重复访问
    return NextResponse.json({
      success: true,
      data: {
        message: '已经记录过了'
      }
    })
  } catch (error) {
    console.error('SBTI Share Open Error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}