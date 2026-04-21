'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge, Spinner } from '@/components/ui/misc'
import { ArrowLeft, Share2, Copy, CheckCircle2, Lock, Unlock, ChevronRight } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">
            {lang === 'en' ? 'SBTI Test' : '山海经老板测试'}
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* 初始加载状态 */}
        {loading && !currentQuestion && !error && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner className="w-8 h-8" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              {lang === 'en' ? 'Loading...' : '正在启动测试...'}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && phase === 'test' && currentQuestion && (
          <>
            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
                <span>{progress} / {totalQuestions}</span>
                <span>{Math.round((progress / totalQuestions) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${(progress / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <Card className="p-6 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {currentQuestion.id}
                  </span>
                </div>
                <p className="text-lg font-medium leading-relaxed">
                  {currentQuestion.question}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => handleAnswer(currentQuestion.id, option.key)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all
                      ${answers[currentQuestion.id] === option.key
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600'
                      }
                      ${loading ? 'opacity-50 pointer-events-none' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                        ${answers[currentQuestion.id] === option.key
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800'
                        }
                      `}>
                        <span className="text-sm font-medium">{option.key}</span>
                      </div>
                      <span className="text-base">{option.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Navigation hint */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
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
              <h2 className="text-2xl font-bold mb-2">
                {personality.name}
              </h2>
              <p className="text-lg text-amber-600 dark:text-amber-400 font-medium">
                {personality.title}
              </p>
            </div>

            {/* Slogan */}
            <Card className="p-6 mb-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
              <p className="text-xl leading-relaxed text-center font-medium">
                "{card.slogan}"
              </p>
            </Card>

            {/* Tags */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {card.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="px-3 py-1">
                  {tag.icon} {tag.text}
                </Badge>
              ))}
            </div>

            {/* Money Score */}
            <Card className="p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  {lang === 'en' ? 'Money-making Potential' : '赚钱潜力'}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-xl ${star <= card.money_score ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            {/* Share Status */}
            <Card className="p-6 mb-6">
              <div className="text-center mb-4">
                {shareStatus?.unlocked ? (
                  <div className="flex flex-col items-center gap-2">
                    <Unlock className="w-12 h-12 text-green-500" />
                    <p className="text-green-600 dark:text-green-400 font-medium">
                      {lang === 'en' ? 'Report Unlocked!' : '报告已解锁！'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Lock className="w-12 h-12 text-slate-400" />
                    <p className="text-slate-600 dark:text-slate-400">
                      {lang === 'en'
                        ? `Share to unlock report (${shareStatus?.remaining || 10} more)`
                        : `分享解锁报告（还差${shareStatus?.remaining || 10}次）`
                      }
                    </p>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-2">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${((shareStatus?.opens || 0) / 10) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-500">
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
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {style}
                  </Button>
                ))}
              </div>

              {/* Share Link */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-slate-500 mb-2">
                  {lang === 'en' ? 'Or share this link:' : '或分享链接：'}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg border"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Generate Report Button */}
            {shareStatus?.unlocked && (
              <Button
                className="w-full"
                size="lg"
                onClick={() => router.push(`/${lang}/sbti/report/${sessionId}`)}
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
