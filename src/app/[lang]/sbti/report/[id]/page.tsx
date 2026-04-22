'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge, Spinner } from '@/components/ui/misc'
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, Lock, Share2, Copy, CheckCircle } from 'lucide-react'

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
  const lang = 'zh' // TODO: 从路由获取
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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="text-amber-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">{t('加载报告中...', 'Loading report...')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-900 dark:text-white mb-4">{error}</p>
          <Button onClick={() => router.push(`/${lang}/sbti`)}>
            {t('返回测试', 'Back to Test')}
          </Button>
        </Card>
      </div>
    )
  }

  const content = reportData?.report

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push(`/${lang}/sbti`)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>

          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('SBTI 报告', 'SBTI Report')}
          </h1>

          <div className="w-10" />
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 生成中状态 */}
        {generating && (
          <Card className="p-8 mb-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
            <div className="text-center mb-6">
              <Spinner size="lg" className="text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {t('报告生成中...', 'Generating Report...')}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {t('预计需要3分钟，请稍候', 'Estimated 3 minutes, please wait')}
              </p>
            </div>

            {/* 生成进度 */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>{t('生成进度', 'Progress')}</span>
                <span>{generationProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>

              {/* 生成阶段 */}
              <div className="mt-6 space-y-2">
                {(GENERATION_STEPS[lang as 'zh' | 'en'] as typeof GENERATION_STEPS.zh).map((step, index) => {
                  const isCompleted = index < generationStep
                  const isCurrent = index === generationStep
                  const isPending = index > generationStep

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        isCurrent ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700' :
                        isCompleted ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-green-500' :
                        isCurrent ? 'bg-amber-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : isCurrent ? (
                          <Spinner size="sm" className="text-white" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          isCurrent ? 'text-amber-700 dark:text-amber-300' :
                          isCompleted ? 'text-green-700 dark:text-green-300' : 'text-slate-500'
                        }`}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{step.description}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        )}

        {/* 报告内容 */}
        {content && (
          <div className="space-y-6">
            {/* 人格概览 */}
            {reportData?.sbtiScores && (
              <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  {t('人格维度分析', 'Personality Analysis')}
                </h2>
                <div className="grid grid-cols-5 gap-4">
                  {Object.entries(reportData.sbtiScores).map(([dim, score]) => (
                    <div key={dim} className="text-center">
                      <div className={`text-2xl font-bold ${
                        score >= 4 ? 'text-amber-500' :
                        score <= 2 ? 'text-green-500' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {score}分
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        D{dim.replace('d', '')}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 市场分析 */}
            {content.marketAnalysis && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">1</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {t('市场分析', 'Market Analysis')}
                  </h3>
                </div>
                <div className="space-y-4">
                  {content.marketAnalysis.opportunity && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                        {t('市场机会', 'Market Opportunity')}
                      </p>
                      <p className="text-slate-900 dark:text-white">{content.marketAnalysis.opportunity}</p>
                    </div>
                  )}
                  {content.marketAnalysis.personalityInsight && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>{t('【貔貅型老板】特别提示', '【Pixiu Boss】Insight')}</strong>
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        {content.marketAnalysis.personalityInsight}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* 策略规划 */}
            {content.strategyPlan && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">2</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {t('策略规划', 'Strategy Plan')}
                  </h3>
                </div>
                <div className="space-y-4">
                  {content.strategyPlan.core_positioning && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                        {t('核心定位', 'Core Positioning')}
                      </p>
                      <p className="text-slate-900 dark:text-white font-medium">
                        {content.strategyPlan.core_positioning}
                      </p>
                    </div>
                  )}
                  {content.strategyPlan.personalityInsight && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>{t('【人格特别提示】', '【Personality Insight】')}</strong>
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        {content.strategyPlan.personalityInsight}
                      </p>
                    </div>
                  )}
                  {content.strategyPlan.personalityWarning && (
                    <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        <strong>{t('【避雷建议】', '【Warning】')}</strong>
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {content.strategyPlan.personalityWarning}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* 执行计划 */}
            {content.executionPlan && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">3</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {t('执行计划', 'Execution Plan')}
                  </h3>
                </div>
                <div className="space-y-4">
                  {content.executionPlan.quick_wins && content.executionPlan.quick_wins.length > 0 && (
                    <div>
                      <p className="text-sm text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {t('快速见效', 'Quick Wins')}
                      </p>
                      <ul className="space-y-1">
                        {content.executionPlan.quick_wins.map((item: string, i: number) => (
                          <li key={i} className="text-slate-900 dark:text-white text-sm flex items-start gap-2">
                            <span className="text-amber-500">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {content.executionPlan.personalityInsight && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>{t('【执行优势】', '【Execution Advantage】')}</strong>
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        {content.executionPlan.personalityInsight}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* 财务分析 */}
            {content.financialPlan && (
              <Card className="p-6 border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">4</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {t('财务分析', 'Financial Analysis')}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {content.financialPlan.investment_estimate && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                        {t('投资估算', 'Investment Estimate')}
                      </p>
                      <p className="text-slate-900 dark:text-white font-medium">
                        {content.financialPlan.investment_estimate}
                      </p>
                    </div>
                  )}
                  {content.financialPlan.break_even && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                        {t('回本时间', 'Break-even')}
                      </p>
                      <p className="text-slate-900 dark:text-white">
                        {content.financialPlan.break_even}
                      </p>
                    </div>
                  )}
                  {content.financialPlan.personalityInsight && (
                    <div className="col-span-2 mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>{t('【财务人格视角】', '【Financial Personality View】')}</strong>
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        {content.financialPlan.personalityInsight}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* 未解锁状态 - 不应该出现，因为前端会检查 shareStatus */}
        {!content && !generating && (
          <Card className="p-8 text-center">
            <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              {t('报告未解锁，请先分享或付费', 'Report locked. Please share or pay to unlock.')}
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
