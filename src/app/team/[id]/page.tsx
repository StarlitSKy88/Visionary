'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Users, Calendar, Clock, FileText, Settings, Plus, Check, X } from 'lucide-react'

type Tab = 'members' | 'leave' | 'schedules' | 'rules' | 'audit'

interface Team {
  id: number
  name: string
  owner_user_id: number
  owner_email: string
  members: Member[]
  memberCount: number
}

interface Member {
  id: number
  user_id: number
  email: string
  role: string
  joined_at: string
}

interface LeaveBalance {
  id: number
  leave_type: string
  total_days: number
  used_days: number
  year: number
}

interface LeaveRequest {
  id: number
  leave_type: string
  start_date: string
  end_date: string
  days: number
  reason: string
  status: string
  member_email: string
  created_at: string
}

interface Schedule {
  id: number
  job_type: string
  cron_expression: string
  payload: any
  enabled: number
}

interface AuditLog {
  id: number
  action: string
  target_type: string
  actor_email: string
  details: any
  created_at: string
}

export default function TeamDetailPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string
  const { addToast } = useToast()

  const [team, setTeam] = useState<Team | null>(null)
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [tab, setTab] = useState<Tab>('members')
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')

  // Leave form
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [leaveType, setLeaveType] = useState('annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadTeam()
  }, [teamId])

  useEffect(() => {
    if (team) {
      setUserRole(team.members[0]?.role || '')
    }
  }, [team])

  useEffect(() => {
    if (team) {
      loadBalances()
      loadRequests()
      loadSchedules()
      loadAuditLogs()
    }
  }, [team])

  const getToken = () => localStorage.getItem('token')

  const loadTeam = async () => {
    try {
      const token = getToken()
      if (!token) {
        router.push('/login')
        return
      }

      const res = await fetch(`/api/team/teams/${teamId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setTeam(data.data)
      } else if (res.status === 404) {
        addToast('error', '团队不存在')
        router.push('/team')
      }
    } catch (error) {
      console.error('加载团队失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBalances = async () => {
    try {
      const token = getToken()
      const res = await fetch(`/api/team/teams/${teamId}/leave/balance`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setBalances(data.data)
      }
    } catch (error) {
      console.error('加载余额失败:', error)
    }
  }

  const loadRequests = async () => {
    try {
      const token = getToken()
      const res = await fetch(`/api/team/teams/${teamId}/leave/requests`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setRequests(data.data)
      }
    } catch (error) {
      console.error('加载请假记录失败:', error)
    }
  }

  const loadSchedules = async () => {
    try {
      const token = getToken()
      const res = await fetch(`/api/team/teams/${teamId}/schedules`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSchedules(data.data)
      }
    } catch (error) {
      console.error('加载定时任务失败:', error)
    }
  }

  const loadAuditLogs = async () => {
    try {
      const token = getToken()
      const res = await fetch(`/api/team/teams/${teamId}/audit?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data.data)
      }
    } catch (error) {
      console.error('加载审计日志失败:', error)
    }
  }

  const submitLeaveRequest = async () => {
    if (!startDate || !endDate) {
      addToast('error', '请填写开始和结束日期')
      return
    }

    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`/api/team/teams/${teamId}/leave/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ leaveType, startDate, endDate, reason }),
      })

      if (res.ok) {
        addToast('success', '请假申请已提交')
        setShowLeaveForm(false)
        setStartDate('')
        setEndDate('')
        setReason('')
        loadRequests()
        loadBalances()
        loadAuditLogs()
      } else {
        const err = await res.json()
        addToast('error', err.error || '提交失败')
      }
    } catch (error) {
      console.error('提交请假失败:', error)
      addToast('error', '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const approveRequest = async (requestId: number) => {
    try {
      const token = getToken()
      const res = await fetch(`/api/team/teams/${teamId}/leave/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'approved' }),
      })

      if (res.ok) {
        addToast('success', '已批准请假申请')
        loadRequests()
        loadBalances()
        loadAuditLogs()
      } else {
        const err = await res.json()
        addToast('error', err.error || '操作失败')
      }
    } catch (error) {
      console.error('审批失败:', error)
    }
  }

  const rejectRequest = async (requestId: number) => {
    try {
      const token = getToken()
      const res = await fetch(`/api/team/teams/${teamId}/leave/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'rejected' }),
      })

      if (res.ok) {
        addToast('success', '已拒绝请假申请')
        loadRequests()
        loadAuditLogs()
      } else {
        const err = await res.json()
        addToast('error', err.error || '操作失败')
      }
    } catch (error) {
      console.error('拒绝失败:', error)
    }
  }

  const getLeaveTypeName = (type: string) => {
    const names: Record<string, string> = { annual: '年假', sick: '病假', personal: '事假' }
    return names[type] || type
  }

  const getActionName = (action: string) => {
    const names: Record<string, string> = {
      team_created: '创建团队',
      member_added: '添加成员',
      member_removed: '移除成员',
      leave_requested: '提交请假',
      leave_approved: '批准请假',
      leave_rejected: '拒绝请假',
      schedule_created: '创建定时任务',
    }
    return names[action] || action
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2e3440] flex items-center justify-center">
        <div className="text-[#816e7f]">加载中...</div>
      </div>
    )
  }

  if (!team) return null

  const isAdmin = userRole === 'admin'

  return (
    <div className="min-h-screen bg-[#2e3440] text-[#d8dee9]">
      {/* Header */}
      <div className="border-b border-[#3b4252]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/team">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-display font-bold">{team.name}</h1>
          <p className="text-sm text-[#816e7f] mt-1">
            {team.memberCount} 名成员 · 角色: {userRole}
          </p>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6 flex gap-1">
          {(['members', 'leave', 'schedules', 'rules', 'audit'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-[#88c0d0] text-[#88c0d0]'
                  : 'border-transparent text-[#816e7f] hover:text-[#d8dee9]'
              }`}
            >
              {t === 'members' && <Users className="w-4 h-4 inline mr-1" />}
              {t === 'leave' && <Calendar className="w-4 h-4 inline mr-1" />}
              {t === 'schedules' && <Clock className="w-4 h-4 inline mr-1" />}
              {t === 'rules' && <FileText className="w-4 h-4 inline mr-1" />}
              {t === 'audit' && <Settings className="w-4 h-4 inline mr-1" />}
              {t === 'members' ? '成员' :
               t === 'leave' ? '请假' :
               t === 'schedules' ? '任务' :
               t === 'rules' ? '规则' : '日志'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Members Tab */}
        {tab === 'members' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">团队成员</h2>
            <Card className="divide-y divide-[#3b4252]">
              {team.members.map(member => (
                <div key={member.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{member.email}</p>
                    <p className="text-sm text-[#816e7f]">
                      加入于 {new Date(member.joined_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    member.role === 'admin' ? 'bg-[#88c0d0] text-[#2e3440]' :
                    member.role === 'member' ? 'bg-[#3b4252] text-[#d8dee9]' :
                    'bg-[#4c5264] text-[#d8dee9]'
                  }`}>
                    {member.role === 'admin' ? '管理员' : member.role === 'member' ? '成员' : '访客'}
                  </span>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* Leave Tab */}
        {tab === 'leave' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">请假管理</h2>
              {!showLeaveForm && (
                <Button onClick={() => setShowLeaveForm(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  申请请假
                </Button>
              )}
            </div>

            {/* Leave Form */}
            {showLeaveForm && (
              <Card className="mb-6 p-6">
                <h3 className="font-semibold mb-4">申请请假</h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm text-[#816e7f] mb-1">请假类型</label>
                    <select
                      value={leaveType}
                      onChange={e => setLeaveType(e.target.value)}
                      className="w-full px-4 py-2 bg-[#3b4252] border border-[#4c5264] rounded-lg text-[#d8dee9] focus:outline-none focus:border-[#88c0d0]"
                    >
                      <option value="annual">年假</option>
                      <option value="sick">病假</option>
                      <option value="personal">事假</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#816e7f] mb-1">开始日期</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full px-4 py-2 bg-[#3b4252] border border-[#4c5264] rounded-lg text-[#d8dee9] focus:outline-none focus:border-[#88c0d0]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#816e7f] mb-1">结束日期</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full px-4 py-2 bg-[#3b4252] border border-[#4c5264] rounded-lg text-[#d8dee9] focus:outline-none focus:border-[#88c0d0]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-[#816e7f] mb-1">原因（可选）</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="请假原因"
                      className="w-full px-4 py-2 bg-[#3b4252] border border-[#4c5264] rounded-lg text-[#d8dee9] placeholder-[#816e7f] focus:outline-none focus:border-[#88c0d0]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={submitLeaveRequest} disabled={submitting}>
                      {submitting ? '提交中...' : '提交申请'}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowLeaveForm(false)}>
                      取消
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Balance Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {balances.map(balance => (
                <Card key={balance.id} className="p-4">
                  <p className="text-sm text-[#816e7f]">{getLeaveTypeName(balance.leave_type)}</p>
                  <p className="text-2xl font-bold text-[#88c0d0]">
                    {balance.total_days - balance.used_days}
                    <span className="text-sm text-[#816e7f] font-normal"> / {balance.total_days} 天</span>
                  </p>
                  <p className="text-xs text-[#816e7f]">已用 {balance.used_days} 天</p>
                </Card>
              ))}
            </div>

            {/* Leave Requests */}
            <h3 className="font-semibold mb-3">请假记录</h3>
            {requests.length === 0 ? (
              <Card className="p-8 text-center text-[#816e7f]">暂无请假记录</Card>
            ) : (
              <Card className="divide-y divide-[#3b4252]">
                {requests.map(req => (
                  <div key={req.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{getLeaveTypeName(req.leave_type)}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          req.status === 'pending' ? 'bg-yellow-600/30 text-yellow-300' :
                          req.status === 'approved' ? 'bg-green-600/30 text-green-300' :
                          'bg-red-600/30 text-red-300'
                        }`}>
                          {req.status === 'pending' ? '待审批' : req.status === 'approved' ? '已批准' : '已拒绝'}
                        </span>
                      </div>
                      {isAdmin && req.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveRequest(req.id)}
                            className="p-1.5 rounded-lg bg-green-600/30 text-green-300 hover:bg-green-600/50"
                            title="批准"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => rejectRequest(req.id)}
                            className="p-1.5 rounded-lg bg-red-600/30 text-red-300 hover:bg-red-600/50"
                            title="拒绝"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-[#816e7f]">
                      {req.start_date} ~ {req.end_date} · {req.days} 天
                      {req.reason && ` · ${req.reason}`}
                    </p>
                    <p className="text-xs text-[#4c5264] mt-1">
                      申请时间: {new Date(req.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {/* Schedules Tab */}
        {tab === 'schedules' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">定时任务</h2>
              {isAdmin && (
                <Button disabled>
                  <Plus className="w-4 h-4 mr-1" />
                  创建任务
                </Button>
              )}
            </div>
            {schedules.length === 0 ? (
              <Card className="p-8 text-center text-[#816e7f]">暂无定时任务</Card>
            ) : (
              <Card className="divide-y divide-[#3b4252]">
                {schedules.map(schedule => (
                  <div key={schedule.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{schedule.job_type}</p>
                        <p className="text-sm text-[#816e7f] font-mono">{schedule.cron_expression}</p>
                        {schedule.payload?.message && (
                          <p className="text-sm text-[#88c0d0] mt-1">{schedule.payload.message}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        schedule.enabled ? 'bg-green-600/30 text-green-300' : 'bg-[#3b4252] text-[#816e7f]'
                      }`}>
                        {schedule.enabled ? '启用' : '禁用'}
                      </span>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {/* Rules Tab */}
        {tab === 'rules' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">业务规则</h2>
              {isAdmin && (
                <Button disabled>
                  <Plus className="w-4 h-4 mr-1" />
                  创建规则
                </Button>
              )}
            </div>
            <Card className="p-8 text-center text-[#816e7f]">
              暂无业务规则
            </Card>
          </div>
        )}

        {/* Audit Tab */}
        {tab === 'audit' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">操作日志</h2>
            {auditLogs.length === 0 ? (
              <Card className="p-8 text-center text-[#816e7f]">暂无操作记录</Card>
            ) : (
              <Card className="divide-y divide-[#3b4252]">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{getActionName(log.action)}</span>
                      <span className="text-xs text-[#816e7f]">
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-sm text-[#816e7f] mt-1">
                      操作人: {log.actor_email}
                    </p>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
