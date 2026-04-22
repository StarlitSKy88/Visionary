'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface SBTIReportData {
  sessionId: number
  personalityId: string
  sbtiScores: {
    d1: number
    d2: number
    d3: number
    d4: number
    d5: number
  }
  businessData: Record<string, any>
  completedAt: string
  report?: {
    marketAnalysis: any
    strategyPlan: any
    executionPlan: any
    financialPlan: any
  }
  generating?: boolean
}

interface PersonalityInfo {
  id: string
  name: string
  title: string
  slogan: string
  good_for: string
  avoid: string
}

const GENERATION_STEPS = {
  zh: [
    { id: 'market', label: '市场分析', description: '分析市场机会与竞争格局' },
    { id: 'strategy', label: '策略规划', description: '制定核心定位与差异化策略' },
    { id: 'execution', label: '执行计划', description: '规划具体行动步骤' },
    { id: 'financial', label: '财务分析', description: '评估投资回报与风险' },
    { id: 'debate', label: '多角度辩论', description: 'Agent之间相互审查建议' },
    { id: 'quality', label: '质量验证', description: 'Harness检查输出质量' },
  ],
  en: [
    { id: 'market', label: 'Market Analysis', description: 'Analyzing market opportunities' },
    { id: 'strategy', label: 'Strategy Planning', description: 'Developing core positioning' },
    { id: 'execution', label: 'Execution Plan', description: 'Planning action steps' },
    { id: 'financial', label: 'Financial Analysis', description: 'Evaluating ROI and risks' },
    { id: 'debate', label: 'Multi-angle Debate', description: 'Agents reviewing each other' },
    { id: 'quality', label: 'Quality Check', description: 'Harness validating output' },
  ],
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

export default function SBTIReportPage() {
  const router = useRouter()
  const params = useParams()
  const lang = 'zh'
  const sessionId = params?.id as string

  const [reportData, setReportData] = useState<SBTIReportData | null>(null)
  const [personality, setPersonality] = useState<PersonalityInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generationStep, setGenerationStep] = useState(0)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // 获取报告数据
  useEffect(() => {
    if (!sessionId) return
    fetchReport()
  }, [sessionId])

  // 生成中时轮询
  useEffect(() => {
    if (!generating || !sessionId) return

    const interval = setInterval(() => {
      fetchReport()
    }, 5000)

    return () => clearInterval(interval)
  }, [generating, sessionId])

  // 模拟生成进度
  useEffect(() => {
    if (!generating) return

    const startTime = new Date().getTime()
    const estimatedTime = 180000
    const maxStep = GENERATION_STEPS[lang as 'zh' | 'en'].length

    const updateProgress = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / estimatedTime) * 100, 95)
      const step = Math.floor((progress / 100) * maxStep)

      setGenerationProgress(Math.round(progress))
      setGenerationStep(Math.min(step, maxStep - 1))
    }

    updateProgress()
    const interval = setInterval(updateProgress, 2000)

    return () => clearInterval(interval)
  }, [generating, lang])

  const fetchReport = async () => {
    if (!sessionId) return

    try {
      const res = await fetch(`/api/sbti/report/${sessionId}`)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch report')
      }

      const data = await res.json()
      setReportData(data)

      // 如果有报告内容，停止生成状态
      if (data.report) {
        setGenerating(false)
        setGenerationProgress(100)
        setGenerationStep(GENERATION_STEPS[lang as 'zh' | 'en'].length - 1)
      } else {
        // 需要触发生成
        setGenerating(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const triggerGenerate = async () => {
    if (!sessionId) return

    setGenerating(true)
    setGenerationProgress(0)
    setGenerationStep(0)

    try {
      const res = await fetch('/api/sbti/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: parseInt(sessionId) }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate report')
      }

      const data = await res.json()
      setReportData((prev: any) => ({
        ...prev,
        report: data.report,
        personality: data.personality,
      }))
      setGenerating(false)
      setGenerationProgress(100)
      setGenerationStep(GENERATION_STEPS[lang as 'zh' | 'en'].length - 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setGenerating(false)
    }
  }

  const t = (zh: string, _en: string) => zh

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0a1210' }}>
        {/* 噪点纹理 */}
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='7' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          opacity: 0.22
        }} />
        {/* 暗角 */}
        <div className="fixed inset-0 pointer-events-none z-10" style={{
          background: 'radial-gradient(ellipse at center, transparent 10%, rgba(0,0,0,0.85) 100%)'
        }} />
        {/* 加载中 - 龙图腾 */}
        <div className="flex items-center justify-center min-h-screen" style={{ transform: 'rotate(-2deg)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Ma Shan Zheng', cursive",
              fontSize: '72px',
              color: '#dc2626',
              textShadow: '4px 4px 0 rgba(0,0,0,0.4), 0 0 20px rgba(220,38,38,0.4)',
              transform: 'rotate(-8deg)',
              display: 'inline-block'
            }}>龍</div>
            {/* 裂痕 */}
            <div style={{
              fontSize: '14px',
              color: '#78350f',
              opacity: 0.5,
              transform: 'rotate(15deg)',
              display: 'inline-block',
              marginLeft: '12px'
            }}>〰</div>
            <p style={{
              marginTop: '24px',
              fontSize: '12px',
              opacity: 0.5,
              color: '#78716c',
              letterSpacing: '3px',
              fontFamily: "'Noto Serif SC', serif"
            }}>
              正在加载报告...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0a1210' }}>
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='7' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          opacity: 0.22
        }} />
        <div className="fixed inset-0 pointer-events-none z-10" style={{
          background: 'radial-gradient(ellipse at center, transparent 10%, rgba(0,0,0,0.85) 100%)'
        }} />
        <div className="flex items-center justify-center min-h-screen">
          <div style={{
            padding: '18px',
            backgroundColor: 'rgba(0,0,0,0.42)',
            borderRadius: '4px',
            border: '1px solid #991b1b',
            borderLeft: '5px solid #dc2626',
            transform: 'rotate(-1deg)',
            maxWidth: '380px'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '12px', transform: 'rotate(-5deg)', display: 'inline-block' }}>⚠</div>
            <p style={{ fontSize: '14px', color: '#dc2626', fontFamily: "'Noto Serif SC', serif" }}>{error}</p>
            <button
              onClick={() => router.push(`/${lang}/sbti`)}
              style={{
                marginTop: '16px',
                padding: '8px 18px',
                backgroundColor: '#991b1b',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: "'Noto Serif SC', serif",
                transform: 'rotate(-1deg)'
              }}
            >
              返回测试
            </button>
          </div>
        </div>
      </div>
    )
  }

  const content = reportData?.report

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0a1210' }}>
      {/* 噪点纹理背景 */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='7' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        opacity: 0.22
      }} />

      {/* 古旧褪色叠加层 */}
      <div className="fixed inset-0 pointer-events-none z-[5]" style={{
        background: `
          radial-gradient(ellipse at 20% 15%, rgba(180,83,9,0.06) 0%, transparent 30%),
          radial-gradient(ellipse at 80% 80%, rgba(153,27,27,0.05) 0%, transparent 35%)
        `
      }} />

      {/* 极端暗角效果 */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{
        background: 'radial-gradient(ellipse at center, transparent 10%, rgba(0,0,0,0.85) 100%)'
      }} />

      {/* 左上角篆体印章 */}
      <div style={{
        position: 'fixed',
        left: '28px',
        top: '28px',
        transform: 'rotate(-12deg)',
        zIndex: 20
      }}>
        <div style={{
          fontSize: '26px',
          opacity: 0.6,
          color: '#b45309',
          textShadow: '2px 3px 5px rgba(0,0,0,0.5), 0 0 15px rgba(180,83,9,0.3)',
          fontFamily: "'Noto Serif SC', serif",
          letterSpacing: '6px'
        }}>山海</div>
        {/* 铜钉装饰 */}
        <div style={{
          position: 'absolute',
          left: '-6px',
          top: '-6px',
          width: '8px',
          height: '8px',
          borderRadius: '45% 55% 50% 50%',
          backgroundColor: '#92400e',
          boxShadow: '1px 2px 3px rgba(0,0,0,0.5)',
          transform: 'rotate(15deg)'
        }} />
      </div>

      {/* Header - 不对称布局 */}
      <header className="sticky top-0 z-20" style={{ padding: '16px 24px 16px 80px' }}>
        <div className="flex items-center justify-between">
          {/* 返回按钮 - 更歪 */}
          <button
            onClick={() => router.push(`/${lang}/sbti`)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#78716c',
              fontSize: '11px',
              cursor: 'pointer',
              opacity: 0.5,
              letterSpacing: '1px',
              transform: 'rotate(-3deg)',
              fontFamily: "'Noto Serif SC', serif"
            }}
          >
            ← 返回
          </button>

          {/* 标题 - 歪斜 */}
          <h1 style={{
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: '700',
            fontSize: '19px',
            color: '#f8fafc',
            letterSpacing: '2px',
            transform: 'rotate(1deg)',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}>
            报告
          </h1>

          {/* 空白保持不对称 */}
          <div style={{ width: '50px' }} />
        </div>
      </header>

      {/* Content - 不对称布局 */}
      <div style={{ padding: '0 24px 60px 20px', maxWidth: '720px', marginLeft: '10px' }}>

        {/* 生成中状态 - 山海经风格 */}
        {generating && (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.42)',
            borderRadius: '4px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: 'inset 0 3px 15px rgba(0,0,0,0.5), 4px 5px 12px rgba(0,0,0,0.35)',
            transform: 'rotate(-1deg)',
            borderLeft: '5px solid #b45309',
            position: 'relative'
          }}>
            {/* 墨迹背景 */}
            <div style={{
              position: 'absolute',
              right: '-10px',
              top: '-10px',
              width: '80px',
              height: '80px',
              background: 'radial-gradient(ellipse at 50% 50%, rgba(180,83,9,0.08) 0%, transparent 70%)',
              filter: 'blur(6px)'
            }} />

            <div style={{ textAlign: 'center', marginBottom: '20px', transform: 'rotate(-0.5deg)' }}>
              {/* 龙图腾 */}
              <div style={{
                fontFamily: "'Ma Shan Zheng', cursive",
                fontSize: '48px',
                color: '#dc2626',
                textShadow: '3px 3px 0 rgba(0,0,0,0.4), 0 0 20px rgba(220,38,38,0.4)',
                transform: 'rotate(-5deg)',
                display: 'inline-block',
                marginBottom: '12px'
              }}>龍</div>
              <h2 style={{
                fontFamily: "'Noto Serif SC', serif",
                fontWeight: '700',
                fontSize: '22px',
                color: '#f8fafc',
                letterSpacing: '2px',
                marginBottom: '8px'
              }}>
                报告生成中...
              </h2>
              <p style={{
                fontSize: '12px',
                opacity: 0.55,
                color: '#a8a29e',
                letterSpacing: '2px',
                fontFamily: "'Noto Serif SC', serif"
              }}>
                预计需要3分钟，请稍候
              </p>
            </div>

            {/* 生成进度 - 不对称进度条 */}
            <div style={{ marginBottom: '20px', transform: 'rotate(0.3deg)' }}>
              <div className="flex items-center gap-3" style={{ marginBottom: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  opacity: 0.5,
                  color: '#b45309',
                  fontFamily: "'Ma Shan Zheng', cursive",
                  letterSpacing: '1px'
                }}>进度</span>
                <span style={{
                  fontSize: '12px',
                  opacity: 0.6,
                  color: '#a8a29e',
                  fontFamily: "'JetBrains Mono', monospace"
                }}>{generationProgress}%</span>
              </div>
              <div style={{
                height: '4px',
                backgroundColor: 'rgba(0,0,0,0.35)',
                borderRadius: '2px',
                transform: 'skewX(-2deg)'
              }}>
                <div
                  style={{
                    width: `${generationProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #991b1b, #dc2626, #b45309)',
                    borderRadius: '2px',
                    transition: 'width 0.5s ease-out',
                    transform: 'skewX(2deg)'
                  }}
                />
              </div>
            </div>

            {/* 生成阶段 - 错落布局 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(GENERATION_STEPS[lang as 'zh' | 'en'] as typeof GENERATION_STEPS.zh).map((step, index) => {
                const isCompleted = index < generationStep
                const isCurrent = index === generationStep
                const isPending = index > generationStep
                const marginLeft = ['0px', '15px', '8px', '25px', '12px', '5px'][index]
                const rotations = ['-0.5deg', '0.8deg', '-1.2deg', '0.5deg', '-0.8deg', '1deg']

                return (
                  <div
                    key={step.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      backgroundColor: isCurrent ? 'rgba(180,83,9,0.12)' : isCompleted ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.15)',
                      borderRadius: ['3px', '8px', '2px', '12px', '5px', '6px'][index],
                      borderLeft: isCurrent ? '3px solid #dc2626' : isCompleted ? '3px solid #3d6b4f' : '3px solid transparent',
                      transform: `rotate(${rotations[index]})`,
                      marginLeft: marginLeft,
                      transition: 'all 0.3s ease-out'
                    }}
                  >
                    {/* 状态图标 - emoji */}
                    <div style={{
                      width: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      transform: isCurrent ? 'rotate(-10deg)' : 'none'
                    }}>
                      {isCompleted ? (
                        <span style={{ color: '#10b981' }}>✓</span>
                      ) : isCurrent ? (
                        <span style={{ color: '#dc2626', animation: 'pulse 1.5s ease-in-out infinite' }}>◉</span>
                      ) : (
                        <span style={{ color: '#6a6a6a', opacity: 0.5 }}>○</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontSize: '13px',
                        fontWeight: isCurrent ? '600' : '400',
                        color: isCurrent ? '#f8fafc' : isCompleted ? '#b8b5ad' : '#6a6a6a',
                        fontFamily: "'Noto Serif SC', serif",
                        letterSpacing: '0.5px'
                      }}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p style={{
                          fontSize: '11px',
                          opacity: 0.6,
                          color: '#a8a29e',
                          marginTop: '2px'
                        }}>{step.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 报告内容 - 极端不对称布局 */}
        {content && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* 人格概览 - 歪斜卡片 */}
            {reportData?.sbtiScores && (
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.42)',
                borderRadius: '4px',
                padding: '20px',
                boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.5), 3px 4px 10px rgba(0,0,0,0.3)',
                transform: 'rotate(-0.8deg)',
                borderTop: '4px solid #b45309',
                position: 'relative'
              }}>
                {/* 墨点装饰 */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '15px',
                  fontSize: '2px',
                  color: '#78350f',
                  opacity: 0.4
                }}>·</div>
                <h2 style={{
                  fontFamily: "'Noto Serif SC', serif",
                  fontWeight: '700',
                  fontSize: '17px',
                  color: '#f8fafc',
                  letterSpacing: '1px',
                  marginBottom: '16px',
                  transform: 'rotate(-0.5deg)'
                }}>
                  人格维度分析
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '12px',
                  textAlign: 'center'
                }}>
                  {Object.entries(reportData.sbtiScores).map(([dim, score], idx) => (
                    <div key={dim} style={{
                      transform: `rotate(${-1.5 + idx * 0.8}deg)`,
                      padding: '8px 4px'
                    }}>
                      <div style={{
                        fontSize: '26px',
                        fontWeight: '700',
                        fontFamily: "'JetBrains Mono', monospace",
                        color: score >= 4 ? '#dc2626' : score <= 2 ? '#10b981' : '#a8a29e',
                        textShadow: score >= 4 ? '0 0 10px rgba(220,38,38,0.4)' : 'none'
                      }}>
                        {score}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        opacity: 0.5,
                        color: '#78716c',
                        marginTop: '4px',
                        fontFamily: "'Noto Serif SC', serif",
                        letterSpacing: '1px'
                      }}>
                        D{dim.replace('d', '')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 市场分析 - 极端不对称 */}
            {content.marketAnalysis && (
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.38)',
                borderRadius: '6px',
                padding: '20px',
                boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.5), -3px 4px 10px rgba(0,0,0,0.3)',
                transform: 'rotate(0.6deg)',
                marginLeft: '15px',
                borderLeft: '5px solid #991b1b',
                position: 'relative'
              }}>
                {/* 序号装饰 - 龙图腾代替数字 */}
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '-12px',
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'rgba(153,27,27,0.25)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  transform: 'rotate(-15deg)'
                }}>
                  <span style={{ fontFamily: "'Ma Shan Zheng', cursive", color: '#dc2626' }}>龍</span>
                </div>

                <h3 style={{
                  fontFamily: "'Noto Serif SC', serif",
                  fontWeight: '700',
                  fontSize: '18px',
                  color: '#f8fafc',
                  letterSpacing: '1px',
                  marginBottom: '14px',
                  transform: 'rotate(-0.3deg)'
                }}>
                  市场分析
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {content.marketAnalysis.opportunity && (
                    <div style={{ transform: 'rotate(0.2deg)' }}>
                      <p style={{
                        fontSize: '11px',
                        opacity: 0.5,
                        color: '#78716c',
                        marginBottom: '4px',
                        fontFamily: "'Noto Serif SC', serif",
                        letterSpacing: '1px'
                      }}>
                        市场机会
                      </p>
                      <p style={{
                        fontSize: '14px',
                        color: '#e2e8f0',
                        fontFamily: "'Noto Serif SC', serif",
                        lineHeight: 1.7
                      }}>{content.marketAnalysis.opportunity}</p>
                    </div>
                  )}
                  {content.marketAnalysis.personalityInsight && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(180,83,9,0.1)',
                      borderRadius: '3px',
                      borderLeft: '3px solid #b45309',
                      transform: 'rotate(-0.5deg)'
                    }}>
                      <p style={{
                        fontSize: '12px',
                        color: '#c9a962',
                        fontFamily: "'Noto Serif SC', serif",
                        marginBottom: '4px'
                      }}>
                        <strong>【精怪洞察】</strong>
                      </p>
                      <p style={{
                        fontSize: '13px',
                        color: '#d4af37',
                        fontFamily: "'Ma Shan Zheng', cursive",
                        lineHeight: 1.6
                      }}>
                        {content.marketAnalysis.personalityInsight}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 策略规划 */}
            {content.strategyPlan && (
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.42)',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.5), 4px 5px 12px rgba(0,0,0,0.35)',
                transform: 'rotate(-1.2deg)',
                marginRight: '20px',
                marginLeft: '0px',
                borderTop: '4px solid #dc2626',
                position: 'relative'
              }}>
                {/* 裂痕装饰 */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '12px',
                  fontSize: '10px',
                  color: '#78350f',
                  opacity: 0.4,
                  transform: 'rotate(12deg)'
                }}>〰</div>

                <h3 style={{
                  fontFamily: "'Noto Serif SC', serif",
                  fontWeight: '700',
                  fontSize: '18px',
                  color: '#f8fafc',
                  letterSpacing: '1px',
                  marginBottom: '14px',
                  transform: 'rotate(0.4deg)'
                }}>
                  策略规划
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {content.strategyPlan.core_positioning && (
                    <div style={{ transform: 'rotate(-0.3deg)' }}>
                      <p style={{
                        fontSize: '11px',
                        opacity: 0.5,
                        color: '#78716c',
                        marginBottom: '4px',
                        fontFamily: "'Noto Serif SC', serif",
                        letterSpacing: '1px'
                      }}>
                        核心定位
                      </p>
                      <p style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#e2e8f0',
                        fontFamily: "'Noto Serif SC', serif"
                      }}>
                        {content.strategyPlan.core_positioning}
                      </p>
                    </div>
                  )}
                  {content.strategyPlan.personalityInsight && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(180,83,9,0.1)',
                      borderRadius: '5px',
                      transform: 'rotate(0.5deg)'
                    }}>
                      <p style={{
                        fontSize: '12px',
                        color: '#c9a962',
                        fontFamily: "'Noto Serif SC', serif"
                      }}>
                        <strong>【策略洞察】</strong>
                      </p>
                      <p style={{
                        fontSize: '13px',
                        color: '#d4af37',
                        fontFamily: "'Ma Shan Zheng', cursive",
                        marginTop: '4px'
                      }}>
                        {content.strategyPlan.personalityInsight}
                      </p>
                    </div>
                  )}
                  {content.strategyPlan.personalityWarning && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(153,27,27,0.15)',
                      borderRadius: '4px',
                      border: '1px solid rgba(220,38,38,0.3)',
                      transform: 'rotate(-0.8deg)'
                    }}>
                      <p style={{
                        fontSize: '12px',
                        color: '#dc2626',
                        fontFamily: "'Noto Serif SC', serif"
                      }}>
                        <strong>【避雷建议】</strong>
                      </p>
                      <p style={{
                        fontSize: '13px',
                        color: '#ef4444',
                        fontFamily: "'Ma Shan Zheng', cursive",
                        marginTop: '4px'
                      }}>
                        {content.strategyPlan.personalityWarning}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 执行计划 */}
            {content.executionPlan && (
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.38)',
                borderRadius: '3px',
                padding: '20px',
                boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.5), 3px 4px 10px rgba(0,0,0,0.3)',
                transform: 'rotate(0.9deg)',
                marginLeft: '25px',
                borderRight: '5px solid #10b981',
                position: 'relative'
              }}>
                <h3 style={{
                  fontFamily: "'Noto Serif SC', serif",
                  fontWeight: '700',
                  fontSize: '18px',
                  color: '#f8fafc',
                  letterSpacing: '1px',
                  marginBottom: '14px',
                  transform: 'rotate(-0.4deg)'
                }}>
                  执行计划
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {content.executionPlan.quick_wins && content.executionPlan.quick_wins.length > 0 && (
                    <div style={{ transform: 'rotate(0.2deg)' }}>
                      <p style={{
                        fontSize: '12px',
                        color: '#10b981',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontFamily: "'Noto Serif SC', serif"
                      }}>
                        <span style={{ fontSize: '14px' }}>✓</span> 快速见效
                      </p>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {content.executionPlan.quick_wins.map((item: string, i: number) => (
                          <li key={i} style={{
                            fontSize: '13px',
                            color: '#e2e8f0',
                            fontFamily: "'Noto Serif SC', serif",
                            paddingLeft: '12px',
                            position: 'relative',
                            marginBottom: '6px',
                            transform: `rotate(${-0.3 + i * 0.2}deg)`
                          }}>
                            <span style={{
                              position: 'absolute',
                              left: '0',
                              color: '#c9a962',
                              fontSize: '10px'
                            }}>•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {content.executionPlan.personalityInsight && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(16,185,129,0.08)',
                      borderRadius: '6px',
                      transform: 'rotate(-0.6deg)'
                    }}>
                      <p style={{
                        fontSize: '12px',
                        color: '#10b981',
                        fontFamily: "'Noto Serif SC', serif"
                      }}>
                        <strong>【执行优势】</strong>
                      </p>
                      <p style={{
                        fontSize: '13px',
                        color: '#34d399',
                        fontFamily: "'Ma Shan Zheng', cursive",
                        marginTop: '4px'
                      }}>
                        {content.executionPlan.personalityInsight}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 财务分析 */}
            {content.financialPlan && (
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.45)',
                borderRadius: '10px',
                padding: '20px',
                boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.5), -4px 5px 14px rgba(0,0,0,0.35)',
                transform: 'rotate(-0.5deg)',
                marginLeft: '8px',
                borderBottom: '4px solid #c9a962',
                position: 'relative'
              }}>
                {/* 墨点装饰 */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '15px',
                  fontSize: '3px',
                  color: '#92400e',
                  opacity: 0.35
                }}>·</div>

                <h3 style={{
                  fontFamily: "'Noto Serif SC', serif",
                  fontWeight: '700',
                  fontSize: '18px',
                  color: '#f8fafc',
                  letterSpacing: '1px',
                  marginBottom: '14px',
                  transform: 'rotate(0.3deg)'
                }}>
                  财务分析
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px'
                }}>
                  {content.financialPlan.investment_estimate && (
                    <div style={{ transform: 'rotate(-0.5deg)' }}>
                      <p style={{
                        fontSize: '11px',
                        opacity: 0.5,
                        color: '#78716c',
                        marginBottom: '4px',
                        fontFamily: "'Noto Serif SC', serif",
                        letterSpacing: '1px'
                      }}>
                        投资估算
                      </p>
                      <p style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#e2e8f0',
                        fontFamily: "'Noto Serif SC', serif"
                      }}>
                        {content.financialPlan.investment_estimate}
                      </p>
                    </div>
                  )}
                  {content.financialPlan.break_even && (
                    <div style={{ transform: 'rotate(0.8deg)' }}>
                      <p style={{
                        fontSize: '11px',
                        opacity: 0.5,
                        color: '#78716c',
                        marginBottom: '4px',
                        fontFamily: "'Noto Serif SC', serif",
                        letterSpacing: '1px'
                      }}>
                        回本时间
                      </p>
                      <p style={{
                        fontSize: '14px',
                        color: '#e2e8f0',
                        fontFamily: "'JetBrains Mono', monospace"
                      }}>
                        {content.financialPlan.break_even}
                      </p>
                    </div>
                  )}
                  {content.financialPlan.personalityInsight && (
                    <div style={{
                      gridColumn: 'span 2',
                      padding: '12px',
                      backgroundColor: 'rgba(201,169,98,0.1)',
                      borderRadius: '4px',
                      borderLeft: '3px solid #c9a962',
                      transform: 'rotate(0.2deg)'
                    }}>
                      <p style={{
                        fontSize: '12px',
                        color: '#c9a962',
                        fontFamily: "'Noto Serif SC', serif"
                      }}>
                        <strong>【财务人格视角】</strong>
                      </p>
                      <p style={{
                        fontSize: '13px',
                        color: '#d4af37',
                        fontFamily: "'Ma Shan Zheng', cursive",
                        marginTop: '4px'
                      }}>
                        {content.financialPlan.personalityInsight}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 未解锁状态 */}
        {!content && !generating && (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.42)',
            borderRadius: '5px',
            padding: '28px',
            textAlign: 'center',
            boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.5), 3px 4px 10px rgba(0,0,0,0.3)',
            transform: 'rotate(-0.5deg)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', transform: 'rotate(-8deg)', display: 'inline-block' }}>🔒</div>
            <p style={{
              fontSize: '14px',
              opacity: 0.6,
              color: '#a8a29e',
              fontFamily: "'Noto Serif SC', serif",
              letterSpacing: '1px'
            }}>
              报告未解锁，请先分享或付费
            </p>
          </div>
        )}
      </div>

      {/* 装饰元素 */}
      {/* 右侧装饰线群 */}
      <div style={{
        position: 'fixed',
        right: '6px',
        top: '30%',
        width: '2px',
        height: '100px',
        background: 'linear-gradient(to bottom, transparent, #b45309, transparent)',
        transform: 'rotate(8deg)',
        opacity: 0.15,
        zIndex: 15
      }} />
      <div style={{
        position: 'fixed',
        right: '14px',
        top: '45%',
        width: '1px',
        height: '70px',
        background: 'linear-gradient(to bottom, transparent, #991b1b, transparent)',
        transform: 'rotate(-5deg)',
        opacity: 0.1,
        zIndex: 15
      }} />

      {/* 右下角甲骨文碎片 */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        opacity: 0.2,
        color: '#b45309',
        fontSize: '16px',
        transform: 'rotate(20deg)',
        letterSpacing: '4px',
        zIndex: 15,
        textShadow: '2px 2px 4px rgba(0,0,0,0.4)'
      }}>
        ◯◻◽◾▫
      </div>

      {/* 墨点装饰 */}
      <div style={{
        position: 'fixed',
        left: '12px',
        bottom: '60px',
        fontSize: '4px',
        color: '#b45309',
        opacity: 0.2,
        letterSpacing: '3px',
        zIndex: 15
      }}>
        ·　··　···　·　··　·　···　·　··　·　···　·　··
      </div>
      <div style={{
        position: 'fixed',
        right: '50px',
        bottom: '40px',
        fontSize: '3px',
        color: '#92400e',
        opacity: 0.12,
        zIndex: 15
      }}>·</div>

      {/* 角落破损暗示 */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '80px',
        height: '60px',
        background: 'radial-gradient(circle at top left, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 30%, transparent 55%)',
        zIndex: 12,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '100px',
        height: '70px',
        background: 'radial-gradient(circle at bottom right, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.12) 25%, transparent 50%)',
        zIndex: 12,
        pointerEvents: 'none'
      }} />

      {/* 裂痕装饰 */}
      <div style={{
        position: 'fixed',
        left: '60px',
        top: '40%',
        fontSize: '8px',
        color: '#78350f',
        opacity: 0.12,
        transform: 'rotate(15deg)',
        zIndex: 15
      }}>〰</div>
    </div>
  )
}
