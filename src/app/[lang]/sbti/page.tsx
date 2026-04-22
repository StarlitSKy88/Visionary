'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Share2, Copy, CheckCircle2, Lock, Unlock, ChevronRight, Sun, Moon } from 'lucide-react'
import { useTheme, getPersonalityColors, isSecretPersonality } from '@/hooks/useTheme'

interface Question {
  id: number
  question: string
  options: { key: string; text: string }[]
}

interface Personality {
  id: string
  name: string
  title: string
  slogan: string
  is_secret: boolean
}

interface CardData {
  name: string
  title: string
  slogan: string
  good_for: string
  avoid: string
  emoji: string
  tags: { icon: string; text: string }[]
  money_score: number
  share_texts: {
    吐槽风: { primary: string; secondary: string; hashtags: string }
    励志风: { primary: string; secondary: string; hashtags: string }
    商务风: { primary: string; secondary: string; hashtags: string }
  }
}

function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let deviceId = localStorage.getItem('sbti_device_id')
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
    localStorage.setItem('sbti_device_id', deviceId)
  }
  return deviceId
}

export default function SBTIPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lang = 'zh'
  const { theme, toggleTheme, mounted } = useTheme()

  const [sessionId, setSessionId] = useState<number | null>(null)
  const [currentQuestionId, setCurrentQuestionId] = useState<number>(0)
  const [totalQuestions] = useState<number>(24)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [personality, setPersonality] = useState<Personality | null>(null)
  const [card, setCard] = useState<CardData | null>(null)
  const [shareCode, setShareCode] = useState<string>('')
  const [shareUrl, setShareUrl] = useState<string>('')
  const [shareStatus, setShareStatus] = useState<{ opens: number; unlocked: boolean; remaining: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'test' | 'result'>('test')
  const [copied, setCopied] = useState(false)
  const [questionVisible, setQuestionVisible] = useState(true)

  const personalityColors = personality ? getPersonalityColors(personality.id) : null
  const isSecret = personality ? isSecretPersonality(personality.id) : false

  const refCode = searchParams.get('ref')

  useEffect(() => {
    if (refCode) {
      recordShareOpen(refCode)
    }
    const deviceId = getDeviceId()
    startTest(deviceId)
  }, [refCode])

  useEffect(() => {
    if (!shareCode || phase !== 'result') return
    const interval = setInterval(() => {
      fetchShareStatus()
    }, 3000)
    return () => clearInterval(interval)
  }, [shareCode, phase])

  const startTest = async (deviceId: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/sbti/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, deviceId }),
      })
      if (!res.ok) throw new Error('Failed to start test')
      const data = await res.json()
      setSessionId(data.sessionId)
      setShareCode(data.shareCode)
      setShareUrl(data.shareUrl)
      setCurrentQuestionId(data.currentQuestion)
      setQuestions([data.question])
    } catch (err) {
      setError('启动失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const recordShareOpen = async (code: string) => {
    try {
      const deviceId = getDeviceId()
      await fetch('/api/sbti/share/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareCode: code, visitorId: deviceId }),
      })
    } catch {
      // 忽略错误
    }
  }

  const fetchShareStatus = async () => {
    if (!shareCode) return
    try {
      const res = await fetch(`/api/sbti/status/${shareCode}`)
      if (res.ok) {
        const data = await res.json()
        setShareStatus(data)
      }
    } catch {
      // 忽略错误
    }
  }

  const handleAnswer = async (questionId: number, answerKey: string) => {
    if (!sessionId) return

    const newAnswers = { ...answers, [questionId]: answerKey }
    setAnswers(newAnswers)

    // 淡出动画
    setQuestionVisible(false)

    setTimeout(async () => {
      if (questionId < totalQuestions) {
        setLoading(true)
        try {
          const res = await fetch('/api/sbti/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, questionId, answer: answerKey }),
          })
          if (!res.ok) throw new Error('Failed to submit answer')
          const data = await res.json()
          if (data.completed) {
            await completeTest()
          } else {
            setCurrentQuestionId(data.currentQuestion)
            setQuestions(prev => [...prev, data.question])
          }
        } catch (err) {
          setError('提交失败，请重试')
        } finally {
          setLoading(false)
          setQuestionVisible(true)
        }
      } else {
        await completeTest()
      }
    }, 300)
  }

  const completeTest = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const res = await fetch('/api/sbti/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) throw new Error('Failed to complete test')
      const data = await res.json()
      setPersonality(data.personality)
      setCard(data.card)
      setShareCode(data.shareCode)
      setShareUrl(data.shareUrl)
      setShareStatus(data.shareStatus)
      setPhase('result')
    } catch (err) {
      setError('完成失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const copyShareText = (style: '吐槽风' | '励志风' | '商务风') => {
    if (!card) return
    const text = card.share_texts[style]
    const fullText = `${text.primary}\n${text.secondary}\n${shareUrl}\n${text.hashtags}`
    navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentQuestion = questions[questions.length - 1]
  const progress = Object.keys(answers).length

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* 暗角效果 */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)'
      }} />

      {/* 甲骨文装饰 */}
      <OracleBones />

      {/* Header - 简化版 */}
      <header className="sticky top-0 z-20 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </button>

          {/* 古风卷轴进度条 */}
          <div className="flex items-center gap-3 flex-1 ml-4">
            <span className="seal text-sm opacity-40">卷</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }}>
              <div
                className="h-full animate-ink-spread"
                style={{
                  width: `${(progress / totalQuestions) * 100}%`,
                  background: 'var(--accent-primary)'
                }}
              />
            </div>
            <span className="text-xs opacity-60" style={{ color: 'var(--text-muted)' }}>
              第 {progress} / {totalQuestions} 题
            </span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 opacity-60 hover:opacity-100 transition-opacity ml-4"
            aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {mounted && (theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 relative z-20">
        {/* 加载状态 */}
        {loading && !currentQuestion && !error && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl animate-breathe">🐉</div>
            <p className="mt-6 text-sm opacity-60" style={{ color: 'var(--text-muted)' }}>
              正在加载题目...
            </p>
          </div>
        )}

        {error && (
          <div className="sbti-card p-4" style={{ borderColor: 'var(--accent-danger)' }}>
            <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
          </div>
        )}

        {/* 测试阶段 */}
        {!loading && phase === 'test' && currentQuestion && (
          <div className={`transition-opacity duration-300 ${questionVisible ? 'opacity-100' : 'opacity-0'}`}>
            {/* 题目 */}
            <div className="mb-8 ml-2">
              <h2 className="text-2xl font-bold leading-relaxed" style={{ color: 'var(--text-primary)', lineHeight: 1.7 }}>
                {currentQuestion.question}
              </h2>
              <div className="bronze-divider mt-4" style={{ width: '80%' }} />
              <div className="mt-3 text-xl opacity-30">🐉</div>
            </div>

            {/* 选项 - 错落布局 */}
            <div className="space-y-0">
              {currentQuestion.options.map((option, index) => {
                const borderRadii = ['4px', '7px', '11px', '7px']
                const paddings = ['13px', '15px', '17px', '15px']
                return (
                  <button
                    key={option.key}
                    onClick={() => handleAnswer(currentQuestion.id, option.key)}
                    className={`sbti-option w-full text-left mb-3 animate-fade-in-up ${answers[currentQuestion.id] === option.key ? 'selected' : ''}`}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      borderRadius: borderRadii[index],
                      padding: paddings[index],
                      marginLeft: index % 2 === 0 ? '0' : '20px',
                    }}
                  >
                    <span
                      className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded"
                      style={{
                        background: answers[currentQuestion.id] === option.key ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: answers[currentQuestion.id] === option.key ? 'var(--bg-primary)' : 'var(--text-secondary)'
                      }}
                    >
                      {option.key}
                    </span>
                    <span className="text-sm" style={{ fontFamily: "'Ma Shan Zheng', cursive", color: 'var(--text-secondary)' }}>
                      {option.text}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* 底部提示 */}
            <div className="mt-8 flex items-center justify-end gap-4">
              {progress > 0 && (
                <button
                  onClick={() => router.back()}
                  className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                >
                  退出测试
                </button>
              )}
            </div>
          </div>
        )}

        {/* 结果阶段 */}
        {!loading && phase === 'result' && personality && card && (
          <div className="animate-fade-in-up">
            {/* 结果标题 */}
            <div className="mb-8 ml-2">
              <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                你的老板人格是：
              </h2>
              <div className="text-4xl font-bold mt-2" style={{ color: 'var(--accent-primary)' }}>
                {personality.name}
              </div>
              <p className="text-sm opacity-60 mt-2 ml-4" style={{ color: 'var(--text-secondary)' }}>
                {personality.title}
              </p>
            </div>

            {/* 神兽展示 */}
            <div className="flex items-start gap-6 mb-8 ml-4">
              <div className="bronze-glow">
                <div className="text-6xl animate-breathe">{card.emoji}</div>
              </div>
              <div className="flex-1">
                <p className="text-sm leading-loose" style={{ fontFamily: "'Ma Shan Zheng', cursive", color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  "{card.slogan}"
                </p>
              </div>
            </div>

            {/* 三个分析卡片 - 错落布局 */}
            <div className="space-y-0">
              {/* 卡片1 - 最高 */}
              <div
                className="sbti-card p-5 mb-0 animate-fade-in-up"
                style={{
                  width: '300px',
                  borderRadius: '4px',
                  marginLeft: '2%'
                }}
              >
                <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>
                  性格特点
                </h3>
                <p className="text-xs" style={{ fontFamily: "'Ma Shan Zheng', cursive", color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {card.good_for}
                </p>
              </div>

              {/* 卡片2 - 中间 */}
              <div
                className="sbti-card p-5 mt-4 animate-fade-in-up delay-200"
                style={{
                  width: '320px',
                  borderRadius: '7px',
                  marginLeft: '15%'
                }}
              >
                <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>
                  职场表现
                </h3>
                <p className="text-xs" style={{ fontFamily: "'Ma Shan Zheng', cursive", color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {card.avoid}
                </p>
              </div>

              {/* 卡片3 - 最低 */}
              <div
                className="sbti-card p-5 mt-4 animate-fade-in-up delay-400"
                style={{
                  width: '280px',
                  borderRadius: '11px',
                  marginLeft: '28%'
                }}
              >
                <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>
                  相处建议
                </h3>
                <div className="flex flex-wrap gap-2">
                  {card.tags.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                      {tag.icon} {tag.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 分享卡片 */}
            <div className="sbti-card p-6 mt-8 ml-4" style={{ maxWidth: '340px' }}>
              <div className="text-center mb-4">
                {shareStatus?.unlocked ? (
                  <div className="flex flex-col items-center gap-2">
                    <Unlock className="w-10 h-10" style={{ color: 'var(--accent-primary)' }} />
                    <p className="font-medium" style={{ color: 'var(--accent-primary)' }}>
                      报告已解锁
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Lock className="w-10 h-10 opacity-40" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm opacity-60">
                      分享解锁报告（还差{shareStatus?.remaining || 10}次）
                    </p>
                    <div className="w-full h-1 rounded-full mt-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${((shareStatus?.opens || 0) / 10) * 100}%`, background: 'var(--accent-primary)' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 分享按钮 */}
              <div className="space-y-2">
                {(['吐槽风', '励志风', '商务风'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => copyShareText(style)}
                    className="w-full text-left px-4 py-2 text-sm rounded transition-all hover:translate-x-1"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      borderRadius: ['4px', '7px', '11px'][['吐槽风', '励志风', '商务风'].indexOf(style)]
                    }}
                  >
                    {copied ? <CheckCircle2 className="inline w-4 h-4 mr-2" /> : <Copy className="inline w-4 h-4 mr-2" />}
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* 底部操作 */}
            <div className="mt-8 flex items-center justify-between ml-4 mr-4">
              <button
                onClick={() => window.location.reload()}
                className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-muted)' }}
              >
                重新测试
              </button>

              {shareStatus?.unlocked && (
                <button
                  onClick={() => router.push(`/${lang}/sbti/report/${sessionId}`)}
                  className="btn-rect px-6 py-2 text-sm"
                  style={{ borderRadius: '0' }}
                >
                  查看完整报告
                </button>
              )}
            </div>

            <p className="text-center text-xs opacity-40 mt-6" style={{ color: 'var(--text-muted)' }}>
              测试结果仅供娱乐，请勿当真
            </p>
          </div>
        )}
      </main>

      {/* 右下角八卦装饰 */}
      <div className="fixed bottom-8 right-8 opacity-20 animate-spin-slow text-2xl" style={{ color: 'var(--accent-primary)' }}>
        ☯
      </div>
    </div>
  )
}

/* 甲骨文碎片装饰组件 */
function OracleBones() {
  const bones = ['鼎', '甲骨', '篆', '玊', '亼', '朮', '氵', '炓', '硎', '餮']
  return (
    <>
      {bones.map((char, i) => (
        <div
          key={i}
          className="oracle-bone text-xl"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            transform: `rotate(${Math.random() * 360}deg) scale(${0.8 + Math.random() * 0.8})`,
            fontSize: `${12 + Math.random() * 20}px`,
            opacity: 0.02 + Math.random() * 0.02
          }}
        >
          {char}
        </div>
      ))}
    </>
  )
}
