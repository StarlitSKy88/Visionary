'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge, Spinner } from '@/components/ui/misc'
import { ArrowLeft, MessageCircle, Home } from 'lucide-react'

interface AgentResult {
  id?: number
  score: number
  industry: string
  name?: string
  description?: string
  roles: string[]
  constraints: string[]
  skills: string[]
  roi: {
    savedLabor: number
    reducedWaste: number
    monthlySaving: number
  }
}

interface AgentRound {
  name: string
  desc: string
}

const AGENT_ROUNDS: AgentRound[] = [
  { name: '需求理解官', desc: '清洗口语需求，提取关键词' },
  { name: '行业情报官', desc: '全网检索行业数据' },
  { name: '根因分析师', desc: '5Why挖掘真实需求' },
  { name: '方案架构师', desc: '设计Agent核心能力' },
  { name: '辩论评审官', desc: '多Agent辩论优化' },
  { name: '评分执行官', desc: '≥95分评分校验' },
]

export default function CreateAgentPage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<'input' | 'processing' | 'result'>('input')
  const [currentRound, setCurrentRound] = useState(0)
  const [result, setResult] = useState<AgentResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login')
    }
  }, [router])

  const handleGenerate = async () => {
    if (!input.trim()) return

    setLoading(true)
    setError('')
    setStage('processing')
    setCurrentRound(0)

    try {
      const token = localStorage.getItem('token')

      // 模拟进度更新
      const roundInterval = setInterval(() => {
        setCurrentRound(prev => Math.min(prev + 1, 5))
      }, 3000)

      const res = await fetch('/api/agents/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ input }),
      })

      clearInterval(roundInterval)

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || '生成失败')
      }

      const data = await res.json()

      if (data.success && data.agent) {
        setResult(data.agent)
        setCurrentRound(6)
        setStage('result')
      } else {
        throw new Error('生成失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试')
      setStage('input')
      setCurrentRound(0)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setStage('input')
    setResult(null)
    setCurrentRound(0)
    setError('')
  }

  const handleAccept = () => {
    if (result?.id) {
      router.push(`/chat/${result.id}`)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-[#2e3440]">
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 glass border-b border-[rgba(136,192,208,0.1)]">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回
              </Button>
            </Link>
            <span className="font-bold text-lg text-[#eceff4]">创建AI助手</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#81a1c1]">
            <span>当前剩余次数：</span>
            <span className="font-semibold text-primary">3次</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* 输入阶段 */}
        {stage === 'input' && (
          <Card className="p-8">
            <h1 className="text-2xl font-bold text-[#eceff4] mb-2">
              描述你的经营困难
            </h1>
            <p className="text-[#81a1c1] mb-6">
              用大白话说出你的痛点，AI帮你翻译成专业配置方案
            </p>

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如：我开了一家电子加工小厂，订单忽多忽少的，有时候一个月忙不过来，有时候又没活干。报价总是算不准，有时候报低了亏本，报高了丢单。库存也管不好，电子元器件有时候过期了才发现..."
              className="min-h-[200px]"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-[#81a1c1]">{input.length}/500字</span>
              <Button
                onClick={handleGenerate}
                disabled={!input.trim() || loading || input.length < 10}
                size="lg"
              >
                {loading ? '生成中...' : '开始生成AI助手'}
              </Button>
            </div>

            {error && (
              <p className="text-sm text-[#bf616a] mt-4">{error}</p>
            )}
          </Card>
        )}

        {/* 处理阶段 */}
        {stage === 'processing' && (
          <Card className="p-8">
            <h1 className="text-2xl font-bold text-[#eceff4] mb-6 text-center">
              AI正在深度思考...
            </h1>

            <div className="space-y-4">
              {AGENT_ROUNDS.map((round, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    index === currentRound
                      ? 'bg-[rgba(136,192,208,0.08)] border border-[rgba(136,192,208,0.2)]'
                      : index < currentRound
                      ? 'bg-[rgba(163,190,140,0.1)]'
                      : 'bg-[rgba(59,66,82,0.5)]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index <= currentRound
                        ? 'bg-[#88c0d0] text-[#2e3440]'
                        : 'bg-[#434c5e] text-[#81a1c1]'
                    }`}
                  >
                    {index < currentRound ? '✓' : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[#eceff4]">{round.name}</div>
                    <div className="text-sm text-[#81a1c1]">{round.desc}</div>
                  </div>
                  {index === currentRound && (
                    <Spinner size="sm" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 结果阶段 */}
        {stage === 'result' && result && (
          <div className="space-y-6">
            {/* 评分卡片 */}
            <Card className="bg-gradient-to-r from-[#88c0d0] to-[#5e9eb5] p-8 text-[#2e3440]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg opacity-80">综合评分</div>
                  <div className="text-5xl font-bold mt-2">{result.score}</div>
                  {result.name && (
                    <div className="text-lg mt-2">{result.name}</div>
                  )}
                </div>
                <div className="text-6xl">🎉</div>
              </div>
            </Card>

            {/* 详细结果 */}
            <Card className="p-8 space-y-6">
              <div>
                <h3 className="text-sm text-[#81a1c1] mb-2">识别行业</h3>
                <p className="text-lg font-semibold text-[#eceff4]">{result.industry}</p>
              </div>

              {result.description && (
                <div>
                  <h3 className="text-sm text-[#81a1c1] mb-2">功能描述</h3>
                  <p className="text-[#eceff4]">{result.description}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm text-[#81a1c1] mb-2">核心岗位</h3>
                <div className="flex flex-wrap gap-2">
                  {result.roles.map((role, i) => (
                    <Badge key={i} variant="primary">{role}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm text-[#81a1c1] mb-2">业务约束</h3>
                <ul className="space-y-1">
                  {result.constraints.map((c, i) => (
                    <li key={i} className="text-[#eceff4]">• {c}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm text-[#81a1c1] mb-2">Agent能力</h3>
                <ul className="space-y-1">
                  {result.skills.map((s, i) => (
                    <li key={i} className="text-[#eceff4]">✓ {s}</li>
                  ))}
                </ul>
              </div>

              {/* ROI */}
              {result.roi && (
                <div className="bg-[rgba(163,190,140,0.08)] rounded-xl p-6 border border-[rgba(163,190,140,0.15)]">
                  <h3 className="font-semibold text-[#a3be8c] mb-4">💰 预估价值</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-[#a3be8c]">{result.roi.savedLabor}</div>
                      <div className="text-sm text-[#81a1c1]">班次/月</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#a3be8c]">{result.roi.reducedWaste}%</div>
                      <div className="text-sm text-[#81a1c1]">降低货损</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#a3be8c]">¥{result.roi.monthlySaving}</div>
                      <div className="text-sm text-[#81a1c1]">月省费用</div>
                    </div>
                  </div>
                  <p className="text-xs text-[#81a1c1] text-center mt-4">
                    *基于行业平均数据估算，仅供参考
                  </p>
                </div>
              )}
            </Card>

            {/* 操作按钮 */}
            <div className="flex gap-4">
              <Button variant="outline" onClick={handleRetry} size="lg" className="flex-1">
                不满意？重新生成
              </Button>
              <Button onClick={handleAccept} size="lg" className="flex-1">
                <MessageCircle className="w-4 h-4 mr-2" />
                开始对话
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
