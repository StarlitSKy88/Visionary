'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge, Spinner } from '@/components/ui/misc'
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

/**
 * 获取设备 ID（如果不存在则生成并存储）
 */
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
  const lang = 'zh' // TODO: 从路由获取
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
  const [loading, setLoading] = useState(true) // 初始为 true，显示加载状态
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'test' | 'result'>('test')
  const [copied, setCopied] = useState(false)

  // 获取人格专属颜色
  const personalityColors = personality ? getPersonalityColors(personality.id) : null
  const isSecret = personality ? isSecretPersonality(personality.id) : false

  const refCode = searchParams.get('ref')

  // 初始化（无需登录）
  useEffect(() => {
    // 如果有 ref 参数，记录分享打开
    if (refCode) {
      recordShareOpen(refCode)
    }

    // 开始 SBTI 测试（使用设备 ID）
    const deviceId = getDeviceId()
    startTest(deviceId)
  }, [refCode])

  // 定期检查分享状态
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      setError(lang === 'en' ? 'Failed to start. Please try again.' : '启动失败，请重试')
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

    // 如果不是最后一题，获取下一题
    if (questionId < totalQuestions) {
      setLoading(true)
      try {
        const res = await fetch('/api/sbti/answer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId, questionId, answer: answerKey }),
        })

        if (!res.ok) throw new Error('Failed to submit answer')

        const data = await res.json()

        if (data.completed) {
          // 测试完成，获取结果
          await completeTest()
        } else {
          setCurrentQuestionId(data.currentQuestion)
          setQuestions(prev => [...prev, data.question])
        }
      } catch (err) {
        setError(lang === 'en' ? 'Failed to submit. Please try again.' : '提交失败，请重试')
      } finally {
        setLoading(false)
      }
    } else {
      // 最后一题，直接完成
      await completeTest()
    }
  }

  const completeTest = async () => {
    if (!sessionId) return

    setLoading(true)
    try {
      const res = await fetch('/api/sbti/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      setError(lang === 'en' ? 'Failed to complete. Please try again.' : '完成失败，请重试')
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur border-b" style={{ backgroundColor: 'rgba(var(--bg-elevated), 0.8)', borderColor: 'var(--border)' }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full transition-colors"
            style={{ hover: { backgroundColor: 'var(--bg-secondary)' } }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
          </button>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {lang === 'en' ? 'SBTI Test' : '山海经老板测试'}
          </h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full transition-colors"
            style={{ hover: { backgroundColor: 'var(--bg-secondary)' } }}
          >
            {mounted && (theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* 初始加载状态 */}
        {loading && !currentQuestion && !error && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner className="w-8 h-8" />
            <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>
              {lang === 'en' ? 'Loading...' : '正在启动测试...'}
            </p>
          </div>
        )}

        {error && (
          <div className="sbti-card p-4 mb-6" style={{ borderColor: 'var(--accent-danger)' }}>
            <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
          </div>
        )}

        {!loading && phase === 'test' && currentQuestion && (
          <>
            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span>{progress} / {totalQuestions}</span>
                <span>{Math.round((progress / totalQuestions) * 100)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(progress / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="sbti-card p-6 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="sbti-option-key" style={{ background: 'var(--accent-gold)', color: 'var(--bg-primary)' }}>
                  <span style={{ fontWeight: 700 }}>{currentQuestion.id}</span>
                </div>
                <p className="text-lg font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {currentQuestion.question}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => handleAnswer(currentQuestion.id, option.key)}
                    className={`sbti-option ${answers[currentQuestion.id] === option.key ? 'selected' : ''}`}
                  >
                    <div className="sbti-option-key">
                      <span>{option.key}</span>
                    </div>
                    <span className="sbti-option-text">{option.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation hint */}
            <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <ChevronRight className="w-4 h-4" />
              <span>{lang === 'en' ? 'Tap to continue' : '点击选项继续'}</span>
            </div>
          </>
        )}

        {!loading && phase === 'result' && personality && card && (
          <>
            {/* Result Card */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">{card.emoji}</div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {personality.name}
              </h2>
              <p className="text-lg font-medium personality-name">
                {personality.title}
              </p>
            </div>

            {/* Slogan */}
            <div className="sbti-card p-6 mb-6 personality-accent" style={{ '--card-accent': personalityColors?.primary } as React.CSSProperties}>
              <p className="text-xl leading-relaxed text-center font-classic" style={{ color: 'var(--text-primary)' }}>
                "{card.slogan}"
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {card.tags.map((tag, i) => (
                <span key={i} className="sbti-tag">
                  {tag.icon} {tag.text}
                </span>
              ))}
            </div>

            {/* Money Score */}
            <div className="sbti-card p-4 mb-6">
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>
                  {lang === 'en' ? 'Money-making Potential' : '赚钱潜力'}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className="text-xl"
                      style={{ color: star <= card.money_score ? 'var(--accent-gold)' : 'var(--border)' }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Share Status */}
            <div className="sbti-card p-6 mb-6">
              <div className="text-center mb-4">
                {shareStatus?.unlocked ? (
                  <div className="flex flex-col items-center gap-2">
                    <Unlock className="w-12 h-12" style={{ color: 'var(--accent-success)' }} />
                    <p className="font-medium" style={{ color: 'var(--accent-success)' }}>
                      {lang === 'en' ? 'Report Unlocked!' : '报告已解锁！'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Lock className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>
                      {lang === 'en'
                        ? `Share to unlock report (${shareStatus?.remaining || 10} more)`
                        : `分享解锁报告（还差${shareStatus?.remaining || 10}次）`
                      }
                    </p>
                    <div className="w-full h-2 rounded-full mt-2" style={{ background: 'var(--bg-secondary)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${((shareStatus?.opens || 0) / 10) * 100}%`, background: 'var(--accent-success)' }}
                      />
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {shareStatus?.opens || 0} / 10 {lang === 'en' ? 'shares' : '次分享'}
                    </p>
                  </div>
                )}
              </div>

              {/* Share Buttons */}
              <div className="space-y-3">
                {(['吐槽风', '励志风', '商务风'] as const).map((style) => (
                  <Button
                    key={style}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => copyShareText(style)}
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 mr-2" style={{ color: 'var(--accent-success)' }} />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {style}
                  </Button>
                ))}
              </div>

              {/* Share Link */}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                  {lang === 'en' ? 'Or share this link:' : '或分享链接：'}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm rounded-lg border"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-success)' }} /> : <Share2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Generate Report Button */}
            {shareStatus?.unlocked && (
              <Button
                className="w-full"
                size="lg"
                onClick={() => router.push(`/${lang}/sbti/report/${sessionId}`)}
                style={{ background: 'var(--accent-primary)', color: 'white' }}
              >
                {lang === 'en' ? 'View Full Report' : '查看完整报告'}
              </Button>
            )}

            {/* Pay to Unlock */}
            {!shareStatus?.unlocked && (
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}
              >
                {lang === 'en' ? 'Pay ¥99 to Unlock' : '付费 ¥99 解锁报告'}
              </Button>
            )}
          </>
        )}
      </main>
    </div>
  )
}
