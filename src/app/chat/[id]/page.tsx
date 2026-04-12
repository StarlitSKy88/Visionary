'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import ChatInterface from '@/components/chat/ChatInterface'
import { ArrowLeft } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Agent {
  id: string
  name: string
  industry: string
  description: string
  skills: string[]
  score: number
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string

  const [agent, setAgent] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [agentLoading, setAgentLoading] = useState(true)

  useEffect(() => {
    loadAgent()
  }, [agentId])

  const loadAgent = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      // 加载聊天历史
      const histRes = await fetch(`/api/agents/${agentId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (histRes.ok) {
        const histData = await histRes.json()
        if (histData.messages && histData.messages.length > 0) {
          setMessages(histData.messages.map((m: { role: string; content: string; createdAt: string }) => ({
            id: `hist-${Math.random()}`,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.createdAt || Date.now()),
          })))
        }
      }

      // 从dashboard传过来的agent数据
      const stored = localStorage.getItem('currentAgent')
      if (stored) {
        try {
          const agentData = JSON.parse(stored)
          if (agentData.id === agentId) {
            setAgent(agentData)
            setAgentLoading(false)
            return
          }
        } catch {}
      }

      // 从agents列表查找
      const listRes = await fetch('/api/agents/list', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (listRes.ok) {
        const listData = await listRes.json()
        const found = (listData.agents || []).find((a: Agent & { id: number }) => String(a.id) === String(agentId))
        if (found) {
          setAgent({
            id: String(found.id),
            name: found.name,
            industry: found.industry || '',
            description: found.description || '',
            skills: found.skills || [],
            score: found.score || 0,
          })
        }
      }
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      setAgentLoading(false)
    }
  }

  if (agentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sb-gray-50 dark:bg-[#111827]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-supabase border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sb-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-sb-gray-50 dark:bg-[#111827]">
      {/* 顶部导航 */}
      <header className="h-14 px-4 flex items-center gap-4 bg-white dark:bg-sb-gray-800 border-b border-sb-gray-200 dark:border-sb-gray-700 shrink-0">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
        </Link>

        <div className="flex-1">
          <h1 className="font-medium text-sb-gray-900 dark:text-sb-gray-100">
            {agent?.name || 'AI 助手'}
          </h1>
          {agent?.industry && (
            <p className="text-xs text-sb-gray-500">{agent.industry}</p>
          )}
        </div>

        <div className="text-sm text-sb-gray-500">
          {agent?.score && <span className="text-success">评分 {agent.score}</span>}
        </div>
      </header>

      {/* 聊天界面 */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          agentId={agentId}
          agentName={agent?.name}
          initialMessages={messages}
        />
      </div>
    </div>
  )
}
