'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge, Spinner } from '@/components/ui/misc'
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, MessageCircle, ExternalLink } from 'lucide-react'

interface ReportData {
  id: number
  status: string
  decryptedContent: {
    marketAnalysis?: {
      opportunity: string
      target_customer: string
      market_trend: string
      competitive_landscape: string
    }
    strategyPlan?: {
      core_positioning: string
      differentiation: string
      pricing_strategy: string
      channel_strategy: string
    }
    executionPlan?: {
      quick_wins: string[]
      action_steps: string[]
      timeline: string[]
      resource_needed: string
    }
    financialPlan?: {
      investment_estimate: string
      ROI_analysis: string
      risk_level: string
      break_even: string
    }
  } | null
  expires_at: string | null
  created_at: string
}

const STATUS_LABELS = {
  pending_payment: { zh: '待支付', en: 'Pending Payment' },
  generating: { zh: '生成中', en: 'Generating' },
  completed: { zh: '已完成', en: 'Completed' },
  failed: { zh: '失败', en: 'Failed' },
  expired: { zh: '已过期', en: 'Expired' },
}

// E2: 报告生成阶段
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

const SECTION_TITLES = {
  marketAnalysis: { zh: '市场分析', en: 'Market Analysis' },
  strategyPlan: { zh: '策略规划', en: 'Strategy Plan' },
  executionPlan: { zh: '执行计划', en: 'Execution Plan' },
  financialPlan: { zh: '财务分析', en: 'Financial Plan' },
}

export default function ReportPage() {
  const router = useRouter()
  const params = useParams()
  const lang = (params?.lang as string) || 'zh'
  const reportId = params?.id as string

  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // E2: 生成进度状态
  const [generationStep, setGenerationStep] = useState(0)
  const [generationProgress, setGenerationProgress] = useState(0)

  // E2: 轮询获取报告状态
  useEffect(() => {
    fetchReport()
  }, [reportId])

  // E2: 当报告生成中时，轮询更新进度
  useEffect(() => {
    if (report?.status !== 'generating') return

    const interval = setInterval(() => {
      fetchReport()
    }, 5000) // 每5秒轮询

    return () => clearInterval(interval)
  }, [report?.status, reportId])

  // E2: 根据时间计算生成进度（模拟）
  useEffect(() => {
    if (report?.status !== 'generating') return

    const startTime = new Date(report.created_at).getTime()
    const estimatedTime = 180000 // 3分钟
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
  }, [report?.status, report?.created_at, lang])

  const fetchReport = async () => {
    if (!reportId) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error('Failed to fetch report')
      }

      const data = await res.json()
      setReport(data)

      // 如果已完成，重置进度
      if (data.status === 'completed') {
        setGenerationProgress(100)
        setGenerationStep(GENERATION_STEPS[lang as 'zh' | 'en'].length - 1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const t = (zh: string, en: string) => lang === 'en' ? en : zh
  const getStatusLabel = (status: string) => {
    const labels = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || { zh: status, en: status }
    return lang === 'en' ? labels.en : labels.zh
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#161616] flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="text-[#3ec489] mx-auto mb-4" />
          <p className="text-[#a3a3a3]">{t('加载报告中...', 'Loading report...')}</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#161616] flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white mb-4">{error || t('报告不存在', 'Report not found')}</p>
          <Button onClick={() => router.push(`/${lang}/dashboard`)}>
            {t('返回首页', 'Go to Dashboard')}
          </Button>
        </Card>
      </div>
    )
  }

  const content = report.decryptedContent

  return (
    <div className="min-h-screen bg-[#161616]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1f1f1f]/90 backdrop-blur-xl border-b border-[#2e2e2e]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push(`/${lang}/dashboard`)}
            className="p-2 hover:bg-[#2e2e2e] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#a3a3a3]" />
          </button>

          <div className="flex items-center gap-3">
            <Badge
              variant={
                report.status === 'completed' ? 'success' :
                report.status === 'generating' ? 'warning' : 'secondary'
              }
            >
              {getStatusLabel(report.status)}
            </Badge>
          </div>

          {/* Follow-up Button (only for completed) */}
          {report.status === 'completed' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.push(`/${lang}/followup/${report.id}`)}
              leftIcon={<MessageCircle className="w-4 h-4" />}
            >
              {t('追问', 'Follow-up')}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {report.status === 'pending_payment' && (
          <Card className="p-8 mb-8 text-center bg-[#2e2e2e]/50 border-[#3ec489]/30">
            <Clock className="w-12 h-12 text-[#3ec489] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              {t('等待支付', 'Pending Payment')}
            </h2>
            <p className="text-[#a3a3a3] mb-6">
              {t('请完成支付以获取完整报告', 'Please complete payment to view the full report')}
            </p>
            <Button onClick={() => router.push(`/${lang}/payment/${report.id}`)}>
              {t('去支付', 'Pay Now')}
            </Button>
          </Card>
        )}

        {report.status === 'generating' && (
          <Card className="p-8 mb-8 bg-[#2e2e2e]/50 border-[#3ec489]/30">
            <div className="text-center mb-6">
              <Spinner size="lg" className="text-[#3ec489] mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">
                {t('报告生成中...', 'Generating Report...')}
              </h2>
              <p className="text-[#a3a3a3]">
                {t('预计需要3分钟，请稍候', 'Estimated 3 minutes, please wait')}
              </p>
            </div>

            {/* E2: 生成进度可视化 */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-[#a3a3a3]">
                <span>{t('生成进度', 'Progress')}</span>
                <span>{generationProgress}%</span>
              </div>
              <div className="w-full h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3ec489] transition-all duration-500"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>

              {/* 生成阶段列表 */}
              <div className="mt-6 space-y-2">
                {(GENERATION_STEPS[lang as 'zh' | 'en'] as typeof GENERATION_STEPS.zh).map((step, index) => {
                  const isCompleted = index < generationStep
                  const isCurrent = index === generationStep
                  const isPending = index > generationStep

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        isCurrent ? 'bg-[#3ec489]/10 border border-[#3ec489]/30' :
                        isCompleted ? 'bg-[#3ec489]/5' : 'bg-[#1f1f1f]'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-[#3ec489]' :
                        isCurrent ? 'bg-[#3ec489]/50 animate-pulse' : 'bg-[#2e2e2e]'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : isCurrent ? (
                          <Spinner size="sm" className="text-white" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#525252]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          isCurrent ? 'text-white' : isCompleted ? 'text-[#3ec489]' : 'text-[#737373]'
                        }`}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-[#737373]">{step.description}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        )}

        {content && (
          <div className="space-y-6">
            {/* Market Analysis */}
            {content.marketAnalysis && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#3ec489]/20 flex items-center justify-center">
                    <span className="text-[#3ec489] font-bold">1</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {t('市场分析', 'Market Analysis')}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[#737373] mb-1">{t('市场机会', 'Market Opportunity')}</p>
                    <p className="text-white">{content.marketAnalysis.opportunity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#737373] mb-1">{t('目标客户', 'Target Customer')}</p>
                    <p className="text-white">{content.marketAnalysis.target_customer}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[#737373] mb-1">{t('市场趋势', 'Market Trend')}</p>
                      <p className="text-white text-sm">{content.marketAnalysis.market_trend}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#737373] mb-1">{t('竞争格局', 'Competitive Landscape')}</p>
                      <p className="text-white text-sm">{content.marketAnalysis.competitive_landscape}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Strategy Plan */}
            {content.strategyPlan && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#3ec489]/20 flex items-center justify-center">
                    <span className="text-[#3ec489] font-bold">2</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {t('策略规划', 'Strategy Plan')}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[#737373] mb-1">{t('核心定位', 'Core Positioning')}</p>
                    <p className="text-white font-medium">{content.strategyPlan.core_positioning}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[#737373] mb-1">{t('差异化策略', 'Differentiation')}</p>
                      <p className="text-white text-sm">{content.strategyPlan.differentiation}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#737373] mb-1">{t('定价策略', 'Pricing Strategy')}</p>
                      <p className="text-white text-sm">{content.strategyPlan.pricing_strategy}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Execution Plan */}
            {content.executionPlan && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#3ec489]/20 flex items-center justify-center">
                    <span className="text-[#3ec489] font-bold">3</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {t('执行计划', 'Execution Plan')}
                  </h3>
                </div>
                <div className="space-y-4">
                  {content.executionPlan.quick_wins && content.executionPlan.quick_wins.length > 0 && (
                    <div>
                      <p className="text-sm text-[#3ec489] mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {t('快速见效', 'Quick Wins')}
                      </p>
                      <ul className="space-y-1">
                        {content.executionPlan.quick_wins.map((item, i) => (
                          <li key={i} className="text-white text-sm flex items-start gap-2">
                            <span className="text-[#3ec489]">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {content.executionPlan.action_steps && content.executionPlan.action_steps.length > 0 && (
                    <div>
                      <p className="text-sm text-[#737373] mb-2">{t('执行步骤', 'Action Steps')}</p>
                      <ol className="space-y-2">
                        {content.executionPlan.action_steps.map((step, i) => (
                          <li key={i} className="text-white text-sm flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#2e2e2e] flex items-center justify-center text-xs text-[#737373]">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-[#737373] mb-1">{t('所需资源', 'Resources Needed')}</p>
                    <p className="text-white text-sm">{content.executionPlan.resource_needed}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Financial Plan */}
            {content.financialPlan && (
              <Card className="p-6 border-[#3ec489]/30">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#3ec489]/20 flex items-center justify-center">
                    <span className="text-[#3ec489] font-bold">4</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {t('财务分析', 'Financial Analysis')}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#737373] mb-1">{t('投资估算', 'Investment Estimate')}</p>
                    <p className="text-white font-medium">{content.financialPlan.investment_estimate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#737373] mb-1">{t('回本时间', 'Break-even')}</p>
                    <p className="text-white">{content.financialPlan.break_even}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-[#737373] mb-1">{t('ROI分析', 'ROI Analysis')}</p>
                    <p className="text-white text-sm">{content.financialPlan.ROI_analysis}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-[#737373] mb-1">{t('风险等级', 'Risk Level')}</p>
                    <Badge
                      variant={
                        content.financialPlan.risk_level?.toLowerCase().includes('低') ||
                        content.financialPlan.risk_level?.toLowerCase().includes('low')
                          ? 'success'
                          : content.financialPlan.risk_level?.toLowerCase().includes('高') ||
                            content.financialPlan.risk_level?.toLowerCase().includes('high')
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {content.financialPlan.risk_level}
                    </Badge>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {report.status === 'completed' && (
          <div className="mt-8 text-center">
            <p className="text-[#525252] text-sm mb-4">
              {t('72小时+10次追问保障', '72h + 10 queries follow-up window')}
            </p>
            <Button
              variant="secondary"
              onClick={() => router.push(`/${lang}/followup/${report.id}`)}
              leftIcon={<MessageCircle className="w-4 h-4" />}
            >
              {t('基于报告追问', 'Ask follow-up questions about this report')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}