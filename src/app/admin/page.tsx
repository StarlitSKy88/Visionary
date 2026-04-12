'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bot } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n, interpolate } from '@/i18n'

type Tab = 'stats' | 'users' | 'orders' | 'token' | 'knowledge'
type LoginState = 'idle' | 'loading' | 'error'

interface Stats {
  totalUsers: number
  totalAgents: number
  totalOrders: number
  totalRevenue: number
  todayOrders: number
  todayTokens: number
  totalTokens: number
  avgLatency: number
  totalCalls?: number
}

interface User {
  id: number
  email: string
  industry: string
  scale: string
  inviteCode: string
  inviteProgress: number
  refunded: boolean
  createdAt: string
}

interface Order {
  id: number
  userId: number
  userEmail: string
  agentId: number
  amount: number
  status: string
  tradeNo: string
  createdAt: string
}

interface TokenStats {
  stats: Stats
  byModel: Array<{ provider: string; model: string; calls: number; inputTokens: number; outputTokens: number }>
  byTask: Array<{ taskType: string; calls: number; inputTokens: number; outputTokens: number }>
}

export default function AdminPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginKey, setLoginKey] = useState('')
  const [loginState, setLoginState] = useState<LoginState>('idle')
  const [activeTab, setActiveTab] = useState<Tab>('stats')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null)
  const [loading, setLoading] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/stats`, {
      headers: { 'x-admin-key': loginKey },
    })
    if (res.ok) {
      const data = await res.json()
      setStats(data.stats)
    }
  }, [API_URL, loginKey])

  const fetchUsers = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/users`, {
      headers: { 'x-admin-key': loginKey },
    })
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users)
    }
  }, [API_URL, loginKey])

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/orders`, {
      headers: { 'x-admin-key': loginKey },
    })
    if (res.ok) {
      const data = await res.json()
      setOrders(data.orders)
    }
  }, [API_URL, loginKey])

  const fetchTokenStats = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/token-stats`, {
      headers: { 'x-admin-key': loginKey },
    })
    if (res.ok) {
      const data = await res.json()
      setTokenStats(data)
    }
  }, [API_URL, loginKey])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginState('loading')
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { 'x-admin-key': loginKey },
      })
      if (res.ok) {
        setIsAuthenticated(true)
        setLoginState('idle')
        const data = await res.json()
        setStats(data.stats)
      } else {
        setLoginState('error')
      }
    } catch {
      setLoginState('error')
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats()
      fetchUsers()
      fetchOrders()
      fetchTokenStats()
    }
  }, [isAuthenticated, fetchStats, fetchUsers, fetchOrders, fetchTokenStats])

  const handleRefresh = () => {
    fetchStats()
    fetchUsers()
    fetchOrders()
    fetchTokenStats()
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#161616]">
        <Card className="w-full max-w-md border-[#2e2e2e] bg-[#1f1f1f] shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">{t.admin.loginTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder={t.admin.loginPlaceholder}
                value={loginKey}
                onChange={(e) => setLoginKey(e.target.value)}
              />
              {loginState === 'error' && (
                <p className="text-sm text-[#f25d44]">{t.admin.loginError}</p>
              )}
              <Button type="submit" className="w-full shadow-lg shadow-[#3ec489]/20" disabled={loginState === 'loading'}>
                {loginState === 'loading' ? t.common.loading : t.admin.login}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#161616]">
      {/* Header */}
      <header className="border-b border-[#2e2e2e] bg-[#1f1f1f]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3ec489] to-[#2eb06c] flex items-center justify-center shadow-lg shadow-[#3ec489]/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">{t.admin.title}</h1>
            </div>
            <nav className="flex gap-1">
              {(['stats', 'users', 'orders', 'token', 'knowledge'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-[#3ec489]/15 text-[#3ec489]'
                      : 'text-[#a3a3a3] hover:bg-[#262626] hover:text-white'
                  }`}
                >
                  {tab === 'stats' && t.admin.stats}
                  {tab === 'users' && t.admin.users}
                  {tab === 'orders' && t.admin.orders}
                  {tab === 'token' && t.admin.tokenAnalytics}
                  {tab === 'knowledge' && t.admin.knowledge}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-[#a3a3a3] hover:text-white">
              {t.admin.refresh}
            </Button>
            <Link href="/">
              <Button variant="outline" size="sm" className="border-[#333333] hover:bg-[#262626]">{t.admin.backHome}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-[#81a1c1]">{t.admin.totalUsers}</p>
                <p className="text-3xl font-bold text-[#88c0d0]">{stats.totalUsers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-[#81a1c1]">{t.admin.totalAgents}</p>
                <p className="text-3xl font-bold text-[#88c0d0]">{stats.totalAgents}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-[#81a1c1]">{t.admin.totalOrders}</p>
                <p className="text-3xl font-bold text-[#88c0d0]">{stats.totalOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-[#81a1c1]">{t.admin.totalRevenue}</p>
                <p className="text-3xl font-bold text-[#a3be8c]">¥{stats.totalRevenue}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-[#81a1c1]">{t.admin.todayOrders}</p>
                <p className="text-3xl font-bold text-[#88c0d0]">{stats.todayOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-[#81a1c1]">{t.admin.todayTokens}</p>
                <p className="text-3xl font-bold text-[#88c0d0]">{stats.todayTokens.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-[#81a1c1]">{t.admin.totalTokens}</p>
                <p className="text-3xl font-bold text-[#88c0d0]">{stats.totalTokens.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-[#81a1c1]">{t.admin.avgLatency}</p>
                <p className="text-3xl font-bold text-[#88c0d0]">{stats.avgLatency}ms</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle>{t.admin.users}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#81a1c1] mb-4">
                {interpolate(t.admin.usersCount, { count: users.length })}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(136,192,208,0.12)]">
                      <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.email}</th>
                      <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.industry}</th>
                      <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.scale}</th>
                      <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.inviteProgress}</th>
                      <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.refunded}</th>
                      <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.createdAt}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-[rgba(136,192,208,0.06)]">
                        <td className="py-2 px-2">{user.email}</td>
                        <td className="py-2 px-2">{user.industry}</td>
                        <td className="py-2 px-2">{user.scale}</td>
                        <td className="py-2 px-2">{user.inviteProgress}/3</td>
                        <td className="py-2 px-2">
                          <span className={user.refunded ? 'text-[#a3be8c]' : 'text-[#81a1c1]'}>
                            {user.refunded ? t.admin.paid : '-'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-[#81a1c1]">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#81a1c1]">
                          {t.admin.noData}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <Card>
            <CardHeader>
              <CardTitle>{t.admin.orders}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#81a1c1] mb-4">
                {interpolate(t.admin.ordersCount, { count: orders.length })}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(136,192,208,0.12)]">
                      <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.orderNo}</th>
                      <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.email}</th>
                      <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.amount}</th>
                      <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.status}</th>
                      <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.createdAt}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-[rgba(136,192,208,0.06)]">
                        <td className="py-2 px-2 font-mono text-xs">{order.tradeNo || `-`}</td>
                        <td className="py-2 px-2">{order.userEmail}</td>
                        <td className="py-2 px-2">¥{order.amount}</td>
                        <td className="py-2 px-2">
                          <span className={
                            order.status === 'paid' ? 'text-[#a3be8c]' :
                            order.status === 'pending' ? 'text-[#ebcb8b]' : 'text-[#81a1c1]'
                          }>
                            {order.status === 'paid' ? t.admin.paid : t.admin.pending}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-[#81a1c1]">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#81a1c1]">
                          {t.admin.noData}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Token Analytics Tab */}
        {activeTab === 'token' && tokenStats && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.admin.tokenAnalytics}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#81a1c1]">{t.admin.totalTokens}</p>
                    <p className="text-2xl font-bold">{tokenStats.stats.totalTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#81a1c1]">{t.admin.todayTokens}</p>
                    <p className="text-2xl font-bold">{tokenStats.stats.todayTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#81a1c1]">Total Calls</p>
                    <p className="text-2xl font-bold">{tokenStats.stats.totalCalls?.toLocaleString() || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#81a1c1]">{t.admin.avgLatency}</p>
                    <p className="text-2xl font-bold">{tokenStats.stats.avgLatency}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.admin.byModel}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(136,192,208,0.12)]">
                        <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.provider}</th>
                        <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.model}</th>
                        <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.calls}</th>
                        <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.inputTokens}</th>
                        <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.outputTokens}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenStats.byModel.map((row, i) => (
                        <tr key={i} className="border-b border-[rgba(136,192,208,0.06)]">
                          <td className="py-2 px-2">{row.provider}</td>
                          <td className="py-2 px-2">{row.model}</td>
                          <td className="py-2 px-2">{row.calls.toLocaleString()}</td>
                          <td className="py-2 px-2">{row.inputTokens.toLocaleString()}</td>
                          <td className="py-2 px-2">{row.outputTokens.toLocaleString()}</td>
                        </tr>
                      ))}
                      {tokenStats.byModel.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[#81a1c1]">
                            {t.admin.noData}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.admin.byTask}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(136,192,208,0.12)]">
                        <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.taskType}</th>
                        <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.calls}</th>
                        <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.inputTokens}</th>
                        <th className="text-left py-2 px-2 text-[#81a1c1]">{t.admin.outputTokens}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenStats.byTask.map((row, i) => (
                        <tr key={i} className="border-b border-[rgba(136,192,208,0.06)]">
                          <td className="py-2 px-2">{row.taskType}</td>
                          <td className="py-2 px-2">{row.calls.toLocaleString()}</td>
                          <td className="py-2 px-2">{row.inputTokens.toLocaleString()}</td>
                          <td className="py-2 px-2">{row.outputTokens.toLocaleString()}</td>
                        </tr>
                      ))}
                      {tokenStats.byTask.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-[#81a1c1]">
                            {t.admin.noData}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Knowledge Tab */}
        {activeTab === 'knowledge' && (
          <Card>
            <CardHeader>
              <CardTitle>{t.admin.knowledge}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#81a1c1]">{t.admin.noData}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
