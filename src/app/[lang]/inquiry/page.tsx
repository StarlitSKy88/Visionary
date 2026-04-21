'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge, Spinner } from '@/components/ui/misc'
import { ArrowLeft, Send, SkipForward, Bot, CheckCircle2, AlertCircle, QrCode } from 'lucide-react'

const DIMENSIONS_ZH = {
  location: '位置/流量',
  scale: '规模',
  financial: '财务',
  competition: '竞争',
  pain_point: '痛点',
  resource: '资源',
  experience: '经验',
}

const DIMENSIONS_EN = {
  location: 'Location/Traffic',
  scale: 'Scale',
  financial: 'Financial',
  competition: 'Competition',
  pain_point: 'Pain Point',
  resource: 'Resource',
  experience: 'Experience',
}

interface InquiryState {
  sessionId: number
  status: string
  round: number
  currentDimension: string | null
  question: string | null
  coverage: {
    covered: string[]
    skipped: string[]
    total: number
  }
  triggerReady: boolean
}

interface PaymentState {
  reportId: number
  tradeNo: string
  codeUrl: string | null
  amount: number
  status: 'pending' | 'dev_mode'
}

export default function InquiryPage() {
  const router = useRouter()
  const params = useParams()
  const lang = (params?.lang as string) || 'zh'

  const [sessionId, setSessionId] = useState<number | null>(null)
  const [state, setState] = useState<InquiryState | null>(null)
  const [payment, setPayment] = useState<PaymentState | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clarification, setClarification] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]) // E1: AI思考步骤
  const [showDisclaimer, setShowDisclaimer] = useState(false) // C1: 付费前免责声明
  const [showPrivacy, setShowPrivacy] = useState(false)     // C2: 数据隐私说明
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false)
  // T2: 数据召回弹窗
  const [showRecall, setShowRecall] = useState(false)
  const [previousSessions, setPreviousSessions] = useState<any[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const dimensions = lang === 'en' ? DIMENSIONS_EN : DIMENSIONS_ZH
  const skipLabel = lang === 'en' ? "Don't know" : '不知道'
  const placeholder = lang === 'en'
    ? 'Type your answer here...'
    : '输入您的回答...'

  // 初始化：检查历史会话
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push(`/${lang}/login`)
      return
    }
    // T2: 先检查是否有可召回的历史会话
    checkPreviousSessions()
  }, [lang, router])

  // T2: 检查历史会话
  const checkPreviousSessions = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/inquiry/previous', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to check previous sessions')

      const data = await res.json()
      if (data.hasPrevious && data.sessions.length > 0) {
        setPreviousSessions(data.sessions)
        setShowRecall(true)
      } else {
        // 没有历史会话，直接开始新会话
        startNewSession()
      }
    } catch {
      // 出错也直接开始新会话
      startNewSession()
    }
  }

  // T2: 开始新会话
  const startNewSession = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/inquiry/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ lang }),
      })

      if (!res.ok) {
        throw new Error('Failed to start session')
      }

      const data = await res.json()
      setSessionId(data.sessionId)
      setState({
        sessionId: data.sessionId,
        status: data.status,
        round: data.round || 0,
        currentDimension: null,
        question: data.question,
        coverage: data.coverage || { covered: [], skipped: [], total: 0 },
        triggerReady: false,
      })
      setError('')
      // C2: 数据隐私说明 - session创建后显示
      setShowPrivacy(true)
    } catch (err) {
      setError(lang === 'en' ? 'Failed to start. Please try again.' : '启动失败，请重试')
    }
  }

  // T2: 继续选择的历史会话
  const resumeSession = (sessionId: number) => {
    setShowRecall(false)
    // 直接使用选择的sessionId，不需要重新创建
    fetchSessionState(sessionId)
  }

  // T2: 获取指定session的状态
  const fetchSessionState = async (sid: number) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/inquiry/session/${sid}?lang=${lang}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to fetch session')

      const data = await res.json()
      setSessionId(sid)
      setState({
        sessionId: sid,
        status: data.status,
        round: data.round || 0,
        currentDimension: data.currentDimension,
        question: data.question,
        coverage: data.coverage || { covered: [], skipped: [], total: 0 },
        triggerReady: data.triggerReady || false,
      })
      setError('')
    } catch (err) {
      setError(lang === 'en' ? 'Failed to resume session.' : '恢复会话失败，请重试')
    }
  }

  // E1: SSE流式提交回答
  const handleSubmit = async () => {
    if (!input.trim() || !sessionId || !state) return

    const dimension = state.currentDimension || 'location'
    setLoading(true)
    setClarification(null)
    setThinkingSteps([])
    setError('')

    try {
      const token = localStorage.getItem('token')

      // E1: 使用SSE流式接口
      const response = await fetch('/api/inquiry/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, dimension, answer: input.trim(), lang }),
      })

      if (!response.ok) {
        const errData = await response.json()
        if (errData.type === 'media_rejected') {
          setError(lang === 'en'
            ? 'Please use text. I cannot process images or voice.'
            : '请用文字描述，我无法处理图片或语音。')
          setLoading(false)
          return
        }
        throw new Error(errData.error || 'Failed to submit')
      }

      // E1: 处理SSE流
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7)
            continue
          }
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const event = JSON.parse(data)

              // E1: 根据事件类型处理
              if (event.type === 'thinking' || event.message) {
                // thinking事件
                setThinkingSteps(prev => [...prev, event.message])
              } else if (event.type === 'media_rejected') {
                setError(event.message)
                setLoading(false)
                return
              } else if (event.type === 'clarification') {
                setClarification(event.message)
                setState(prev => prev ? { ...prev, round: prev.round + 1 } : null)
              } else if (event.type === 'triggered') {
                // 触发报告生成，跳转到支付
                setInput('')
                setThinkingSteps([])
                setShowDisclaimer(true)
                setLoading(false)
                return
              } else if (event.type === 'next_question') {
                setInput('')
                setThinkingSteps([])
                setClarification(null)
                setState({
                  ...state,
                  round: (state.round || 0) + 1,
                  currentDimension: event.dimension,
                  question: event.question,
                  coverage: event.coverage || state.coverage,
                })
              }
            } catch (e) {
              // 解析失败，忽略
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  // E1: SSE流式跳过
  const handleSkip = async () => {
    if (!sessionId || !state) return
    const dimension = state.currentDimension || 'location'

    setLoading(true)
    setThinkingSteps([])
    setError('')

    try {
      const token = localStorage.getItem('token')

      // E1: 使用SSE流式接口
      const response = await fetch('/api/inquiry/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, dimension, answer: '不知道', lang }),
      })

      if (!response.ok) throw new Error('Failed to skip')

      // E1: 处理SSE流
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const event = JSON.parse(data)

              if (event.message) {
                setThinkingSteps(prev => [...prev, event.message])
              } else if (event.type === 'triggered') {
                setThinkingSteps([])
                setShowDisclaimer(true)
                setLoading(false)
                return
              } else if (event.type === 'next_question') {
                setThinkingSteps([])
                setState({
                  ...state,
                  round: (state.round || 0) + 1,
                  currentDimension: event.dimension,
                  question: event.question,
                  coverage: event.coverage || state.coverage,
                })
              }
            } catch (e) {
              // 解析失败，忽略
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const createPayment = async () => {
    if (!sessionId) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await res.json()

      if (data.reportId) {
        setPayment({
          reportId: data.reportId,
          tradeNo: data.tradeNo,
          codeUrl: data.codeUrl,
          amount: data.amount,
          status: data.status,
        })
      }
    } catch {
      // ignore
    }
  }

  const confirmPayment = async () => {
    if (!payment) return

    setConfirming(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reportId: payment.reportId }),
      })

      const data = await res.json()

      if (data.success) {
        // 支付确认，开始生成报告
        // 跳转到报告页等待生成完成
        router.push(`/${lang}/report/${payment.reportId}`)
      }
    } catch {
      setError(lang === 'en' ? 'Payment confirmation failed' : '支付确认失败')
    } finally {
      setConfirming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 计算进度
  const requiredDimensions = ['location', 'scale', 'financial', 'competition', 'pain_point']
  const coveredCount = state?.coverage?.covered.filter(d => requiredDimensions.includes(d)).length || 0
  const progress = Math.round((coveredCount / 5) * 100)

  // C1: 付费前免责声明弹窗
  if (showDisclaimer) {
    return (
      <div className="min-h-screen bg-[#161616] flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#f59e0b]/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-[#f59e0b]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-4">
            {lang === 'en' ? 'Disclaimer' : '免责声明'}
          </h2>
          <p className="text-[#a3a3a3] mb-6 text-left">
            {lang === 'en'
              ? 'This report is for business reference only and does not constitute investment or decision-making advice. You bear full responsibility for business decisions and their outcomes.'
              : '本报告仅为经营参考，不构成投资/决策建议，您自主承担经营风险。'}
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => {
                setShowDisclaimer(false)
                createPayment()
              }}
              className="w-full"
            >
              {lang === 'en' ? 'I Understand, Continue to Pay' : '我已知晓，继续支付'}
            </Button>
            <Button
              onClick={() => setShowDisclaimer(false)}
              variant="secondary"
              className="w-full"
            >
              {lang === 'en' ? 'Go Back' : '返回'}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // T2: 数据召回弹窗
  if (showRecall && previousSessions.length > 0) {
    return (
      <div className="min-h-screen bg-[#161616] flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#f59e0b]/20 flex items-center justify-center mx-auto mb-6">
            <Bot className="w-8 h-8 text-[#f59e0b]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-4">
            {lang === 'en' ? 'Continue Previous Session?' : '是否继续之前的会话？'}
          </h2>
          <p className="text-[#a3a3a3] mb-6 text-left text-sm leading-relaxed">
            {lang === 'en'
              ? 'We found your previous unfinished session. Would you like to continue where you left off?'
              : '我们发现您有未完成的会话，是否要继续之前的进度？'}
          </p>

          {/* 会话列表 */}
          <div className="space-y-3 mb-6">
            {previousSessions.slice(0, 3).map((s: any) => (
              <button
                key={s.sessionId}
                onClick={() => resumeSession(s.sessionId)}
                className="w-full p-3 bg-[#2e2e2e] hover:bg-[#3e3e3e] rounded-lg text-left transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm">
                    {s.roundCount} {lang === 'en' ? 'rounds' : '轮追问'}
                  </span>
                  <span className="text-[#737373] text-xs">
                    {s.coverage?.covered?.length || 0}/5 {lang === 'en' ? 'covered' : '已覆盖'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                setShowRecall(false)
                startNewSession()
              }}
              variant="secondary"
              className="w-full"
            >
              {lang === 'en' ? 'Start Fresh' : '重新开始'}
            </Button>
            <Button
              onClick={() => setShowRecall(false)}
              variant="ghost"
              className="w-full text-[#737373]"
            >
              {lang === 'en' ? 'Cancel' : '取消'}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // C2: 数据隐私说明弹窗
  if (showPrivacy && !privacyConfirmed) {
    return (
      <div className="min-h-screen bg-[#161616] flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#3ec489]/20 flex items-center justify-center mx-auto mb-6">
            <Bot className="w-8 h-8 text-[#3ec489]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-4">
            {lang === 'en' ? 'Data Privacy Notice' : '数据隐私说明'}
          </h2>
          <p className="text-[#a3a3a3] mb-6 text-left text-sm leading-relaxed">
            {lang === 'en'
              ? 'The business information you provide will only be used to generate your report. Data will be automatically deleted 30 days after report completion. Your information will not be shared with third parties.'
              : '您提供的生意信息仅用于生成报告，报告完成后30天自动删除，不会泄露给第三方。'}
          </p>
          <Button
            onClick={() => {
              setPrivacyConfirmed(true)
              setShowPrivacy(false)
            }}
            className="w-full"
          >
            {lang === 'en' ? 'I Understand, Start Inquiry' : '我已知晓，开始追问'}
          </Button>
        </Card>
      </div>
    )
  }

  // 支付页面
  if (payment) {
    return (
      <div className="min-h-screen bg-[#161616] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#1f1f1f]/90 backdrop-blur-xl border-b border-[#2e2e2e]">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => setPayment(null)}
              className="p-2 hover:bg-[#2e2e2e] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#a3a3a3]" />
            </button>
            <span className="text-white font-medium">
              {lang === 'en' ? 'Complete Payment' : '完成支付'}
            </span>
            <div className="w-10" />
          </div>
        </div>

        {/* Payment Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-8 max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-[#3ec489]/20 flex items-center justify-center mx-auto mb-6">
              <QrCode className="w-8 h-8 text-[#3ec489]" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              {lang === 'en' ? 'Payment Required' : '需要支付'}
            </h2>
            <p className="text-[#a3a3a3] mb-6">
              {lang === 'en'
                ? `Pay ¥${payment.amount} to generate your report`
                : `支付 ¥${payment.amount} 生成报告`}
            </p>

            {payment.codeUrl ? (
              <div className="mb-6">
                <img
                  src={payment.codeUrl}
                  alt="Payment QR Code"
                  className="mx-auto w-48 h-48 bg-white rounded-lg"
                />
                <p className="text-sm text-[#525252] mt-2">
                  {lang === 'en' ? 'Scan with WeChat to pay' : '微信扫码支付'}
                </p>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-[#2e2e2e] rounded-lg">
                <p className="text-[#a3a3a3] text-sm">
                  {lang === 'en' ? 'Development Mode' : '开发环境'}
                </p>
                <p className="text-[#525252] text-xs mt-1">
                  {lang === 'en'
                    ? 'Click confirm to simulate payment'
                    : '点击确认模拟支付成功'}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {payment.codeUrl ? (
                <Button
                  onClick={() => {
                    // 轮询支付状态
                    const checkStatus = async () => {
                      const token = localStorage.getItem('token')
                      const res = await fetch(`/api/payment/status/${payment.reportId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      })
                      const data = await res.json()
                      if (data.status === 'generating' || data.status === 'completed') {
                        router.push(`/${lang}/report/${payment.reportId}`)
                      }
                    }
                    setInterval(checkStatus, 2000)
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  {lang === 'en' ? 'I have paid' : '我已支付'}
                </Button>
              ) : (
                <Button
                  onClick={confirmPayment}
                  disabled={confirming}
                  className="w-full"
                  leftIcon={confirming ? <Spinner size="sm" /> : null}
                >
                  {confirming
                    ? (lang === 'en' ? 'Confirming...' : '确认中...')
                    : (lang === 'en' ? 'Confirm Payment' : '确认支付')}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (error && !state) {
    return (
      <div className="min-h-screen bg-[#161616] flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white mb-4">{error}</p>
          <Button onClick={startSession}>
            {lang === 'en' ? 'Retry' : '重试'}
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
          <p className="text-[#a3a3a3]">
            {lang === 'en' ? 'Starting inquiry...' : '正在启动追问...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#161616] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1f1f1f]/90 backdrop-blur-xl border-b border-[#2e2e2e]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push(`/${lang}/dashboard`)}
            className="p-2 hover:bg-[#2e2e2e] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#a3a3a3]" />
          </button>

          {/* Progress */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#a3a3a3]">
              {coveredCount}/5
            </span>
            <div className="w-32 h-2 bg-[#2e2e2e] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3ec489] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <Bot className="w-5 h-5 text-[#3ec489]" />
          </div>

          <div className="text-sm text-[#737373]">
            {lang === 'en' ? 'Round' : '第'}{state.round || 0}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Current Dimension Badge */}
          {state.currentDimension && (
            <div className="flex justify-center mb-6">
              <Badge variant="success" className="text-sm px-4 py-2">
                {dimensions[state.currentDimension as keyof typeof dimensions] || state.currentDimension}
              </Badge>
            </div>
          )}

          {/* Question Card */}
          <Card className="p-8 mb-8 bg-[#1f1f1f]/80 border-[#2e2e2e]">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white leading-relaxed">
                {state.question || (lang === 'en' ? 'Loading...' : '加载中...')}
              </h2>
            </div>

            {/* E1: AI思考过程动画 */}
            {loading && thinkingSteps.length > 0 && (
              <div className="mb-6 p-4 bg-[#1f1f1f] border border-[#2e2e2e] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-[#3ec489] animate-pulse" />
                  <span className="text-[#3ec489] text-sm font-medium">
                    {lang === 'en' ? 'AI is thinking...' : 'AI 思考中...'}
                  </span>
                </div>
                <div className="space-y-1">
                  {thinkingSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[#737373]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3ec489]" />
                      <span>{step}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-sm text-[#525252]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#525252] animate-pulse" />
                    <span>{lang === 'en' ? 'Processing...' : '处理中...'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Clarification Prompt */}
            {clarification && !loading && (
              <div className="mb-6 p-4 bg-[#3ec489]/10 border border-[#3ec489]/30 rounded-lg">
                <p className="text-[#3ec489] text-center">{clarification}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-500 text-center">{error}</p>
              </div>
            )}

            {/* Input Area */}
            <div className="space-y-4">
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={loading}
                rows={3}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2e2e2e] rounded-xl text-white placeholder-[#525252] resize-none focus:border-[#3ec489] focus:outline-none transition-colors disabled:opacity-50"
              />

              <div className="flex gap-3">
                <Button
                  onClick={handleSkip}
                  disabled={loading}
                  variant="secondary"
                  className="flex-1"
                  leftIcon={<SkipForward className="w-4 h-4" />}
                >
                  {skipLabel}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !input.trim()}
                  className="flex-1"
                  leftIcon={loading ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
                >
                  {loading ? (lang === 'en' ? 'Sending...' : '发送中...') : (lang === 'en' ? 'Send' : '发送')}
                </Button>
              </div>
            </div>
          </Card>

          {/* Coverage Status */}
          <div className="flex flex-wrap justify-center gap-2">
            {requiredDimensions.map(dim => {
              const isCovered = state.coverage?.covered.includes(dim)
              const isSkipped = state.coverage?.skipped.includes(dim)
              return (
                <div
                  key={dim}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                    isCovered
                      ? 'bg-[#3ec489]/20 text-[#3ec489]'
                      : isSkipped
                      ? 'bg-[#525252]/20 text-[#737373] line-through'
                      : 'bg-[#2e2e2e] text-[#a3a3a3]'
                  }`}
                >
                  {isCovered && <CheckCircle2 className="w-3 h-3" />}
                  {dimensions[dim as keyof typeof dimensions]}
                </div>
              )
            })}
          </div>

          {/* Tips */}
          <p className="text-center text-[#525252] text-sm mt-8">
            {lang === 'en'
              ? 'Tip: You can say "I don\'t know" to skip any question'
              : '提示：可以说"不知道"跳过任何问题'}
          </p>
        </div>
      </div>
    </div>
  )
}