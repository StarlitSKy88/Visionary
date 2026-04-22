'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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
  const [questionEntering, setQuestionEntering] = useState(false)

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

    setQuestionVisible(false)
    setQuestionEntering(true)

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
          setQuestionEntering(false)
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
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0a1210' }}>
      {/* 噪点纹理背景 */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        opacity: 0.05
      }} />

      {/* 暗角效果 */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)'
      }} />

      {/* 左上角篆体印章 */}
      <div className="absolute z-20" style={{ left: '60px', top: '60px' }}>
        <div className="seal" style={{ fontSize: '16px', opacity: 0.3, color: '#14b8a6' }}>山</div>
      </div>

      {/* 右上角链接 */}
      <div className="absolute z-20 flex gap-6" style={{ right: '60px', top: '60px' }}>
        <span className="text-xs opacity-30" style={{ color: '#64748b', fontSize: '11px', cursor: 'pointer' }} onClick={() => router.push('/zh/privacy')}>
          隐私政策
        </span>
        <span className="text-xs opacity-30" style={{ color: '#64748b', fontSize: '11px', cursor: 'pointer' }} onClick={() => router.push('/zh/terms')}>
          用户协议
        </span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20" style={{ padding: '20px 80px' }}>
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: '13px',
            cursor: 'pointer',
            opacity: 0.6
          }}
        >
          ← 返回
        </button>

        {/* 进度条 - 精确坐标(80, 60), 800px宽 */}
        <div className="flex items-center gap-3" style={{ marginTop: '20px' }}>
          <span className="seal" style={{ fontSize: '12px', opacity: 0.3, color: '#14b8a6' }}>卷</span>
          <div style={{
            flex: 1,
            maxWidth: '800px',
            height: '2px',
            backgroundColor: 'rgba(0,0,0,0.27)',
            position: 'relative'
          }}>
            <div
              style={{
                width: `${(progress / totalQuestions) * 100}%`,
                height: '100%',
                backgroundColor: '#14b8a6',
                transition: 'width 0.3s ease-out'
              }}
            />
          </div>
          <span style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '13px',
            opacity: 0.6,
            color: '#cbd5e1',
            letterSpacing: '0.5px'
          }}>
            第 {progress} / {totalQuestions} 题
          </span>
        </div>
      </header>

      <main className="relative z-20" style={{ padding: '0 320px' }}>
        {/* 加载状态 */}
        {loading && !currentQuestion && !error && (
          <div className="flex flex-col items-center justify-center" style={{ paddingTop: '200px' }}>
            <div className="animate-breathe" style={{ fontSize: '80px' }}>🐉</div>
            <p style={{
              marginTop: '24px',
              fontSize: '14px',
              opacity: 0.6,
              color: '#64748b'
            }}>
              正在加载题目...
            </p>
          </div>
        )}

        {error && (
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(0,0,0,0.27)',
            borderRadius: '4px',
            border: '1px solid #dc2626'
          }}>
            <p style={{ fontSize: '14px', color: '#dc2626' }}>{error}</p>
          </div>
        )}

        {/* 测试阶段 - 题目和选项 */}
        {!loading && phase === 'test' && currentQuestion && (
          <div
            className="transition-all duration-300"
            style={{
              opacity: questionVisible ? 1 : 0,
              transform: questionVisible ? 'translateY(0)' : 'translateY(-20px)'
            }}
          >
            {/* 题目 - 精确坐标(320, 180) */}
            <div style={{ maxWidth: '800px', letterSpacing: '0.5px' }}>
              <h2 style={{
                fontFamily: "'Noto Serif SC', serif",
                fontWeight: '700',
                fontSize: '24px',
                color: '#f8fafc',
                lineHeight: 1.7,
                letterSpacing: '0.5px'
              }}>
                {currentQuestion.question}
              </h2>

              {/* 青铜分隔线 - 题目宽度80% */}
              <div style={{
                width: '80%',
                height: '1px',
                backgroundColor: '#14b8a6',
                marginTop: '16px'
              }} />
            </div>

            {/* 四个选项 - 精确坐标 */}
            <div className="space-y-0" style={{ marginTop: '40px', maxWidth: '600px' }}>
              {currentQuestion.options.map((option, index) => {
                const borderRadii = ['4px', '7px', '11px', '7px']
                const paddings = ['13px', '15px', '17px', '15px']
                const positions = [
                  { left: '0px', top: '0px' },
                  { left: '40px', top: '70px' },
                  { left: '0px', top: '140px' },
                  { left: '40px', top: '210px' }
                ]
                const isSelected = answers[currentQuestion.id] === option.key
                return (
                  <button
                    key={option.key}
                    onClick={() => handleAnswer(currentQuestion.id, option.key)}
                    style={{
                      position: 'absolute',
                      left: positions[index].left,
                      top: positions[index].top,
                      width: '600px',
                      height: '50px',
                      backgroundColor: isSelected ? 'rgba(0,0,0,0.36)' : 'rgba(0,0,0,0.27)',
                      border: isSelected ? '2px solid #14b8a6' : 'none',
                      borderRadius: borderRadii[index],
                      padding: paddings[index],
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.15s ease-out',
                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
                      letterSpacing: '0.5px'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        backgroundColor: isSelected ? '#14b8a6' : 'rgba(0,0,0,0.27)',
                        color: isSelected ? '#0a1210' : '#cbd5e1'
                      }}
                    >
                      {option.key}
                    </span>
                    <span style={{
                      fontSize: '15px',
                      fontFamily: "'Ma Shan Zheng', cursive",
                      color: '#f8fafc'
                    }}>
                      {option.text}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center" style={{ marginTop: '280px', justifyContent: 'space-between', maxWidth: '600px' }}>
              <button
                onClick={() => router.back()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '13px',
                  cursor: 'pointer',
                  opacity: 0.6
                }}
              >
                退出测试
              </button>

              {progress > 0 && (
                <button
                  style={{
                    width: '180px',
                    height: '50px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '16px',
                    border: 'none',
                    borderRadius: '0',
                    cursor: 'pointer',
                    letterSpacing: '0.5px'
                  }}
                >
                  下一题
                </button>
              )}
            </div>
          </div>
        )}

        {/* 结果阶段 */}
        {!loading && phase === 'result' && personality && card && (
          <div className="animate-fade-in-up">
            {/* 结果标题 */}
            <div style={{ marginBottom: '32px', letterSpacing: '0.5px' }}>
              <h2 style={{
                fontFamily: "'Noto Serif SC', serif",
                fontWeight: '700',
                fontSize: '32px',
                color: '#f8fafc'
              }}>
                你的老板人格是：
              </h2>
              <div style={{
                fontSize: '36px',
                fontWeight: '700',
                marginTop: '8px',
                color: '#14b8a6'
              }}>
                {personality.name}
              </div>
              <p style={{
                fontSize: '14px',
                opacity: 0.6,
                marginTop: '8px',
                marginLeft: '16px',
                color: '#cbd5e1'
              }}>
                {personality.title}
              </p>
            </div>

            {/* 神兽展示 */}
            <div className="flex items-start gap-6" style={{ marginBottom: '32px' }}>
              <div style={{
                position: 'relative'
              }}>
                <div style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }} />
                <div className="animate-breathe" style={{ fontSize: '64px', position: 'relative', zIndex: 1 }}>{card.emoji}</div>
              </div>
              <div className="flex-1">
                <p style={{
                  fontFamily: "'Ma Shan Zheng', cursive",
                  fontSize: '14px',
                  color: '#cbd5e1',
                  lineHeight: 1.8,
                  letterSpacing: '0.5px'
                }}>
                  "{card.slogan}"
                </p>
              </div>
            </div>

            {/* 三个分析卡片 - 错落布局 */}
            <div className="space-y-0">
              {/* 卡片1 */}
              <div
                style={{
                  width: '300px',
                  backgroundColor: 'rgba(0,0,0,0.27)',
                  borderRadius: '4px',
                  padding: '20px',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
                  marginLeft: '16px',
                  letterSpacing: '0.5px'
                }}
              >
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#14b8a6'
                }}>
                  性格特点
                </h3>
                <p style={{
                  fontFamily: "'Ma Shan Zheng', cursive",
                  fontSize: '13px',
                  color: '#cbd5e1',
                  lineHeight: 1.7
                }}>
                  {card.good_for}
                </p>
              </div>

              {/* 卡片2 */}
              <div
                style={{
                  width: '320px',
                  backgroundColor: 'rgba(0,0,0,0.27)',
                  borderRadius: '7px',
                  padding: '20px',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
                  marginTop: '16px',
                  marginLeft: '120px',
                  letterSpacing: '0.5px'
                }}
              >
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#14b8a6'
                }}>
                  职场表现
                </h3>
                <p style={{
                  fontFamily: "'Ma Shan Zheng', cursive",
                  fontSize: '13px',
                  color: '#cbd5e1',
                  lineHeight: 1.7
                }}>
                  {card.avoid}
                </p>
              </div>

              {/* 卡片3 */}
              <div
                style={{
                  width: '280px',
                  backgroundColor: 'rgba(0,0,0,0.27)',
                  borderRadius: '11px',
                  padding: '20px',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
                  marginTop: '16px',
                  marginLeft: '224px',
                  letterSpacing: '0.5px'
                }}
              >
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#14b8a6'
                }}>
                  相处建议
                </h3>
                <div className="flex flex-wrap gap-2">
                  {card.tags.map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(0,0,0,0.27)',
                        color: '#64748b'
                      }}
                    >
                      {tag.icon} {tag.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 分享卡片 */}
            <div style={{
              maxWidth: '340px',
              backgroundColor: 'rgba(0,0,0,0.27)',
              borderRadius: '7px',
              padding: '24px',
              marginTop: '32px',
              marginLeft: '16px',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)'
            }}>
              <div className="text-center mb-4">
                {shareStatus?.unlocked ? (
                  <div className="flex flex-col items-center gap-2">
                    <div style={{ fontSize: '40px' }}>🔓</div>
                    <p style={{ fontWeight: '600', color: '#14b8a6' }}>
                      报告已解锁
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div style={{ fontSize: '40px', opacity: 0.4 }}>🔒</div>
                    <p style={{ fontSize: '14px', opacity: 0.6 }}>
                      分享解锁报告（还差{shareStatus?.remaining || 10}次）
                    </p>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '2px',
                      backgroundColor: 'rgba(0,0,0,0.27)',
                      marginTop: '8px'
                    }}>
                      <div
                        style={{
                          width: `${((shareStatus?.opens || 0) / 10) * 100}%`,
                          height: '100%',
                          borderRadius: '2px',
                          backgroundColor: '#14b8a6',
                          transition: 'width 0.3s ease-out'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 分享按钮 */}
              <div className="space-y-2">
                {(['吐槽风', '励志风', '商务风'] as const).map((style, idx) => (
                  <button
                    key={style}
                    onClick={() => copyShareText(style)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: 'rgba(0,0,0,0.27)',
                      color: '#cbd5e1',
                      border: 'none',
                      borderRadius: ['4px', '7px', '11px'][idx],
                      cursor: 'pointer',
                      transition: 'all 0.15s ease-out',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {copied ? '✓ ' : '📋 '}{style}
                  </button>
                ))}
              </div>
            </div>

            {/* 底部操作 */}
            <div className="flex items-center justify-between" style={{ marginTop: '32px', maxWidth: '340px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '13px',
                  cursor: 'pointer',
                  opacity: 0.6
                }}
              >
                重新测试
              </button>

              {shareStatus?.unlocked && (
                <button
                  onClick={() => router.push(`/${lang}/sbti/report/${sessionId}`)}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '14px',
                    border: 'none',
                    borderRadius: '0',
                    cursor: 'pointer',
                    letterSpacing: '0.5px'
                  }}
                >
                  查看完整报告
                </button>
              )}
            </div>

            <p style={{
              textAlign: 'center',
              fontSize: '12px',
              opacity: 0.4,
              marginTop: '24px',
              color: '#64748b'
            }}>
              测试结果仅供娱乐，请勿当真
            </p>
          </div>
        )}
      </main>

      {/* 右下角八卦装饰 */}
      <div
        className="fixed animate-spin-slow"
        style={{
          bottom: '32px',
          right: '32px',
          opacity: 0.2,
          color: '#14b8a6',
          fontSize: '24px'
        }}
      >
        ☯
      </div>
    </div>
  )
}
