'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge, Avatar, Progress, Divider } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import {
  ArrowRight,
  Bot,
  Download,
  Gift,
  User,
  Users,
  LogOut,
  Sparkles,
  TrendingUp,
  Crown,
  ChevronRight,
  Zap,
  MessageSquare,
  Settings,
  Plus,
  ExternalLink
} from 'lucide-react'

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
      <div className="min-h-screen flex items-center justify-center bg-[#161616]">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#3ec489] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#737373]">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#161616]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-[#2e2e2e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3ec489] to-[#2eb06c] flex items-center justify-center shadow-lg shadow-[#3ec489]/20 group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-white">AI经营助手</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#262626] border border-[#333333]">
              <Avatar fallback={user?.email?.[0]?.toUpperCase() || 'U'} size="sm" />
              <span className="text-sm text-[#a3a3a3] hidden sm:block">{user?.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem('token')
                router.push('/')
              }}
              leftIcon={<LogOut className="w-4 h-4" />}
              className="text-[#a3a3a3] hover:text-white"
            >
              退出
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8 fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[#3ec489]" />
            <span className="text-sm text-[#3ec489] font-medium">欢迎回来</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {user?.email?.split('@')[0] || '用户'}
          </h1>
          <p className="text-[#a3a3a3]">
            管理你的AI助手，随时查看和导出配置
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 fade-in-up" style={{ animationDelay: '100ms' }}>
          <Card className="p-5 bg-gradient-to-br from-[#3ec489]/10 to-transparent border-[#3ec489]/20" padding="none">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#3ec489]/10 flex items-center justify-center">
                <Bot className="w-6 h-6 text-[#3ec489]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{agents.length}</p>
                <p className="text-sm text-[#737373]">AI助手数量</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-[#3ec489]/10 to-transparent border-[#3ec489]/20" padding="none">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#3ec489]/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#3ec489]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{user?.inviteProgress || 0}</p>
                <p className="text-sm text-[#737373]">已邀请人数</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-[#f5b100]/10 to-transparent border-[#f5b100]/20" padding="none">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#f5b100]/10 flex items-center justify-center">
                <Gift className="w-6 h-6 text-[#f5b100]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {user?.refunded ? '已退款' : '进行中'}
                </p>
                <p className="text-sm text-[#737373]">退款状态</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 fade-in-up" style={{ animationDelay: '150ms' }}>
          <h2 className="text-lg font-semibold text-white mb-4">快捷操作</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/create-agent">
              <Card className="p-5 group hover:border-[#3ec489]/30 hover:shadow-lg hover:shadow-[#3ec489]/5 transition-all duration-200" padding="none">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3ec489] to-[#2eb06c] flex items-center justify-center shadow-lg shadow-[#3ec489]/20 group-hover:scale-105 transition-transform">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white flex items-center gap-1">
                      创建新助手
                      <ChevronRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                    <div className="text-sm text-[#737373] truncate">描述痛点，AI帮你生成</div>
                  </div>
                </div>
              </Card>
            </Link>

            <Card
              className="p-5 group cursor-pointer hover:border-[#3ec489]/30 hover:shadow-lg hover:shadow-[#3ec489]/5 transition-all duration-200"
              padding="none"
              onClick={handleCheckRefund}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#3ec489] flex items-center justify-center shadow-lg shadow-[#3ec489]/20 group-hover:scale-105 transition-transform">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white flex items-center gap-1">
                    邀请好友
                    <Badge variant={user?.refunded ? 'success' : 'warning'} size="sm">
                      {user?.refunded ? '已达标' : `${user?.inviteProgress || 0}/3`}
                    </Badge>
                  </div>
                  <div className="text-sm text-[#737373]">完成全额退款</div>
                </div>
              </div>
            </Card>

            <Card className="p-5" padding="none">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#3ec489]/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-[#3ec489]" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">我的邀请码</div>
                  <div className="text-sm font-mono text-[#3ec489]">{user?.inviteCode || '------'}</div>
                </div>
              </div>
            </Card>

            <Link href="/team">
              <Card className="p-5 group hover:border-[#f5b100]/30 hover:shadow-lg hover:shadow-[#f5b100]/5 transition-all duration-200" padding="none">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#f5b100] flex items-center justify-center shadow-lg shadow-[#f5b100]/20 group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white flex items-center gap-1">
                      团队管理
                      <ChevronRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                    <div className="text-sm text-[#737373]">管理团队成员</div>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </div>

        <Divider className="my-8 fade-in-up" style={{ animationDelay: '200ms' }} />

        {/* Agent List */}
        <div className="fade-in-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">我的AI助手</h2>
              {agents.length > 0 && (
                <Badge variant="secondary" size="sm">{agents.length} 个助手</Badge>
              )}
            </div>
            {agents.length === 0 && (
              <Link href="/create-agent">
                <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>创建第一个助手</Button>
              </Link>
            )}
          </div>

          {agents.length === 0 ? (
            <Card className="p-12 text-center border-[#2e2e2e]" padding="lg" variant="outline">
              <div className="w-20 h-20 rounded-2xl bg-[#262626] flex items-center justify-center mx-auto mb-5">
                <Bot className="w-10 h-10 text-[#737373]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                还没有AI助手
              </h3>
              <p className="text-[#737373] mb-6 max-w-sm mx-auto">
                创建你的第一个AI助手，开始提升经营效率
              </p>
              <Link href="/create-agent">
                <Button leftIcon={<Sparkles className="w-4 h-4" />}>
                  立即创建
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {agents.map((agent, index) => (
                <Card
                  key={agent.id}
                  className="p-5 hover:shadow-lg transition-all duration-200 group fade-in-up border-[#2e2e2e]"
                  style={{ animationDelay: `${300 + index * 50}ms` }}
                  variant="elevated"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3ec489]/20 to-[#3ec489]/5 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-[#3ec489]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{agent.name}</h3>
                        <p className="text-xs text-[#737373]">{agent.industry}</p>
                      </div>
                    </div>
                    <Badge variant={agent.score >= 95 ? 'success' : 'secondary'} size="sm">
                      <Crown className="w-3 h-3 mr-1" />
                      {agent.score}分
                    </Badge>
                  </div>

                  <p className="text-sm text-[#a3a3a3] mb-4 line-clamp-2 leading-relaxed">
                    {agent.description}
                  </p>

                  <Divider className="my-4" />

                  <div className="flex gap-2">
                    <Link href={`/chat/${agent.id}`} className="flex-1" onClick={() => {
                      localStorage.setItem('currentAgent', JSON.stringify(agent))
                    }}>
                      <Button size="sm" className="w-full group-hover:shadow-md transition-shadow" leftIcon={<MessageSquare className="w-4 h-4" />}>
                        对话
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(agent.id)}
                      leftIcon={<Download className="w-4 h-4" />}
                    >
                      导出
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
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
