'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/misc'
import { useSpeech } from '@/hooks/useSpeech'
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  contentType?: 'text' | 'tool_call' | 'tool_result'
  toolName?: string
  toolResult?: any
  timestamp: Date
  confidence?: number
  feedback?: 'thumbs_up' | 'thumbs_down' | null
}

interface ToolExecution {
  id: string
  toolName: string
  status: 'pending' | 'running' | 'success' | 'error'
  result?: any
  error?: string
  duration?: number
}

interface ChatInterfaceProps {
  agentId: string
  agentName?: string
  onSendMessage?: (message: string) => Promise<void>
  initialMessages?: Message[]
}

export default function ChatInterface({
  agentId,
  agentName = 'AI 助手',
  onSendMessage,
  initialMessages = [],
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 语音输入
  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported: isSpeechSupported,
    start: startSpeech,
    stop: stopSpeech,
    reset: resetTranscript,
  } = useSpeech({
    onResult: (text) => {
      setInput(prev => prev + text)
    },
    onError: (error) => {
      console.warn('Speech error:', error)
    },
  })

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolExecutions])

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      if (onSendMessage) {
        await onSendMessage(userMessage.content)
      } else {
        // 默认 API 调用
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/agents/${agentId}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            agentId,
            message: userMessage.content,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          const assistantMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            confidence: data.confidence,
          }
          setMessages(prev => [...prev, assistantMessage])

          // 处理工具执行
          if (data.toolCalls && data.toolCalls.length > 0) {
            for (const toolCall of data.toolCalls) {
              const toolExec: ToolExecution = {
                id: `tool-${Date.now()}-${Math.random()}`,
                toolName: toolCall.toolName,
                status: 'running',
              }
              setToolExecutions(prev => [...prev, toolExec])

              // 模拟工具执行完成
              setTimeout(() => {
                setToolExecutions(prev =>
                  prev.map(t =>
                    t.id === toolExec.id
                      ? { ...t, status: 'success', result: toolCall.result, duration: 500 }
                      : t
                  )
                )
              }, 1000)
            }
          }
        }
      }
    } catch (err) {
      console.error('Send error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, agentId, onSendMessage])

  // 处理语音按钮
  const toggleSpeech = () => {
    if (isListening) {
      stopSpeech()
    } else {
      resetTranscript()
      startSpeech()
    }
  }

  // 提交反馈
  const submitFeedback = (messageId: string, feedback: 'thumbs_up' | 'thumbs_down') => {
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId ? { ...m, feedback } : m
      )
    )

    // 调用 API 记录反馈
    fetch('/api/chat/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, feedback }),
    })
  }

  // 重新生成回复
  const regenerate = async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId)
    if (!msg) return

    setMessages(prev => prev.filter(m => m.id !== messageId))
    setInput(msg.content)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full bg-sb-gray-50 dark:bg-[#111827]">
      {/* 工具执行状态面板 */}
      {toolExecutions.length > 0 && (
        <div className="bg-white dark:bg-sb-gray-800 border-b border-sb-gray-200 dark:border-sb-gray-700 p-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {toolExecutions.map(tool => (
              <div
                key={tool.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                  tool.status === 'success'
                    ? 'bg-success/10 text-success'
                    : tool.status === 'error'
                    ? 'bg-error/10 text-error'
                    : 'bg-warning/10 text-warning'
                }`}
              >
                {tool.status === 'running' && <Spinner size="sm" />}
                {tool.status === 'success' && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span>{tool.toolName}</span>
                {tool.duration && <span className="opacity-60">({tool.duration}ms)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            onFeedback={(feedback) => submitFeedback(message.id, feedback)}
            onRegenerate={() => regenerate(message.id)}
          />
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-supabase/10 flex items-center justify-center">
              <Sparkles size={16} className="text-supabase" />
            </div>
            <div className="bg-white dark:bg-sb-gray-800 rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] shadow-sm border border-sb-gray-200 dark:border-sb-gray-700">
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span className="text-sb-gray-500 text-sm">思考中...</span>
              </div>
            </div>
          </div>
        )}

        {interimTranscript && (
          <div className="text-sb-gray-400 text-sm italic">
            {interimTranscript}...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-sb-gray-200 dark:border-sb-gray-700 p-4 bg-white dark:bg-sb-gray-800">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          {/* 附件按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-sb-gray-400 hover:text-sb-gray-600 dark:hover:text-sb-gray-300"
          >
            <Paperclip size={18} />
          </Button>

          {/* 输入框 */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="输入消息，或点击麦克风说话..."
              className="w-full px-4 py-3 pr-12 rounded-lg border border-sb-gray-300 bg-white dark:bg-sb-gray-900 dark:border-sb-gray-600 text-sb-gray-900 dark:text-sb-gray-100 placeholder-sb-gray-400 focus:outline-none focus:ring-2 focus:ring-supabase focus:border-transparent resize-none min-h-[48px] max-h-[200px]"
              rows={1}
            />

            {/* 语音按钮 */}
            {isSpeechSupported && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSpeech}
                className={`absolute right-2 bottom-2 transition-colors ${
                  isListening
                    ? 'text-error bg-error/10'
                    : 'text-sb-gray-400 hover:text-sb-gray-600 dark:hover:text-sb-gray-300'
                }`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </Button>
            )}
          </div>

          {/* 发送按钮 */}
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 bg-supabase hover:bg-supabase-hover text-white"
          >
            <Send size={18} />
          </Button>
        </div>

        {/* 底部提示 */}
        <div className="flex justify-center mt-2">
          <span className="text-sb-gray-400 text-xs">
            按 Enter 发送，Shift + Enter 换行
          </span>
        </div>
      </div>
    </div>
  )
}

// 消息气泡组件
function MessageBubble({
  message,
  onFeedback,
  onRegenerate,
}: {
  message: Message
  onFeedback: (feedback: 'thumbs_up' | 'thumbs_down') => void
  onRegenerate: () => void
}) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-supabase text-white'
            : 'bg-sb-gray-200 dark:bg-sb-gray-700'
        }`}
      >
        {isUser ? (
          <span className="text-sm font-medium">
            {message.content.charAt(0).toUpperCase()}
          </span>
        ) : (
          <Sparkles size={16} className="text-sb-gray-500" />
        )}
      </div>

      {/* 消息内容 */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-supabase text-white rounded-tr-none'
              : 'bg-white dark:bg-sb-gray-800 text-sb-gray-900 dark:text-sb-gray-100 rounded-tl-none shadow-sm border border-sb-gray-200 dark:border-sb-gray-700'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* 底部操作 */}
        <div className={`flex items-center gap-2 mt-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-sb-gray-400 text-xs">
            {message.timestamp.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {!isUser && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onFeedback('thumbs_up')}
                className={`p-1 rounded hover:bg-sb-gray-100 dark:hover:bg-sb-gray-700 transition-colors ${
                  message.feedback === 'thumbs_up' ? 'text-success' : 'text-sb-gray-400'
                }`}
              >
                <ThumbsUp size={14} />
              </button>
              <button
                onClick={() => onFeedback('thumbs_down')}
                className={`p-1 rounded hover:bg-sb-gray-100 dark:hover:bg-sb-gray-700 transition-colors ${
                  message.feedback === 'thumbs_down' ? 'text-error' : 'text-sb-gray-400'
                }`}
              >
                <ThumbsDown size={14} />
              </button>
              <button
                onClick={onRegenerate}
                className="p-1 rounded hover:bg-sb-gray-100 dark:hover:bg-sb-gray-700 text-sb-gray-400 transition-colors"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
