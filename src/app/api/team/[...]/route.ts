import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function GET(request: NextRequest) {
  return proxyRequest(request)
}

export async function POST(request: NextRequest) {
  return proxyRequest(request)
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request)
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request)
}

async function proxyRequest(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/team', '/api/team')
  const searchParams = request.nextUrl.searchParams.toString()
  const url = `${API_URL}${path}${searchParams ? '?' + searchParams : ''}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  const auth = request.headers.get('authorization')
  if (auth) headers['authorization'] = auth

  const body = request.method !== 'GET' ? await request.text() : undefined

  const response = await fetch(url, {
    method: request.method,
    headers,
    body,
  })

  const data = await response.text()
  return new NextResponse(data, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
