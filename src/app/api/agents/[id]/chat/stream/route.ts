/**
 * Agents Chat Stream API
 * SSE流式输出，支持实时显示AI思考过程
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
    const url = `${API_URL}/api/agents/${id}/chat/stream`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    const auth = req.headers.get('authorization')
    if (auth) headers['authorization'] = auth

    // 转发到后端，获取流式响应
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          controller.close()
          return
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            controller.enqueue(new Uint8Array(value))
          }
          controller.close()
        } catch (e) {
          controller.error(e)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat stream error:', error)
    return NextResponse.json(
      { error: '流式输出失败，请重试' },
      { status: 500 }
    )
  }
}
