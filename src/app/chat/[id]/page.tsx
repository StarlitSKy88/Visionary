'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/misc'
import { ArrowLeft, Send, Bot, User } from 'lucide-react'

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
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentLoading, setAgentLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 加载Agent信息
    loadAgent()
  }, [agentId])

  useEffect(() => {
    // 自动滚动到底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
            skills: Array.isArray(found.skills) ? found.skills : [],
            score: found.score || 0,
          })
        }
      }
    } catch (error) {
      console.error('加载Agent失败:', error)
    } finally {
      setAgentLoading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: input,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        throw new Error('发送失败')
      }

      const data = await res.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || '抱歉，我暂时无法回答这个问题。',
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('发送消息失败:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发生了错误，请稍后重试。',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (agentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#2e3440] flex flex-col">
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 glass border-b border-[rgba(136,192,208,0.1)]">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/create-agent">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回
              </Button>
            </Link>
            <div>
              <div className="font-semibold text-[#eceff4]">{agent?.name}</div>
              <div className="text-xs text-[#81a1c1]">{agent?.industry}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg">
              评分 {agent?.score}
            </span>
          </div>
        </div>
      </nav>

      {/* 聊天区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* 欢迎消息 */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#88c0d0] to-[#81a1c1] flex items-center justify-center text-[#2e3440] text-2xl mx-auto mb-4">
                🤖
              </div>
              <h2 className="text-xl font-bold text-[#eceff4] mb-2">
                你好，我是{agent?.name}
              </h2>
              <p className="text-[#81a1c1] mb-4">{agent?.description}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {agent?.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-[#3b4252] text-[#81a1c1] rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 消息列表 */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#88c0d0] to-[#81a1c1] flex items-center justify-center text-[#2e3440] flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-[#88c0d0] text-[#2e3440]'
                    : 'bg-[#3b4252] border border-[rgba(136,192,208,0.12)]'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-[#2e3440]/60' : 'text-[#81a1c1]'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-[#434c5e] flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[#81a1c1]" />
                </div>
              )}
            </div>
          ))}

          {/* 加载中 */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-[#81a1c1]">
                  <Spinner size="sm" />
                  <span>思考中...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="sticky bottom-0 bg-[#2e3440] border-t border-[rgba(136,192,208,0.1)] p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="输入你的问题..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="lg"
            className="flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
