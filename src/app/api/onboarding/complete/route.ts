/**
 * Onboarding Complete API
 * 代理到后端服务器
 */

import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const path = req.nextUrl.pathname.replace('/api', '')
    const url = `${API_URL}${path}`

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
    console.error('Onboarding proxy error:', error)
    return NextResponse.json(
      { error: '创建失败，请重试' },
      { status: 500 }
    )
  }
}
