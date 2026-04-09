'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#2e3440]">
          <div className="max-w-md p-8 bg-[#3b4252] rounded-2xl border border-[rgba(136,192,208,0.15)] text-center shadow-frost">
            <div className="text-5xl mb-4 text-[#88c0d0]">!</div>
            <h2 className="text-xl font-display font-bold text-[#eceff4] mb-2">
              出错了
            </h2>
            <p className="text-[#81a1c1] mb-6">
              {this.state.error?.message || '发生了未知错误'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#88c0d0] text-[#2e3440] rounded-xl font-semibold hover:bg-[#9ccad8] transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
