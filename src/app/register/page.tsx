'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge, Avatar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { Mail, Lock, Building2, Users, UserCircle, ArrowRight, ArrowLeft, Check, Bot, Sparkles } from 'lucide-react'

const INDUSTRIES = ['电子加工', '零售门店', '餐饮服务', '美容美发', '汽修汽配', '服装店', '其他']
const SCALES = ['1-5人', '6-20人', '21-50人', '50人以上']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [step, setStep] = useState(1)
  const [sendingCode, setSendingCode] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [form, setForm] = useState({ email: '', code: '', industry: '', scale: '', role: '' })
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current) } }, [])

  const sendCode = async () => {
    if (!EMAIL_RE.test(form.email)) { addToast('error', '请输入正确的邮箱地址'); return }
    setSendingCode(true)
    try {
      const res = await fetch('/api/auth/send-email-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email }) })
      if (res.ok) {
        setCountdown(60)
        addToast('success', '验证码已发送')
        timerRef.current = setInterval(() => { setCountdown(p => { if (p <= 1) { clearInterval(timerRef.current!); return 0 } return p - 1 }) }, 1000)
      } else { const d = await res.json(); addToast('error', d.error || '发送失败') }
    } finally { setSendingCode(false) }
  }

  const handleRegister = async () => {
    setRegisterLoading(true)
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) { const d = await res.json(); localStorage.setItem('token', d.token); addToast('success', '注册成功！'); router.push('/create-agent') }
      else { const d = await res.json(); addToast('error', d.error || '注册失败') }
    } finally { setRegisterLoading(false) }
  }

  const stepLabels = ['验证邮箱', '企业信息', '确认注册']

  return (
    <main className="min-h-screen bg-[#161616] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 bg-radial-green-intense" />

      {/* Decorative Elements */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#3ec489]/5 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-[#3ec489]/3 rounded-full blur-[150px] animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute inset-0 bg-dots opacity-30" />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo & Branding */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#3ec489] to-[#2eb06c] shadow-lg shadow-[#3ec489]/30 mb-6 glow-green">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            创建账号
          </h1>
          <p className="text-[#a3a3a3] text-lg">
            开始使用 AI 经营助手
          </p>
        </div>

        <Card className="shadow-2xl border-[#2e2e2e] bg-[#1f1f1f]/90 backdrop-blur-xl rounded-2xl animate-fade-in-up animation-delay-200" padding="none">
          <div className="p-8">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-3 mb-8">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center">
                  <div className={`relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-base transition-all duration-500 ${
                    s < step
                      ? 'bg-[#3ec489] text-white shadow-lg shadow-[#3ec489]/30'
                      : s === step
                      ? 'bg-[#3ec489] text-white ring-4 ring-[#3ec489]/20 glow-sm-green'
                      : 'bg-[#262626] text-[#737373] border border-[#333333]'
                  }`}>
                    {s < step ? (
                      <Check className="w-6 h-6" />
                    ) : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-16 h-1 mx-2 rounded-full transition-all duration-500 ${s < step ? 'bg-[#3ec489]' : 'bg-[#333333]'}`} />
                  )}
                </div>
              ))}
            </div>

            <div className="text-center mb-6">
              <Badge variant={step === 1 ? 'primary' : step === 2 ? 'warning' : 'success'} size="md">
                步骤 {step}/3
              </Badge>
              <h2 className="text-2xl font-bold text-white mt-3">{stepLabels[step - 1]}</h2>
            </div>

            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#a3a3a3]">邮箱地址</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="your@email.com"
                    leftIcon={<Mail className="w-5 h-5 text-[#737373]" />}
                    className="h-14 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#a3a3a3]">验证码</label>
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      value={form.code}
                      onChange={e => setForm({ ...form, code: e.target.value })}
                      placeholder="请输入6位验证码"
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
                </div>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!form.email || !form.code || !EMAIL_RE.test(form.email)}
                  className="w-full h-14 text-lg font-semibold shadow-xl shadow-[#3ec489]/20 hover:shadow-[#3ec489]/40 transition-all duration-300"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  下一步
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#a3a3a3]">
                    所属行业
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none z-10" />
                    <select
                      value={form.industry}
                      onChange={e => setForm({ ...form, industry: e.target.value })}
                      className="w-full h-14 pl-12 pr-4 rounded-xl border border-[#333333] bg-[#262626] text-white focus:outline-none focus:ring-2 focus:ring-[#3ec489] focus:border-transparent appearance-none text-base"
                    >
                      <option value="" className="bg-[#262626]">请选择行业</option>
                      {INDUSTRIES.map(i => <option key={i} value={i} className="bg-[#262626]">{i}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#a3a3a3]">
                    企业规模
                  </label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] pointer-events-none z-10" />
                    <select
                      value={form.scale}
                      onChange={e => setForm({ ...form, scale: e.target.value })}
                      className="w-full h-14 pl-12 pr-4 rounded-xl border border-[#333333] bg-[#262626] text-white focus:outline-none focus:ring-2 focus:ring-[#3ec489] focus:border-transparent appearance-none text-base"
                    >
                      <option value="" className="bg-[#262626]">请选择规模</option>
                      {SCALES.map(s => <option key={s} value={s} className="bg-[#262626]">{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#a3a3a3]">你的岗位</label>
                  <Input
                    type="text"
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    placeholder="如：店长、老板、运营"
                    leftIcon={<UserCircle className="w-5 h-5 text-[#737373]" />}
                    className="h-14 text-base"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-14 font-semibold" leftIcon={<ArrowLeft className="w-5 h-5" />}>
                    上一步
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!form.industry || !form.scale} className="flex-1 h-14 font-semibold shadow-xl shadow-[#3ec489]/20" rightIcon={<ArrowRight className="w-5 h-5" />}>
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-[#262626] to-[#1f1f1f] rounded-2xl p-6 space-y-4 border border-[#333333]">
                  <div className="flex items-center gap-4 pb-4 border-b border-[#333333]">
                    <Avatar fallback={form.email?.[0]?.toUpperCase() || 'U'} size="lg" />
                    <div>
                      <p className="font-semibold text-white text-lg">{form.email}</p>
                      <p className="text-sm text-[#737373]">待验证邮箱</p>
                    </div>
                  </div>
                  {[
                    ['行业', form.industry],
                    ['规模', form.scale],
                    ['岗位', form.role || '-'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-base">
                      <span className="text-[#737373]">{label}</span>
                      <span className="font-medium text-white">{value}</span>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-[#737373] text-center">
                  注册即表示同意《用户协议》和《隐私政策》
                </p>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-14 font-semibold" leftIcon={<ArrowLeft className="w-5 h-5" />}>
                    上一步
                  </Button>
                  <Button onClick={handleRegister} disabled={registerLoading} className="flex-1 h-14 font-semibold shadow-xl shadow-[#3ec489]/20 hover:shadow-[#3ec489]/40" loading={registerLoading}>
                    {registerLoading ? '注册中...' : '立即注册'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Card Bottom Accent */}
          <div className="h-1 bg-gradient-to-r from-[#3ec489] via-[#7ed6a8] to-[#3ec489] rounded-b-2xl" />
        </Card>

        <div className="mt-6 pt-6 border-t border-[#2e2e2e]">
          <p className="text-center text-[#a3a3a3]">
            已有账号？{' '}
            <Link href="/login" className="text-[#3ec489] hover:text-[#7ed6a8] font-semibold transition-colors inline-flex items-center gap-1 group">
              立即登录
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </p>
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 animate-fade-in-up animation-delay-300">
          {[
            { icon: Sparkles, text: 'AI智能助手' },
            { icon: Bot, text: '7×24服务' },
            { icon: Check, text: '即开即用' },
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
