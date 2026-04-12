/**
 * useSpeech - 语音输入 Hook
 * 使用 Web Speech API 实现语音转文字
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseSpeechOptions {
  onResult?: (transcript: string) => void
  onError?: (error: string) => void
  continuous?: boolean
  interimResults?: boolean
  lang?: string
}

interface UseSpeechReturn {
  transcript: string
  interimTranscript: string
  isListening: boolean
  isSupported: boolean
  start: () => void
  stop: () => void
  reset: () => void
  error: string | null
}

export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
  const {
    onResult,
    onError,
    continuous = false,
    interimResults = true,
    lang = 'zh-CN',
  } = options

  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    if (!isSupported) {
      setError('当前浏览器不支持语音识别')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.lang = lang

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript)
        onResult?.(finalTranscript)
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = (event: any) => {
      const errorMessage = event.error === 'not-allowed'
        ? '请允许麦克风权限'
        : event.error === 'no-speech'
        ? '未检测到语音，请重试'
        : `语音识别错误: ${event.error}`

      setError(errorMessage)
      setIsListening(false)
      onError?.(errorMessage)
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [continuous, interimResults, lang, isSupported, onResult, onError])

  const start = useCallback(() => {
    if (!isSupported) {
      setError('当前浏览器不支持语音识别')
      return
    }

    setError(null)
    try {
      recognitionRef.current?.start()
    } catch (err) {
      // 可能已经在运行
      console.warn('Speech recognition start error:', err)
    }
  }, [isSupported])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    start,
    stop,
    reset,
    error,
  }
}

export default useSpeech
