'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge, Spinner } from '@/components/ui/misc'
import { ArrowLeft, Send, Clock, AlertCircle, CheckCircle2, Shield } from 'lucide-react'

interface FollowupState {
  reportId: number
  remainingHours: number
  remainingQueries: number
  totalQueries: number
  followupCount: number
  status: string
  isBlacklisted: boolean
  isOutOfScope: boolean
  needsClarification: boolean
  rejectionReason?: string
}

export default function FollowupPage() {
  const router = useRouter()
  const params = useParams()
  const lang = (params?.lang as string) || 'zh'
  const reportId = params?.id as string

  const [state, setState] = useState<FollowupState | null>(null)
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push(`/${lang}/login`)
      return
    }
    initFollowup()
  }, [lang, router, reportId])

  // Countdown timer
  useEffect(() => {
    if (!state || state.remainingHours <= 0) return

    const updateCountdown = () => {
      const hours = Math.floor(state.remainingHours)
      const minutes = Math.floor((state.remainingHours % 1) * 60)
      setCountdown(`${hours}h ${minutes}m`)
    }

    updateCountdown()
    const interval = setInterval(() => {
      setState(prev => prev ? { ...prev, remainingHours: prev.remainingHours - 1/60 } : null)
    }, 60000)

    return () => clearInterval(interval)
  }, [state?.remainingHours])

  const initFollowup = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/followup/${reportId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error('Failed to load')
      }

      const data = await res.json()
      setState({
        reportId: parseInt(reportId),
        remainingHours: data.remainingHours || 0,
        remainingQueries: data.remainingQueries || 0,
        totalQueries: data.totalQueries || 10,
        followupCount: data.followupCount || 0,
        status: data.status || 'unknown',
        isBlacklisted: false,
        isOutOfScope: false,
        needsClarification: false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  const handleSubmit = async () => {
    if (!input.trim() || !state) return

    const userMessage = input.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/followup/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportId: state.reportId,
          question: userMessage,
          lang,
        }),
      })

      const data = await res.json()

      if (data.result === 'blacklisted') {
        setMessages(prev => [...prev, {
          role: 'ai',
          content: lang === 'en'
            ? 'Sorry, this industry is not within our service scope.'
            : '抱歉，这个行业不在服务范围内。',
        }])
      } else if (data.result === 'out_of_scope') {
        setMessages(prev => [...prev, {
          role: 'ai',
          content: data.reason || (lang === 'en'
            ? 'This question is not related to your report.'
            : '这个问题与你的报告内容无关。'),
        }])
      } else if (data.result === 'needs_clarification') {
        setMessages(prev => [...prev, {
          role: 'ai',
          content: data.reason || (lang === 'en'
            ? 'I need clarification on which part of your report you are asking about.'
            : '我需要确认一下，您的问题是关于报告中的哪个部分？'),
        }])
      } else if (data.result === 'expired') {
        let reasonMsg = ''
        if (data.reasonType === 'time_expired') {
          reasonMsg = lang === 'en'
            ? 'Your 72-hour follow-up window has expired.'
            : '您的72小时追问时限已过。'
        } else if (data.reasonType === 'query_limit') {
          reasonMsg = lang === 'en'
            ? 'You have used all 10 follow-up queries.'
            : '您的10次追问机会已用完。'
        } else {
          reasonMsg = data.reason || (lang === 'en'
            ? 'Your follow-up window has expired.'
            : '您的追问时限已过。')
        }
        setMessages(prev => [...prev, {
          role: 'ai',
          content: reasonMsg,
        }])
        setState(prev => prev ? {
          ...prev,
          remainingHours: data.reasonType === 'time_expired' ? 0 : prev.remainingHours,
          remainingQueries: data.reasonType === 'query_limit' ? 0 : prev.remainingQueries,
        } : null)
      } else if (data.response) {
        setMessages(prev => [...prev, { role: 'ai', content: data.response }])
        // Q1: 更新剩余追问次数
        if (data.remainingQueries !== undefined) {
          setState(prev => prev ? { ...prev, remainingQueries: data.remainingQueries } : null)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const t = (zh: string, en: string) => lang === 'en' ? en : zh

  if (error && !state) {
    return (
      <div className="min-h-screen bg-[#161616] flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white mb-4">{error}</p>
          <Button onClick={() => router.push(`/${lang}/dashboard`)}>
            {t('返回首页', 'Go to Dashboard')}
          </Button>
        </Card>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-[#161616] flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="text-[#3ec489] mx-auto mb-4" />
          <p className="text-[#a3a3a3]">{t('加载中...', 'Loading...')}</p>
        </div>
      </div>
    )
  }

  // Q1: 检查是否过期（时间或次数）
  const isExpired = state.remainingHours <= 0 || state.remainingQueries <= 0

  return (
    <div className="min-h-screen bg-[#161616] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1f1f1f]/90 backdrop-blur-xl border-b border-[#2e2e2e]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push(`/${lang}/report/${reportId}`)}
            className="p-2 hover:bg-[#2e2e2e] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#a3a3a3]" />
          </button>

          <div className="flex items-center gap-3">
            {/* Q1: 显示时间 */}
            <Badge variant={state.remainingHours <= 0 ? 'danger' : 'success'} className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {state.remainingHours <= 0
                ? t('已过期', 'Expired')
                : countdown || `${Math.floor(state.remainingHours)}h`}
            </Badge>
            {/* Q1: 显示追问次数 */}
            <Badge variant={state.remainingQueries <= 0 ? 'danger' : 'secondary'} className="flex items-center gap-1">
              {t('剩余', 'Left')}: {state.remainingQueries}/{state.totalQueries}
            </Badge>
          </div>

          <div className="text-sm text-[#737373] flex items-center gap-1">
            <Shield className="w-4 h-4" />
            {t('追问保障', 'Follow-up Protected')}
          </div>
        </div>
      </div>

      {/* Q1: Expired Banner */}
      {isExpired && (
        <div className="bg-red-500/10 border-b border-red-500/30 py-3">
          <p className="text-center text-red-500 text-sm">
            {state.remainingHours <= 0
              ? t('追问时限已过，如需继续服务请重新购买', 'Follow-up window expired. Please purchase again to continue.')
              : t('追问次数已用完，如需继续服务请重新购买', 'Follow-up queries exhausted. Please purchase again to continue.')}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#a3a3a3] mb-2">
                {t('基于报告追问', 'Ask follow-up questions about the report')}
              </p>
              <p className="text-[#525252] text-sm">
                {t('只能追问报告相关内容，超出范围将被拒绝', 'Only questions related to the report are allowed')}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-[#3ec489] text-white rounded-br-md'
                    : 'bg-[#2e2e2e] text-white rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#2e2e2e] px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#3ec489] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#3ec489] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#3ec489] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      {isExpired ? (
        <div className="p-4 border-t border-[#2e2e2e]">
          <div className="max-w-2xl mx-auto">
            <p className="text-center text-[#737373] text-sm mb-4">
              {state.remainingHours <= 0
                ? t('72小时追问时限已结束', '72-hour follow-up window ended')
                : t('10次追问机会已用完', '10 follow-up queries exhausted')}
            </p>
            <Button
              onClick={() => router.push(`/${lang}/inquiry/start`)}
              className="w-full"
              variant="secondary"
            >
              {t('重新开始', 'Start Over')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-[#2e2e2e]">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('输入您的问题...', 'Type your question...')}
                disabled={loading}
                rows={1}
                className="flex-1 px-4 py-3 bg-[#0a0a0a] border border-[#2e2e2e] rounded-xl text-white placeholder-[#525252] resize-none focus:border-[#3ec489] focus:outline-none transition-colors disabled:opacity-50"
              />
              <Button
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
                leftIcon={loading ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
                className="px-6"
              >
                {t('发送', 'Send')}
              </Button>
            </div>
            <p className="text-center text-[#525252] text-xs mt-2">
              {t('仅限报告相关问题，边界外将被拒绝', 'Only report-related questions allowed')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}