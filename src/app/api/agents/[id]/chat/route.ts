/**
 * Agents Chat API
 * 代理到后端服务器 /api/agents/:id/chat
 */

import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { id } = params
    const url = `${API_URL}/api/agents/${id}/chat`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    const auth = req.headers.get('authorization')
    if (auth) headers['authorization'] = auth

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Agents chat proxy error:', error)
    return NextResponse.json(
      { error: '处理消息失败，请重试' },
      { status: 500 }
    )
  }
}
