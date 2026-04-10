'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { ArrowRight, Bot, Download, Gift, User, Users } from 'lucide-react'

interface User {
  id: number
  email: string
  industry: string
  inviteCode: string
  inviteProgress: number
  refunded: boolean
}

interface Agent {
  id: number
  name: string
  industry: string
  description: string
  score: number
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user?.id) {
      loadAgents()
    }
  }, [user?.id])

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('加载用户数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAgents = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/agents/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setAgents(data.agents || [])
      }
    } catch (error) {
      console.error('加载Agent列表失败:', error)
    }
  }

  const handleExport = async (agentId: number) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/agents/${agentId}/export?format=json`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `agent-${agentId}.json`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('导出失败:', error)
    }
  }

  const handleCheckRefund = async () => {
    if (!user) return

    try {
      const res = await fetch('/api/orders/check-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await res.json()
      if (data.success) {
        addToast('success', data.message)
      } else {
        addToast('info', `还需邀请 ${data.required - data.progress} 人`)
      }
    } catch (error) {
      console.error('检查退款失败:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#81a1c1]">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#2e3440]">
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 glass border-b border-[rgba(136,192,208,0.1)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#88c0d0] flex items-center justify-center text-[#2e3440] font-bold text-lg">
              AI
            </div>
            <span className="font-semibold text-[#eceff4]">AI经营助手</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#81a1c1]">{user?.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem('token')
                router.push('/')
              }}
            >
              退出
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 欢迎区 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#eceff4] mb-2">
            欢迎回来 👋
          </h1>
          <p className="text-[#81a1c1]">
            管理你的AI助手，随时查看和导出配置
          </p>
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/create-agent">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[rgba(136,192,208,0.1)] flex items-center justify-center">
                  <Bot className="w-6 h-6 text-[#88c0d0]" />
                </div>
                <div>
                  <div className="font-semibold text-[#eceff4]">创建新助手</div>
                  <div className="text-sm text-[#81a1c1]">描述痛点，AI帮你生成</div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#81a1c1] ml-auto" />
              </div>
            </Card>
          </Link>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={handleCheckRefund}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[rgba(163,190,140,0.1)] flex items-center justify-center">
                <Gift className="w-6 h-6 text-[#a3be8c]" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#eceff4]">邀请好友</div>
                <div className="text-sm text-[#81a1c1]">
                  {user?.refunded ? '已达标' : `${user?.inviteProgress || 0}/3 人`}
                </div>
              </div>
              {user?.refunded && (
                <Badge variant="success">已退款</Badge>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[rgba(136,192,208,0.08)] flex items-center justify-center">
                <User className="w-6 h-6 text-[#88c0d0]" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#eceff4]">我的邀请码</div>
                <div className="text-sm text-[#88c0d0] font-mono">{user?.inviteCode}</div>
              </div>
            </div>
          </Card>

          <Link href="/team">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[rgba(235,203,139,0.1)] flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#ebcb8b]" />
                </div>
                <div>
                  <div className="font-semibold text-[#eceff4]">团队管理</div>
                  <div className="text-sm text-[#81a1c1]">管理团队成员和请假</div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#81a1c1] ml-auto" />
              </div>
            </Card>
          </Link>
        </div>

        {/* Agent列表 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#eceff4]">我的AI助手</h2>
            {agents.length === 0 && (
              <Link href="/create-agent">
                <Button size="sm">创建第一个助手</Button>
              </Link>
            )}
          </div>

          {agents.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-[#81a1c1]" />
              </div>
              <h3 className="text-lg font-semibold text-[#eceff4] mb-2">
                还没有AI助手
              </h3>
              <p className="text-[#81a1c1] mb-4">
                创建你的第一个AI助手，开始提升经营效率
              </p>
              <Link href="/create-agent">
                <Button>立即创建</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <Card key={agent.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-[#eceff4]">{agent.name}</h3>
                      <p className="text-sm text-[#81a1c1]">{agent.industry}</p>
                    </div>
                    <Badge variant={agent.score >= 95 ? 'success' : 'default'}>
                      {agent.score}分
                    </Badge>
                  </div>
                  <p className="text-sm text-[#81a1c1] mb-4 line-clamp-2">
                    {agent.description}
                  </p>
                  <div className="flex gap-2">
                    <Link href={`/chat/${agent.id}`} className="flex-1" onClick={() => {
                      localStorage.setItem('currentAgent', JSON.stringify(agent))
                    }}>
                      <Button size="sm" className="w-full">
                        对话
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(agent.id)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
