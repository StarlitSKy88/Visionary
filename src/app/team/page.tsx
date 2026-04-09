'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { Users, Plus, ArrowRight } from 'lucide-react'

interface Team {
  id: number
  name: string
  owner_user_id: number
  owner_email: string
  created_at: string
  memberCount?: number
}

export default function TeamListPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/team/teams', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        // 简单处理：owned 和 asMember 合并
        const allTeams = [...(data.data?.owned || []), ...(data.data?.asMember || [])]
        // 去重
        const unique = allTeams.filter((t: Team, i: number, arr: Team[]) =>
          arr.findIndex(x => x.id === t.id) === i
        )
        setTeams(unique)
      } else if (res.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('加载团队失败:', error)
      addToast('error', '加载团队失败')
    } finally {
      setLoading(false)
    }
  }

  const createTeam = async () => {
    if (!newTeamName.trim()) return

    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/team/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newTeamName.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        addToast('success', '团队创建成功')
        setNewTeamName('')
        setShowCreate(false)
        router.push(`/team/${data.data.id}`)
      } else {
        const err = await res.json()
        addToast('error', err.error || '创建失败')
      }
    } catch (error) {
      console.error('创建团队失败:', error)
      addToast('error', '创建失败')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#2e3440] text-[#d8dee9] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-[#88c0d0]" />
            <h1 className="text-2xl font-display font-bold">我的团队</h1>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建团队
          </Button>
        </div>

        {/* Create Team Modal */}
        {showCreate && (
          <Card className="mb-6 p-6">
            <h2 className="text-lg font-semibold mb-4">创建新团队</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="团队名称"
                className="flex-1 px-4 py-2 bg-[#3b4252] border border-[#4c5264] rounded-lg text-[#d8dee9] placeholder-[#816e7f] focus:outline-none focus:border-[#88c0d0]"
                onKeyDown={e => e.key === 'Enter' && createTeam()}
              />
              <Button onClick={createTeam} disabled={creating || !newTeamName.trim()}>
                {creating ? '创建中...' : '创建'}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                取消
              </Button>
            </div>
          </Card>
        )}

        {/* Team List */}
        {loading ? (
          <div className="text-center py-12 text-[#816e7f]">加载中...</div>
        ) : teams.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-[#4c5264]" />
            <h2 className="text-xl font-semibold mb-2">还没有团队</h2>
            <p className="text-[#816e7f] mb-6">创建您的第一个团队，开始管理团队事务</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              创建团队
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {teams.map(team => (
              <Link key={team.id} href={`/team/${team.id}`}>
                <Card className="p-6 hover:bg-[#3b4252] transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold group-hover:text-[#88c0d0] transition-colors">
                        {team.name}
                      </h3>
                      <p className="text-sm text-[#816e7f] mt-1">
                        创建于 {new Date(team.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#4c5264] group-hover:text-[#88c0d0] transition-colors" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
