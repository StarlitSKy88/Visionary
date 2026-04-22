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
      {/* === 强化噪点纹理背景 - 更强参数 === */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='7' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        opacity: 0.22
      }} />

      {/* === 古旧褪色叠加层 === */}
      <div className="fixed inset-0 pointer-events-none z-[5]" style={{
        background: `
          radial-gradient(ellipse at 20% 15%, rgba(180,83,9,0.06) 0%, transparent 30%),
          radial-gradient(ellipse at 80% 80%, rgba(153,27,27,0.05) 0%, transparent 35%),
          radial-gradient(ellipse at 50% 50%, rgba(120,53,15,0.03) 0%, transparent 40%)
        `
      }} />

      {/* === 极端暗角效果 === */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{
        background: 'radial-gradient(ellipse at center, transparent 10%, rgba(0,0,0,0.85) 100%)'
      }} />

      {/* === 左上角篆体印章 - 更歪+铜钉装饰 === */}
      <div className="absolute z-20" style={{
        left: '38px',
        top: '48px',
        transform: 'rotate(-8deg)'
      }}>
        {/* 墨迹晕染 */}
        <div style={{
          position: 'absolute',
          left: '-10px',
          top: '-10px',
          right: '-10px',
          bottom: '-10px',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(180,83,9,0.18) 0%, transparent 70%)',
          filter: 'blur(4px)'
        }} />
        {/* 铜钉装饰 - 左 */}
        <div style={{
          position: 'absolute',
          left: '-8px',
          top: '2px',
          width: '6px',
          height: '6px',
          borderRadius: '45% 55% 50% 50%',
          backgroundColor: '#92400e',
          boxShadow: '1px 2px 3px rgba(0,0,0,0.5), inset 0 0 2px rgba(255,200,150,0.3), 0 0 4px rgba(180,83,9,0.3)',
          transform: 'rotate(12deg)'
        }} />
        {/* 铜钉装饰 - 右 */}
        <div style={{
          position: 'absolute',
          right: '-8px',
          bottom: '2px',
          width: '5px',
          height: '5px',
          borderRadius: '55% 45% 50% 50%',
          backgroundColor: '#78350f',
          boxShadow: '1px 1px 2px rgba(0,0,0,0.5), inset 0 0 2px rgba(255,200,150,0.2)'
        }} />
        <div style={{
          fontSize: '22px',
          opacity: 0.55,
          color: '#b45309',
          textShadow: '2px 2px 4px rgba(0,0,0,0.4), 0 0 15px rgba(180,83,9,0.3)',
          fontFamily: "'Noto Serif SC', serif",
          letterSpacing: '6px'
        }}>山海</div>
        {/* 额外墨点 */}
        <div style={{ position: 'absolute', left: '-15px', top: '20px', fontSize: '2px', color: '#92400e', opacity: 0.4, transform: 'rotate(-15deg)' }}>·</div>
      </div>

      {/* === 右上角链接 - 褪色墨迹 === */}
      <div className="absolute z-20" style={{
        right: '48px',
        top: '44px',
        transform: 'rotate(2.5deg)'
      }}>
        <span
          className="cursor-pointer"
          style={{
            color: '#78716c',
            fontSize: '7px',
            letterSpacing: '3px',
            opacity: 0.45
          }}
          onClick={() => router.push('/zh/privacy')}
        >
          隐私
        </span>
        <span style={{ color: '#78716c', fontSize: '7px', opacity: 0.2, margin: '0 8px' }}>·</span>
        <span
          className="cursor-pointer"
          style={{
            color: '#78716c',
            fontSize: '7px',
            letterSpacing: '3px',
            opacity: 0.45
          }}
          onClick={() => router.push('/zh/terms')}
        >
          协议
        </span>
      </div>

      {/* === 左侧墨点装饰 - 更多更密更随意 === */}
      <div className="fixed left-4 top-36 z-20" style={{ fontSize: '6px', color: '#b45309', opacity: 0.25 }}>
        ···　·　··　·　···　·　···
      </div>
      <div className="fixed left-12 top-64 z-20" style={{ fontSize: '4px', color: '#b45309', opacity: 0.2 }}>
        ·　··　···　·　··　·　···
      </div>
      <div className="fixed left-6 top-96 z-20" style={{ fontSize: '5px', color: '#b45309', opacity: 0.18 }}>
        ···　·　·　··　·　··　·　···
      </div>
      <div className="fixed left-16 top-1/2 z-20" style={{ fontSize: '4px', color: '#b45309', opacity: 0.22 }}>
        ·　·　··　·　···　·　··　·　···
      </div>
      {/* 随机散落墨点 */}
      <div className="fixed left-3 top-44 z-20" style={{ fontSize: '2px', color: '#78350f', opacity: 0.15, transform: 'rotate(25deg)' }}>·</div>
      <div className="fixed left-18 top-80 z-20" style={{ fontSize: '3px', color: '#92400e', opacity: 0.12 }}>·</div>
      <div className="fixed left-8 top-140 z-20" style={{ fontSize: '2px', color: '#78350f', opacity: 0.1, transform: 'rotate(-12deg)' }}>·</div>
      <div className="fixed left-14 top-180 z-20" style={{ fontSize: '2px', color: '#92400e', opacity: 0.08 }}>·</div>

      {/* === 右上角墨点 === */}
      <div className="fixed right-16 top-32 z-20" style={{ fontSize: '5px', color: '#b45309', opacity: 0.2 }}>
        ···　·　··　·　···　·　···
      </div>
      <div className="fixed right-8 top-56 z-20" style={{ fontSize: '4px', color: '#b45309', opacity: 0.18 }}>
        ·　··　···　·　··　·　···
      </div>
      {/* 随机散落 */}
      <div className="fixed right-20 top-44 z-20" style={{ fontSize: '2px', color: '#78350f', opacity: 0.12, transform: 'rotate(-20deg)' }}>·</div>
      <div className="fixed right-6 top-72 z-20" style={{ fontSize: '3px', color: '#92400e', opacity: 0.1 }}>·</div>

      {/* === 左上角破损暗示 === */}
      <div className="fixed left-0 top-0 z-30" style={{
        width: '60px',
        height: '40px',
        opacity: 0.18,
        background: 'linear-gradient(135deg, transparent 30%, #0a1210 30%, #0a1210 50%, transparent 50%)'
      }} />
      <div className="fixed left-50px top-0 z-30" style={{
        width: '30px',
        height: '25px',
        opacity: 0.1,
        background: 'linear-gradient(160deg, transparent 40%, #0a1210 40%)'
      }} />

      {/* === 右下角破损暗示 === */}
      <div className="fixed right-0 bottom-0 z-30" style={{
        width: '80px',
        height: '60px',
        opacity: 0.14,
        background: 'linear-gradient(315deg, transparent 40%, #0a1210 40%, #0a1210 60%, transparent 60%)'
      }} />
      <div className="fixed right-60px bottom-0 z-30" style={{
        width: '40px',
        height: '35px',
        opacity: 0.08,
        background: 'linear-gradient(330deg, transparent 45%, #0a1210 45%)'
      }} />

      {/* Header */}
      <header className="sticky top-0 z-20" style={{ padding: '18px 70px' }}>
        {/* 返回按钮 - 更歪 */}
        <button
          onClick={() => router.back()}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#78716c',
            fontSize: '11px',
            cursor: 'pointer',
            opacity: 0.5,
            letterSpacing: '1px',
            transform: 'rotate(-2deg)'
          }}
        >
          ← 返回
        </button>

        {/* 进度条 - 更歪斜 */}
        <div className="flex items-center gap-3" style={{
          marginTop: '18px',
          transform: 'rotate(0.5deg)'
        }}>
          <span style={{
            fontSize: '11px',
            opacity: 0.4,
            color: '#b45309',
            letterSpacing: '2px',
            fontFamily: "'Ma Shan Zheng', cursive",
            transform: 'rotate(-8deg)',
            display: 'inline-block'
          }}>卷</span>
          <div style={{
            flex: 1,
            maxWidth: '700px',
            height: '3px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            position: 'relative',
            borderRadius: '1px',
            transform: 'skewX(-3deg)'
          }}>
            <div
              style={{
                width: `${(progress / totalQuestions) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #991b1b, #dc2626)',
                transition: 'width 0.4s ease-out',
                borderRadius: '1px',
                transform: 'skewX(3deg)'
              }}
            />
          </div>
          <span style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '11px',
            opacity: 0.55,
            color: '#a8a29e',
            letterSpacing: '1px',
            transform: 'rotate(0.8deg)'
          }}>
            {progress} / {totalQuestions}
          </span>
        </div>
      </header>

      <main className="relative z-20" style={{ padding: '0 24px' }}>
        {/* 加载状态 */}
        {loading && !currentQuestion && !error && (
          <div style={{
            paddingTop: '180px',
            transform: 'rotate(-0.8deg)'
          }}>
            {/* 龙图腾代替emoji - 手写风格 */}
            <div style={{
              fontFamily: "'Ma Shan Zheng', cursive",
              fontSize: '72px',
              color: '#dc2626',
              textShadow: '4px 4px 0 rgba(0,0,0,0.4), 0 0 20px rgba(220,38,38,0.4)',
              transform: 'rotate(-8deg)',
              display: 'inline-block',
              filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.4))'
            }}>龍</div>
            {/* 裂痕 */}
            <div style={{
              fontSize: '14px',
              color: '#78350f',
              opacity: 0.5,
              transform: 'rotate(15deg)',
              display: 'inline-block',
              marginLeft: '8px'
            }}>〰</div>
            <p style={{
              marginTop: '20px',
              fontSize: '12px',
              opacity: 0.5,
              color: '#78716c',
              letterSpacing: '3px',
              fontFamily: "'Noto Serif SC', serif"
            }}>
              正在加载题目...
            </p>
          </div>
        )}

        {error && (
          <div style={{
            padding: '14px',
            backgroundColor: 'rgba(0,0,0,0.35)',
            borderRadius: '3px',
            border: '1px solid #991b1b',
            borderLeft: '4px solid #dc2626',
            transform: 'rotate(-0.8deg)'
          }}>
            <p style={{ fontSize: '13px', color: '#dc2626' }}>{error}</p>
          </div>
        )}

        {/* 测试阶段 - 题目和选项 */}
        {!loading && phase === 'test' && currentQuestion && (
          <div
            style={{
              opacity: questionVisible ? 1 : 0,
              transition: 'opacity 0.3s ease-out',
              transform: questionVisible ? 'rotate(0deg)' : 'rotate(-1.5deg)'
            }}
          >
            {/* 题目 - 非对称布局 - 更歪 */}
            <div style={{
              maxWidth: '700px',
              letterSpacing: '1px',
              transform: 'rotate(-2deg)',
              marginLeft: '8px',
              position: 'relative'
            }}>
              {/* 墨迹背景 */}
              <div style={{
                position: 'absolute',
                left: '-10px',
                top: '-8px',
                right: '-5px',
                bottom: '-5px',
                background: 'radial-gradient(ellipse at 30% 50%, rgba(180,83,9,0.04) 0%, transparent 60%)',
                filter: 'blur(4px)',
                transform: 'rotate(-0.5deg)'
              }} />
              <h2 style={{
                fontFamily: "'Noto Serif SC', serif",
                fontWeight: '700',
                fontSize: '21px',
                color: '#f8fafc',
                lineHeight: 1.75,
                letterSpacing: '0.5px',
                position: 'relative'
              }}>
                {currentQuestion.question}
              </h2>

              {/* 青铜分隔线 - 更斜更残缺 */}
              <div style={{
                width: '65%',
                height: '1px',
                background: 'linear-gradient(90deg, #b45309 0%, #78350f 50%, transparent 100%)',
                marginTop: '14px',
                transform: 'rotate(-1deg)'
              }} />
              {/* 裂痕装饰 */}
              <div style={{
                position: 'absolute',
                right: '20%',
                top: '30px',
                fontSize: '8px',
                color: '#78350f',
                opacity: 0.4,
                transform: 'rotate(10deg)'
              }}>〰</div>
            </div>

            {/* 四个选项 - 极端不对称 */}
            <div style={{ marginTop: '32px', maxWidth: '520px', position: 'relative' }}>
              {/* 背景墨迹 */}
              <div style={{
                position: 'absolute',
                left: '-20px',
                top: '-10px',
                width: '100px',
                height: '80px',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(180,83,9,0.03) 0%, transparent 70%)',
                filter: 'blur(6px)',
                transform: 'rotate(-5deg)'
              }} />
              {currentQuestion.options.map((option, index) => {
                const borderRadii = ['2px', '14px', '4px', '18px']
                const isSelected = answers[currentQuestion.id] === option.key
                const marginLeft = ['0px', '55px', '25px', '85px'][index]
                const rotations = ['-1.2deg', '1.8deg', '-0.5deg', '2.2deg']
                return (
                  <div key={option.key} style={{ position: 'relative' }}>
                    {/* 选项墨迹背景 */}
                    <div style={{
                      position: 'absolute',
                      left: '-8px',
                      top: '-5px',
                      right: '-8px',
                      bottom: '-5px',
                      background: 'radial-gradient(ellipse at 40% 50%, rgba(153,27,27,0.03) 0%, transparent 70%)',
                      filter: 'blur(3px)',
                      opacity: isSelected ? 1 : 0
                    }} />
                    <button
                      onClick={() => handleAnswer(currentQuestion.id, option.key)}
                      style={{
                        width: '100%',
                        minHeight: '52px',
                        backgroundColor: isSelected ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.35)',
                        border: isSelected ? '2px solid #dc2626' : 'none',
                        borderRadius: borderRadii[index],
                        padding: '12px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s ease-out',
                        boxShadow: isSelected
                          ? 'inset 0 2px 12px rgba(0,0,0,0.5), 2px 3px 8px rgba(0,0,0,0.3), 0 0 15px rgba(220,38,38,0.15)'
                          : 'inset 0 2px 8px rgba(0,0,0,0.4)',
                        letterSpacing: '0.5px',
                        marginTop: index === 0 ? 0 : '14px',
                        marginLeft: marginLeft,
                        transform: rotations[index],
                        position: 'relative'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '3px',
                          backgroundColor: isSelected ? '#dc2626' : 'rgba(0,0,0,0.3)',
                          color: isSelected ? '#fff' : '#a8a29e',
                          flexShrink: 0,
                          boxShadow: isSelected ? 'inset 0 1px 0 rgba(255,255,255,0.2)' : 'none'
                        }}
                      >
                        {option.key}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontFamily: "'Ma Shan Zheng', cursive",
                        color: isSelected ? '#f8fafc' : '#a8a29e',
                        letterSpacing: '1px'
                      }}>
                        {option.text}
                      </span>
                      {/* 随机装饰 - 每个选项不同 */}
                      {index === 0 && (
                        <span style={{ position: 'absolute', right: '10px', top: '8px', fontSize: '2px', color: '#78350f', opacity: 0.4 }}>·</span>
                      )}
                      {index === 1 && (
                        <span style={{ position: 'absolute', right: '12px', top: '6px', fontSize: '6px', color: '#78350f', opacity: 0.3, transform: 'rotate(12deg)' }}>〰</span>
                      )}
                      {index === 2 && (
                        <span style={{ opacity: 0.35, marginLeft: 'auto', fontSize: '10px', color: '#78716c', transform: 'rotate(8deg)' }}>〰</span>
                      )}
                      {index === 3 && (
                        <span style={{ position: 'absolute', left: '8px', bottom: '6px', fontSize: '2px', color: '#92400e', opacity: 0.3, transform: 'rotate(15deg)' }}>·</span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* 底部按钮 - 更歪+skewX(-8deg) */}
            <div className="flex items-center justify-between" style={{
              marginTop: '32px',
              maxWidth: '520px',
              transform: 'rotate(0.4deg)',
              position: 'relative'
            }}>
              {/* 墨迹背景 */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '-10px',
                width: '80px',
                height: '40px',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(180,83,9,0.05) 0%, transparent 70%)',
                filter: 'blur(4px)',
                transform: 'translateX(-50%)'
              }} />
              <button
                onClick={() => router.back()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#78716c',
                  fontSize: '11px',
                  cursor: 'pointer',
                  opacity: 0.45,
                  letterSpacing: '1px',
                  transform: 'rotate(-2deg)'
                }}
              >
                退出测试
              </button>

              {progress > 0 && (
                <button
                  style={{
                    width: '160px',
                    height: '46px',
                    backgroundColor: '#991b1b',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '14px',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    letterSpacing: '3px',
                    boxShadow: '3px 3px 0 rgba(0,0,0,0.4), 2px 2px 8px rgba(0,0,0,0.3), inset 1px 1px 0 rgba(255,255,255,0.08)',
                    transform: 'rotate(-3deg) skewX(-8deg)',
                    textShadow: '2px 2px 3px rgba(0,0,0,0.5)'
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
          <div className="animate-fade-in-up" style={{ transform: 'rotate(-0.5deg)' }}>
            {/* 结果标题 - 更歪 */}
            <div style={{
              marginBottom: '28px',
              letterSpacing: '1px',
              transform: 'rotate(0.8deg)',
              marginLeft: '12px',
              position: 'relative'
            }}>
              {/* 墨迹背景 */}
              <div style={{
                position: 'absolute',
                left: '-15px',
                top: '-10px',
                right: '-10px',
                bottom: '-5px',
                background: 'radial-gradient(ellipse at 30% 50%, rgba(220,38,38,0.05) 0%, transparent 60%)',
                filter: 'blur(6px)'
              }} />
              <h2 style={{
                fontFamily: "'Noto Serif SC', serif",
                fontWeight: '700',
                fontSize: '28px',
                color: '#f8fafc',
                position: 'relative'
              }}>
                你的老板人格是：
              </h2>
              <div style={{
                fontSize: '33px',
                fontWeight: '700',
                marginTop: '6px',
                marginLeft: '12px',
                color: '#dc2626',
                textShadow: '2px 2px 0 rgba(0,0,0,0.3), 0 0 20px rgba(220,38,38,0.3)',
                fontFamily: "'Ma Shan Zheng', cursive"
              }}>
                {personality.name}
              </div>
              <p style={{
                fontSize: '12px',
                opacity: 0.6,
                marginTop: '6px',
                marginLeft: '20px',
                color: '#a8a29e',
                letterSpacing: '2px'
              }}>
                {personality.title}
              </p>
            </div>

            {/* 神兽展示 - 龙图腾代替emoji */}
            <div className="flex items-start gap-5" style={{
              marginBottom: '28px',
              transform: 'rotate(-1deg)'
            }}>
              <div style={{ position: 'relative' }}>
                {/* 墨迹光晕 */}
                <div style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: '45% 55% 52% 48% / 48% 52% 58% 42%',
                  background: `
                    radial-gradient(ellipse at 35% 35%, rgba(220,38,38,0.15) 0%, rgba(180,83,9,0.08) 30%, transparent 65%),
                    radial-gradient(ellipse at 65% 70%, rgba(153,27,27,0.1) 0%, transparent 40%)
                  `,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  filter: 'blur(4px)'
                }} />
                {/* 龙图腾文字 */}
                <div style={{
                  fontFamily: "'Ma Shan Zheng', cursive",
                  fontSize: '58px',
                  color: '#dc2626',
                  textShadow: '3px 3px 0 rgba(0,0,0,0.4), 0 0 15px rgba(220,38,38,0.4), 0 0 30px rgba(180,83,9,0.2)',
                  transform: 'rotate(-5deg)',
                  display: 'inline-block',
                  filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.4))'
                }}>龍</div>
                {/* 龙角符号 */}
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-6px',
                  fontSize: '12px',
                  color: '#b45309',
                  opacity: 0.6,
                  transform: 'rotate(20deg)',
                  fontFamily: "'Ma Shan Zheng', cursive"
                }}>角</div>
                {/* 裂痕 */}
                <div style={{
                  position: 'absolute',
                  bottom: '5px',
                  right: '10px',
                  fontSize: '10px',
                  color: '#78350f',
                  opacity: 0.5,
                  transform: 'rotate(-12deg)'
                }}>〰</div>
              </div>
              <div className="flex-1" style={{ transform: 'rotate(0.5deg)', position: 'relative' }}>
                {/* 墨迹背景 */}
                <div style={{
                  position: 'absolute',
                  left: '-10px',
                  top: '-5px',
                  right: '-5px',
                  bottom: '-5px',
                  background: 'radial-gradient(ellipse at 30% 50%, rgba(180,83,9,0.03) 0%, transparent 70%)',
                  filter: 'blur(4px)'
                }} />
                <p style={{
                  fontFamily: "'Ma Shan Zheng', cursive",
                  fontSize: '13px',
                  color: '#a8a29e',
                  lineHeight: 1.9,
                  letterSpacing: '0.5px',
                  position: 'relative'
                }}>
                  "{card.slogan}"
                </p>
              </div>
            </div>

            {/* 三个分析卡片 - 极端不对称 */}
            <div className="space-y-0">
              {/* 卡片1 - 左上，小 */}
              <div
                style={{
                  width: '280px',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  borderRadius: '2px',
                  padding: '18px',
                  boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.5), 3px 4px 10px rgba(0,0,0,0.3)',
                  marginLeft: '12px',
                  letterSpacing: '0.5px',
                  transform: 'rotate(-1.5deg)',
                  borderTop: '3px solid #b45309',
                  position: 'relative'
                }}
              >
                {/* 残缺边框 */}
                <div style={{ position: 'absolute', top: '0', right: '0', width: '18px', height: '3px', background: 'rgba(0,0,0,0.7)' }} />
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '10px',
                  color: '#dc2626',
                  letterSpacing: '2px',
                  fontFamily: "'Noto Serif SC', serif"
                }}>
                  性格特点
                </h3>
                <p style={{
                  fontFamily: "'Ma Shan Zheng', cursive",
                  fontSize: '12px',
                  color: '#a8a29e',
                  lineHeight: 1.8
                }}>
                  {card.good_for}
                </p>
                {/* 墨点 */}
                <div style={{ position: 'absolute', right: '12px', bottom: '12px', fontSize: '2px', color: '#78350f', opacity: 0.4 }}>·</div>
              </div>

              {/* 卡片2 - 居中偏右，大，上移 */}
              <div
                style={{
                  width: '300px',
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  borderRadius: '10px',
                  padding: '18px',
                  boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.5), -3px 5px 12px rgba(0,0,0,0.3)',
                  marginTop: '14px',
                  marginLeft: '100px',
                  letterSpacing: '0.5px',
                  transform: 'rotate(2deg)',
                  borderLeft: '4px solid #991b1b',
                  position: 'relative'
                }}
              >
                {/* 裂痕装饰 */}
                <div style={{ position: 'absolute', top: '8px', right: '12px', fontSize: '8px', color: '#78350f', opacity: 0.4, transform: 'rotate(10deg)' }}>〰</div>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '10px',
                  color: '#dc2626',
                  letterSpacing: '2px',
                  fontFamily: "'Noto Serif SC', serif"
                }}>
                  职场表现
                </h3>
                <p style={{
                  fontFamily: "'Ma Shan Zheng', cursive",
                  fontSize: '12px',
                  color: '#a8a29e',
                  lineHeight: 1.8
                }}>
                  {card.avoid}
                </p>
              </div>

              {/* 卡片3 - 最右，小，下沉 */}
              <div
                style={{
                  width: '260px',
                  backgroundColor: 'rgba(0,0,0,0.38)',
                  borderRadius: '6px',
                  padding: '18px',
                  boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.5), 4px 6px 14px rgba(0,0,0,0.4)',
                  marginTop: '14px',
                  marginLeft: '200px',
                  letterSpacing: '0.5px',
                  transform: 'rotate(-1.2deg)',
                  borderBottom: '2px solid rgba(180,83,9,0.5)',
                  position: 'relative'
                }}
              >
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '10px',
                  color: '#dc2626',
                  letterSpacing: '2px',
                  fontFamily: "'Noto Serif SC', serif"
                }}>
                  相处建议
                </h3>
                <div className="flex flex-wrap gap-2">
                  {card.tags.map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '11px',
                        padding: '3px 7px',
                        borderRadius: ['1px', '4px', '8px', '3px'][i % 4],
                        backgroundColor: 'rgba(0,0,0,0.35)',
                        color: '#78716c',
                        transform: `rotate(${i % 2 === 0 ? -1.5 : 1.5}deg)`,
                        fontFamily: "'Ma Shan Zheng', cursive"
                      }}
                    >
                      {tag.icon} {tag.text}
                    </span>
                  ))}
                </div>
                {/* 额外墨点 */}
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '2px', color: '#92400e', opacity: 0.35, transform: 'rotate(20deg)' }}>·</div>
              </div>
            </div>

            {/* 分享卡片 - 更歪 */}
            <div style={{
              maxWidth: '320px',
              backgroundColor: 'rgba(0,0,0,0.42)',
              borderRadius: '5px',
              padding: '22px',
              marginTop: '28px',
              marginLeft: '8px',
              boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.5), 2px 3px 8px rgba(0,0,0,0.3)',
              transform: 'rotate(1.2deg)',
              position: 'relative'
            }}>
              {/* 墨迹背景 */}
              <div style={{
                position: 'absolute',
                left: '-8px',
                top: '-8px',
                right: '-8px',
                bottom: '-8px',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(180,83,9,0.04) 0%, transparent 70%)',
                filter: 'blur(4px)'
              }} />
              <div className="text-center mb-3" style={{ transform: 'rotate(-0.8deg)', position: 'relative' }}>
                {shareStatus?.unlocked ? (
                  <div className="flex flex-col items-center gap-2">
                    <div style={{ fontSize: '36px', transform: 'rotate(-5deg)', display: 'inline-block' }}>🔓</div>
                    <p style={{ fontWeight: '600', color: '#dc2626', letterSpacing: '2px' }}>
                      报告已解锁
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div style={{ fontSize: '36px', opacity: 0.4, transform: 'rotate(8deg)', display: 'inline-block' }}>🔒</div>
                    <p style={{ fontSize: '12px', opacity: 0.55, color: '#a8a29e' }}>
                      分享解锁报告（还差{shareStatus?.remaining || 10}次）
                    </p>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '2px',
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      marginTop: '6px',
                      transform: 'skewX(-4deg)'
                    }}>
                      <div
                        style={{
                          width: `${((shareStatus?.opens || 0) / 10) * 100}%`,
                          height: '100%',
                          borderRadius: '2px',
                          background: 'linear-gradient(90deg, #991b1b, #dc2626)',
                          transition: 'width 0.4s ease-out',
                          transform: 'skewX(4deg)'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 分享按钮 - 极端差异化 */}
              <div className="space-y-1" style={{ position: 'relative' }}>
                {(['吐槽风', '励志风', '商务风'] as const).map((style, idx) => (
                  <button
                    key={style}
                    onClick={() => copyShareText(style)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 14px',
                      fontSize: '12px',
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      color: '#a8a29e',
                      border: 'none',
                      borderRadius: ['1px', '6px', '10px'][idx],
                      cursor: 'pointer',
                      transition: 'all 0.15s ease-out',
                      letterSpacing: '1px',
                      transform: `rotate(${idx % 2 === 0 ? -0.8 : 1.2}deg)`,
                      fontFamily: "'Ma Shan Zheng', cursive"
                    }}
                  >
                    {copied ? '✓ ' : '📋 '}{style}
                  </button>
                ))}
              </div>
            </div>

            {/* 底部操作 - 更歪 */}
            <div className="flex items-center justify-between" style={{
              marginTop: '28px',
              maxWidth: '320px',
              transform: 'rotate(-0.5deg)'
            }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#78716c',
                  fontSize: '11px',
                  cursor: 'pointer',
                  opacity: 0.45,
                  letterSpacing: '1px',
                  transform: 'rotate(1.5deg)'
                }}
              >
                重新测试
              </button>

              {shareStatus?.unlocked && (
                <button
                  onClick={() => router.push(`/${lang}/sbti/report/${sessionId}`)}
                  style={{
                    padding: '7px 22px',
                    backgroundColor: '#991b1b',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '13px',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    letterSpacing: '2px',
                    boxShadow: '3px 3px 0 rgba(0,0,0,0.4), 2px 2px 6px rgba(0,0,0,0.3), inset 1px 1px 0 rgba(255,255,255,0.08)',
                    transform: 'rotate(-3deg) skewX(-8deg)',
                    textShadow: '2px 2px 3px rgba(0,0,0,0.5)'
                  }}
                >
                  查看完整报告
                </button>
              )}
            </div>

            <p style={{
              textAlign: 'center',
              fontSize: '10px',
              opacity: 0.35,
              marginTop: '20px',
              color: '#78716c',
              letterSpacing: '2px'
            }}>
              测试结果仅供娱乐，请勿当真
            </p>
          </div>
        )}
      </main>

      {/* === 右侧装饰线群 === */}
      <div className="fixed right-6 top-1/4 z-20" style={{
        width: '2px',
        height: '120px',
        background: 'linear-gradient(to bottom, transparent, #b45309, transparent)',
        transform: 'rotate(5deg)',
        opacity: 0.14
      }} />
      <div className="fixed right-12 top-1/3 z-20" style={{
        width: '1px',
        height: '80px',
        background: 'linear-gradient(to bottom, transparent, #991b1b, transparent)',
        transform: 'rotate(-3deg)',
        opacity: 0.1
      }} />
      <div className="fixed right-20 top-1/2 z-20" style={{
        width: '1px',
        height: '150px',
        background: 'linear-gradient(to bottom, transparent, #b45309, transparent)',
        transform: 'rotate(7deg)',
        opacity: 0.08
      }} />
      {/* 更多装饰线 */}
      <div className="fixed right-18 top-2/3 z-20" style={{
        width: '1px',
        height: '60px',
        background: 'linear-gradient(to bottom, transparent, #78350f, transparent)',
        transform: 'rotate(-5deg)',
        opacity: 0.06
      }} />

      {/* === 右下角甲骨文碎片符号 === */}
      <div
        className="fixed"
        style={{
          bottom: '24px',
          right: '24px',
          opacity: 0.18,
          color: '#b45309',
          fontSize: '18px',
          transform: 'rotate(15deg)',
          letterSpacing: '3px'
        }}
      >
        ◯◻◽◾▫
      </div>

      {/* === 更多墨点装饰 - 底部 === */}
      <div className="fixed left-8 bottom-20 z-20" style={{ fontSize: '5px', color: '#b45309', opacity: 0.22 }}>
        ···　·　··　·　···　·　···
      </div>
      <div className="fixed right-20 bottom-32 z-20" style={{ fontSize: '4px', color: '#b45309', opacity: 0.2 }}>
        ·　··　···　·　··　·　···
      </div>
      {/* 随机散落 */}
      <div className="fixed left-16 bottom-40 z-20" style={{ fontSize: '2px', color: '#78350f', opacity: 0.12, transform: 'rotate(18deg)' }}>·</div>
      <div className="fixed right-10 bottom-50 z-20" style={{ fontSize: '2px', color: '#92400e', opacity: 0.1 }}>·</div>
      <div className="fixed left-5 bottom-60 z-20" style={{ fontSize: '3px', color: '#78350f', opacity: 0.08, transform: 'rotate(-25deg)' }}>·</div>

      {/* === 左下角破损暗示 === */}
      <div className="fixed left-0 bottom-0 z-30" style={{
        width: '50px',
        height: '50px',
        opacity: 0.12,
        background: 'linear-gradient(45deg, transparent 40%, #0a1210 40%, #0a1210 55%, transparent 55%)'
      }} />
      <div className="fixed left-40px bottom-0 z-30" style={{
        width: '30px',
        height: '30px',
        opacity: 0.06,
        background: 'linear-gradient(50deg, transparent 45%, #0a1210 45%)'
      }} />

      {/* === 顶部破损暗示 === */}
      <div className="fixed top-0 left-1/3 z-30" style={{
        width: '40px',
        height: '20px',
        opacity: 0.08,
        background: 'linear-gradient(180deg, transparent 50%, #0a1210 50%)'
      }} />
      <div className="fixed top-0 right-1/4 z-30" style={{
        width: '25px',
        height: '15px',
        opacity: 0.05,
        background: 'linear-gradient(200deg, transparent 55%, #0a1210 55%)'
      }} />

      {/* === 更多随机散落装饰元素 === */}
      {/* 裂痕群 */}
      <div className="fixed left-40px top-1/3 z-20" style={{ fontSize: '7px', color: '#78350f', opacity: 0.12, transform: 'rotate(15deg)' }}>〰</div>
      <div className="fixed right-60px top-2/3 z-20" style={{ fontSize: '6px', color: '#92400e', opacity: 0.08, transform: 'rotate(-10deg)' }}>〰</div>
      {/* 墨点群 */}
      <div className="fixed left-1/4 top-1/4 z-20" style={{ fontSize: '2px', color: '#78350f', opacity: 0.06, transform: 'rotate(30deg)' }}>·</div>
      <div className="fixed right-1/3 top-40% z-20" style={{ fontSize: '3px', color: '#92400e', opacity: 0.05, transform: 'rotate(-18deg)' }}>·</div>
    </div>
  )
}
