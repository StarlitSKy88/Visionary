'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge, Avatar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import {
  Bot,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Building2,
  Users,
  Target,
  MessageCircle,
  Zap,
  ChevronRight,
} from 'lucide-react'

// 行业选项
const INDUSTRIES = [
  { value: 'catering', label: '餐饮服务', icon: '🍜' },
  { value: 'retail', label: '零售门店', icon: '🏪' },
  { value: 'manufacturing', label: '制造加工', icon: '🏭' },
  { value: 'service', label: '生活服务', icon: '✨' },
  { value: 'technology', label: '科技互联网', icon: '💻' },
  { value: 'other', label: '其他行业', icon: '📦' },
]

// 规模选项
const SCALES = [
  { value: 'micro', label: '1-5人', desc: '个体经营' },
  { value: 'small', label: '6-20人', desc: '小微企业' },
  { value: 'medium', label: '21-50人', desc: '中小企业' },
  { value: 'large', label: '50人以上', desc: '成长型企业' },
]

// 痛点选项
const PAIN_POINTS = [
  '琐事太多，忙不过来',
  '审批流程慢，效率低',
  '客户管理混乱，容易流失',
  '员工管理困难，流动大',
  '数据分散，难以分析',
  '营销推广效果差',
  '库存管理混乱',
  '财务账目不清楚',
]

// 沟通风格
const COMMUNICATION_STYLES = [
  { value: 'formal', label: '正式', desc: '简洁专业，少说废话', icon: '💼' },
  { value: 'friendly', label: '友好', desc: '亲切温暖，像朋友', icon: '🤝' },
  { value: 'casual', label: '随意', desc: '轻松幽默，少客套', icon: '😄' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    companyName: '',
    industry: '',
    scale: '',
    position: '',
    painPoints: [] as string[],
    customPainPoint: '',
    goals: '',
    communicationStyle: 'friendly',
    preferredResponseLength: 'medium',
  })

  const totalSteps = 3

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const togglePainPoint = (point: string) => {
    setFormData(prev => ({
      ...prev,
      painPoints: prev.painPoints.includes(point)
        ? prev.painPoints.filter(p => p !== point)
        : [...prev.painPoints, point]
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        addToast('success', 'AI 员工正在为您准备中...')
        router.push('/chat/new')
      } else {
        const data = await res.json()
        addToast('error', data.error || '提交失败')
      }
    } catch (err) {
      addToast('error', '网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-sb-gray-50 dark:bg-[#111827] flex items-center justify-center px-4 py-12 transition-colors relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 bg-radial" />

      {/* Decorative Elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-supabase/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-supabase/3 rounded-full blur-3xl" />

      <div className="w-full max-w-2xl relative">
        {/* Logo */}
        <div className="text-center mb-6 fade-in-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-supabase shadow-lg shadow-supabase/20 mb-5">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-sb-gray-900 dark:text-white mb-1">
            快速配置
          </h1>
          <p className="text-sb-gray-500 text-sm">
            告诉我一些关于你的信息，让我为你打造专属AI员工
          </p>
        </div>

        <Card className="p-6 shadow-xl shadow-sb-gray-900/5 border-sb-gray-200/50 dark:shadow-none dark:border-sb-gray-700/50 fade-in-up" style={{ animationDelay: '100ms' }} variant="elevated" padding="lg">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i + 1 <= step ? 'w-16 bg-supabase' : 'w-16 bg-sb-gray-200 dark:bg-sb-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Step 1: 基础信息 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-supabase/10 mb-3">
                  <Building2 className="w-6 h-6 text-supabase" />
                </div>
                <h2 className="text-xl font-semibold text-sb-gray-900 dark:text-white mb-1">
                  关于您和您的企业
                </h2>
                <p className="text-sb-gray-500 text-sm">帮助我更好地为您服务</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="您的称呼"
                  placeholder="怎么称呼您？"
                  value={formData.displayName}
                  onChange={e => updateForm('displayName', e.target.value)}
                />
                <Input
                  label="企业名称"
                  placeholder="公司/店铺名称"
                  value={formData.companyName}
                  onChange={e => updateForm('companyName', e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-sb-gray-700 dark:text-sb-gray-300">
                  所属行业
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind.value}
                      onClick={() => updateForm('industry', ind.value)}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        formData.industry === ind.value
                          ? 'border-supabase bg-supabase/5 shadow-[0_0_0_2px_rgba(62,196,137,0.2)]'
                          : 'border-sb-gray-200 dark:border-sb-gray-700 hover:border-sb-gray-300 dark:hover:border-sb-gray-600 bg-white dark:bg-sb-gray-800'
                      }`}
                    >
                      <span className="text-2xl mb-1 block">{ind.icon}</span>
                      <span className="text-xs font-medium text-sb-gray-900 dark:text-sb-gray-100">{ind.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-sb-gray-700 dark:text-sb-gray-300">
                  企业规模
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SCALES.map(scale => (
                    <button
                      key={scale.value}
                      onClick={() => updateForm('scale', scale.value)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        formData.scale === scale.value
                          ? 'border-supabase bg-supabase/5 shadow-[0_0_0_2px_rgba(62,196,137,0.2)]'
                          : 'border-sb-gray-200 dark:border-sb-gray-700 hover:border-sb-gray-300 dark:hover:border-sb-gray-600 bg-white dark:bg-sb-gray-800'
                      }`}
                    >
                      <span className="text-sm font-semibold text-sb-gray-900 dark:text-sb-gray-100">{scale.label}</span>
                      <span className="text-xs text-sb-gray-500 block mt-0.5">{scale.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 痛点与目标 */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-error/10 mb-3">
                  <Target className="w-6 h-6 text-error" />
                </div>
                <h2 className="text-xl font-semibold text-sb-gray-900 dark:text-white mb-1">
                  您最头疼什么问题？
                </h2>
                <p className="text-sb-gray-500 text-sm">选择最困扰您的（可多选）</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {PAIN_POINTS.map(point => (
                  <button
                    key={point}
                    onClick={() => togglePainPoint(point)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formData.painPoints.includes(point)
                        ? 'border-error bg-error/5 shadow-[0_0_0_2px_rgba(242,93,68,0.2)]'
                        : 'border-sb-gray-200 dark:border-sb-gray-700 hover:border-sb-gray-300 dark:hover:border-sb-gray-600 bg-white dark:bg-sb-gray-800'
                    }`}
                  >
                    <span className="text-sm flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        formData.painPoints.includes(point)
                          ? 'border-error bg-error text-white'
                          : 'border-sb-gray-300 dark:border-sb-gray-600'
                      }`}>
                        {formData.painPoints.includes(point) && <Check className="w-3 h-3" />}
                      </span>
                      {point}
                    </span>
                  </button>
                ))}
              </div>

              <Textarea
                label="还有其他痛点吗？"
                placeholder="补充说明..."
                value={formData.customPainPoint}
                onChange={e => updateForm('customPainPoint', e.target.value)}
              />

              <Textarea
                label="您最希望 AI 帮您做什么？"
                placeholder="例如：自动处理员工的请假审批、每周生成经营报表..."
                value={formData.goals}
                onChange={e => updateForm('goals', e.target.value)}
              />
            </div>
          )}

          {/* Step 3: 偏好设置 */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-supabase/10 mb-3">
                  <MessageCircle className="w-6 h-6 text-supabase" />
                </div>
                <h2 className="text-xl font-semibold text-sb-gray-900 dark:text-white mb-1">
                  最后几个小问题
                </h2>
                <p className="text-sb-gray-500 text-sm">帮我更好地了解您的沟通风格</p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-sb-gray-700 dark:text-sb-gray-300">
                  喜欢怎么和 AI 交流？
                </label>
                <div className="space-y-2">
                  {COMMUNICATION_STYLES.map(style => (
                    <button
                      key={style.value}
                      onClick={() => updateForm('communicationStyle', style.value)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        formData.communicationStyle === style.value
                          ? 'border-supabase bg-supabase/5 shadow-[0_0_0_2px_rgba(62,196,137,0.2)]'
                          : 'border-sb-gray-200 dark:border-sb-gray-700 hover:border-sb-gray-300 dark:hover:border-sb-gray-600 bg-white dark:bg-sb-gray-800'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-xl">{style.icon}</span>
                        <span className="font-semibold text-sb-gray-900 dark:text-sb-gray-100">{style.label}</span>
                        <span className="text-sm text-sb-gray-500">{style.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-sb-gray-700 dark:text-sb-gray-300">
                  回答长度
                </label>
                <div className="flex gap-3">
                  {[
                    { value: 'short', label: '简短', icon: '•' },
                    { value: 'medium', label: '中等', icon: '••' },
                    { value: 'long', label: '详细', icon: '•••' },
                  ].map(len => (
                    <button
                      key={len.value}
                      onClick={() => updateForm('preferredResponseLength', len.value)}
                      className={`flex-1 py-3 rounded-xl border transition-all ${
                        formData.preferredResponseLength === len.value
                          ? 'border-supabase bg-supabase/5 shadow-[0_0_0_2px_rgba(62,196,137,0.2)] font-semibold text-supabase'
                          : 'border-sb-gray-200 dark:border-sb-gray-700 text-sb-gray-600 dark:text-sb-gray-400 hover:border-sb-gray-300'
                      }`}
                    >
                      <span className="text-supabase mr-1">{len.icon}</span>
                      {len.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-br from-sb-gray-50 to-sb-gray-100 dark:from-sb-gray-800 dark:to-sb-gray-700 rounded-xl p-5 border border-sb-gray-200 dark:border-sb-gray-600">
                <h3 className="text-sm font-semibold text-sb-gray-700 dark:text-sb-gray-300 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-supabase" />
                  您的专属 AI 员工将配置为：
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-sb-gray-500 text-xs">行业</p>
                    <p className="font-medium text-sb-gray-900 dark:text-white">
                      {INDUSTRIES.find(i => i.value === formData.industry)?.label || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sb-gray-500 text-xs">规模</p>
                    <p className="font-medium text-sb-gray-900 dark:text-white">
                      {SCALES.find(s => s.value === formData.scale)?.label || '-'}
                    </p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sb-gray-500 text-xs">痛点</p>
                    <p className="font-medium text-sb-gray-900 dark:text-white">
                      {formData.painPoints.length > 0 ? formData.painPoints.join('、') : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-sb-gray-200 dark:border-sb-gray-700">
            <Button
              variant="outline"
              onClick={() => step > 1 && setStep(s => s - 1)}
              disabled={step === 1}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              上一步
            </Button>

            {step < totalSteps ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={
                  (step === 1 && (!formData.industry || !formData.scale)) ||
                  (step === 2 && formData.painPoints.length === 0)
                }
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                下一步
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                loading={loading}
                leftIcon={!loading && <Zap className="w-4 h-4" />}
                className="shadow-lg shadow-supabase/20"
              >
                {loading ? '创建中...' : '创建我的 AI 员工'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </main>
  )
}
