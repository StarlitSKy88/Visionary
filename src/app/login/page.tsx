'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'

export default function LoginPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const sendCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addToast('error', '请输入正确的邮箱地址')
      return
    }

    setSendingCode(true)
    try {
      const res = await fetch('/api/auth/send-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setCountdown(60)
        addToast('success', '验证码已发送（查看控制台）')
        timerRef.current = setInterval(() => {
          setCountdown(prev => { if (prev <= 1) { clearInterval(timerRef.current!); return 0 } return prev - 1 })
        }, 1000)
      } else {
        const data = await res.json()
        addToast('error', data.error || '发送失败')
      }
    } finally {
      setSendingCode(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) { addToast('warning', '请输入验证码'); return }

    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })

      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('token', data.token)
        addToast('success', '登录成功')
        router.push('/create-agent')
      } else {
        const data = await res.json()
        addToast('error', data.error || '登录失败')
      }
    } finally {
      setLoginLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#2e3440] relative overflow-hidden flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute inset-0 bg-radial-frost" />
      <div className="absolute top-20 right-[20%] w-72 h-72 bg-[#88c0d0] opacity-[0.04] rounded-full blur-[120px]" />

      <Card className="w-full max-w-md p-8 relative border-[rgba(136,192,208,0.12)]" glass>
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-[#88c0d0] flex items-center justify-center text-[#2e3440] font-display font-bold text-xl mx-auto mb-4 shadow-frost">
            AI
          </div>
          <h1 className="text-2xl font-display font-extrabold text-[#eceff4]">欢迎回来</h1>
          <p className="text-[#81a1c1] mt-2 text-sm font-light">邮箱验证码登录</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#d8dee9] mb-2">邮箱地址</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#d8dee9] mb-2">验证码</label>
            <div className="flex gap-3">
              <Input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="请输入验证码" maxLength={6} className="flex-1" />
              <Button type="button" variant="outline" onClick={sendCode} disabled={sendingCode || countdown > 0} className="whitespace-nowrap">
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </Button>
            </div>
            {countdown > 0 && <p className="text-sm text-[#88c0d0] mt-2">验证码已发送到您的邮箱（查看控制台）</p>}
          </div>

          <Button type="submit" disabled={loginLoading} size="lg" className="w-full">
            {loginLoading ? '登录中...' : '登录'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-[#616e88]">
          还没有账号？{' '}
          <Link href="/register" className="text-[#88c0d0] hover:text-[#9ccad8] transition-colors">立即注册</Link>
        </div>
      </Card>
    </main>
  )
}
