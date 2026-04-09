'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'

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
        addToast('success', '验证码已发送（查看控制台）')
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
  const selectCls = "w-full px-4 py-3 rounded-xl border border-[rgba(136,192,208,0.2)] bg-[#3b4252] text-[#eceff4] focus:outline-none focus:ring-2 focus:ring-[#88c0d0] focus:border-[#88c0d0]"

  return (
    <main className="min-h-screen bg-[#2e3440] relative overflow-hidden flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute inset-0 bg-radial-aurora" />

      <Card className="w-full max-w-lg p-8 relative" glass>
        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm transition-all ${
                s < step ? 'bg-[#88c0d0] text-[#2e3440]' : s === step ? 'bg-[#88c0d0] text-[#2e3440] ring-4 ring-[rgba(136,192,208,0.2)]' : 'bg-[#3b4252] text-[#616e88] border border-[rgba(136,192,208,0.15)]'
              }`}>{s < step ? '✓' : s}</div>
              {s < 3 && <div className={`w-16 h-0.5 rounded-full transition-all ${s < step ? 'bg-[#88c0d0]' : 'bg-[rgba(136,192,208,0.1)]'}`} />}
            </div>
          ))}
        </div>

        <div className="text-center mb-6">
          <Badge variant="primary">步骤 {step}/3</Badge>
          <h2 className="text-xl font-display font-bold text-[#eceff4] mt-3 tracking-tight">{stepLabels[step - 1]}</h2>
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div><label className="block text-sm font-medium text-[#d8dee9] mb-2">邮箱地址</label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" /></div>
            <div><label className="block text-sm font-medium text-[#d8dee9] mb-2">验证码</label>
              <div className="flex gap-3"><Input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="请输入验证码" maxLength={6} className="flex-1" /><Button type="button" variant="outline" onClick={sendCode} disabled={countdown > 0} className="whitespace-nowrap">{countdown > 0 ? `${countdown}s` : '获取验证码'}</Button></div>
            </div>
            <Button onClick={() => setStep(2)} disabled={!form.email || !form.code} size="lg" className="w-full">下一步</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div><label className="block text-sm font-medium text-[#d8dee9] mb-2">所属行业</label>
              <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} className={selectCls}>
                <option value="">请选择行业</option>{INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-[#d8dee9] mb-2">企业规模</label>
              <select value={form.scale} onChange={e => setForm({ ...form, scale: e.target.value })} className={selectCls}>
                <option value="">请选择规模</option>{SCALES.map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-[#d8dee9] mb-2">你的岗位</label><Input type="text" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="如：店长、老板、运营" /></div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} size="lg" className="flex-1">上一步</Button>
              <Button onClick={() => setStep(3)} disabled={!form.industry || !form.scale} size="lg" className="flex-1">下一步</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="bg-[rgba(136,192,208,0.06)] rounded-xl p-6 space-y-3 border border-[rgba(136,192,208,0.1)]">
              {[['邮箱', form.email], ['行业', form.industry], ['规模', form.scale], ['岗位', form.role || '-']].map(([label, value]) => (
                <div key={label} className="flex justify-between"><span className="text-[#616e88]">{label}</span><span className="font-medium text-[#eceff4]">{value}</span></div>
              ))}
            </div>
            <p className="text-sm text-[#616e88] text-center">注册即表示同意《用户协议》和《隐私政策》</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} size="lg" className="flex-1">上一步</Button>
              <Button onClick={handleRegister} disabled={registerLoading} size="lg" className="flex-1">{registerLoading ? '注册中...' : '立即注册'}</Button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-[#616e88]">
          已有账号？<Link href="/login" className="text-[#88c0d0] hover:text-[#9ccad8] transition-colors">立即登录</Link>
        </div>
      </Card>
    </main>
  )
}
