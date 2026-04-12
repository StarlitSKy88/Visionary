'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { Mail, Lock, Bot, ArrowRight, Shield, Sparkles } from 'lucide-react'

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
        addToast('success', '验证码已发送')
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
    <main className="min-h-screen bg-[#161616] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 bg-radial-green-intense" />

      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#3ec489]/5 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#3ec489]/3 rounded-full blur-[150px] animate-float" style={{ animationDelay: '2s' }} />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-dots opacity-30" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Branding */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#3ec489] to-[#2eb06c] shadow-lg shadow-[#3ec489]/30 mb-8 glow-green">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            欢迎回来
          </h1>
          <p className="text-[#a3a3a3] text-lg">
            使用邮箱验证码快速登录
          </p>
        </div>

        {/* Login Card */}
        <div className="animate-fade-in-up animation-delay-200">
          <Card className="p-8 shadow-2xl border-[#2e2e2e] bg-[#1f1f1f]/90 backdrop-blur-xl rounded-2xl" padding="none">
            <div className="p-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#a3a3a3]">
                    邮箱地址
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    leftIcon={<Mail className="w-5 h-5 text-[#737373]" />}
                    className="h-14 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#a3a3a3]">
                    验证码
                  </label>
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="6位验证码"
                      maxLength={6}
                      leftIcon={<Lock className="w-5 h-5 text-[#737373]" />}
                      className="flex-1 h-14 text-base"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={sendCode}
                      disabled={sendingCode || countdown > 0}
                      className="h-14 px-6 whitespace-nowrap font-semibold"
                    >
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </Button>
                  </div>
                  {countdown > 0 && (
                    <p className="text-sm text-[#737373] flex items-center gap-2 mt-2">
                      <Shield className="w-4 h-4 text-[#3ec489]" />
                      验证码已发送到您的邮箱
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full h-14 text-lg font-semibold shadow-xl shadow-[#3ec489]/20 hover:shadow-[#3ec489]/40 transition-all duration-300"
                  rightIcon={!loginLoading && <ArrowRight className="w-5 h-5" />}
                >
                  {loginLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      登录中...
                    </span>
                  ) : '登录'}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-[#2e2e2e]">
                <p className="text-center text-[#a3a3a3]">
                  还没有账号？{' '}
                  <Link
                    href="/register"
                    className="text-[#3ec489] hover:text-[#7ed6a8] font-semibold transition-colors inline-flex items-center gap-1 group"
                  >
                    立即注册
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </p>
              </div>
            </div>

            {/* Card Bottom Accent */}
            <div className="h-1 bg-gradient-to-r from-[#3ec489] via-[#7ed6a8] to-[#3ec489] rounded-b-2xl" />
          </Card>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-[#525252] mt-8 animate-fade-in-up animation-delay-300">
          登录即表示同意《用户协议》和《隐私政策》
        </p>

        {/* Features Preview */}
        <div className="mt-12 grid grid-cols-3 gap-4 animate-fade-in-up animation-delay-400">
          {[
            { icon: Sparkles, text: 'AI智能助手' },
            { icon: Shield, text: '数据安全' },
            { icon: Bot, text: '7×24服务' },
          ].map((item, i) => (
            <div key={i} className="text-center p-4 rounded-xl bg-[#1f1f1f]/50 border border-[#2e2e2e] backdrop-blur-sm">
              <item.icon className="w-5 h-5 text-[#3ec489] mx-auto mb-2" />
              <p className="text-xs text-[#737373]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
