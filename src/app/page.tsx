'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge, Spinner } from '@/components/ui/misc'

export default function HomePage() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(true)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* 甲骨文碎片装饰 */}
      <OracleBones />

      {/* 暗角效果 */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)'
      }} />

      {/* 左上角篆体印章 */}
      <div className="absolute top-6 left-6 z-20">
        <div className="seal text-2xl" style={{ color: 'var(--accent-primary)' }}>山</div>
      </div>

      {/* 右上角链接 */}
      <div className="absolute top-6 right-6 z-20 flex gap-6">
        <Link href="/zh/privacy" className="text-xs opacity-30 hover:opacity-60 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
          隐私政策
        </Link>
        <Link href="/zh/terms" className="text-xs opacity-30 hover:opacity-60 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
          用户协议
        </Link>
      </div>

      {/* 主内容区 */}
      <main className="relative z-20 max-w-lg mx-auto px-6 pt-32 pb-16">
        {/* 中心视觉区 - 非对称布局 */}
        <div className="relative">
          {/* 青龙图标 - 左上角，呼吸动画 */}
          <div className="absolute bronze-glow" style={{ left: '-5%', top: '-10%' }}>
            <div className="text-8xl animate-breathe cursor-pointer" style={{ transform: 'translateX(-30%)' }}>
              🐉
            </div>
          </div>

          {/* 标题区块 - 向右下偏移 */}
          <div className="ml-24 mt-8">
            <h1 className="text-5xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
              <span className="text-6xl" style={{ color: 'var(--accent-primary)' }}>山</span>
              <span>海经老板测试</span>
            </h1>

            <p className="mt-4 text-sm opacity-60 ml-4" style={{ color: 'var(--text-secondary)' }}>
              24道灵魂拷问，测出你的老板人格类型
            </p>
          </div>
        </div>

        {/* 三个特色卡片 - 错落瀑布式布局 */}
        <div className="mt-16 space-y-0">
          {/* 第一个卡片 - 最高 */}
          <div
            className="sbti-card p-4 animate-fade-in-up delay-300"
            style={{
              width: '220px',
              borderRadius: '4px',
              marginLeft: '8%',
              padding: '13px'
            }}
          >
            <span className="text-2xl">🔮</span>
            <p className="text-sm mt-2" style={{ fontFamily: "'Ma Shan Zheng', cursive", color: 'var(--text-secondary)' }}>
              36种精怪人格
            </p>
          </div>

          {/* 第二个卡片 - 中间 */}
          <div
            className="sbti-card p-4 animate-fade-in-up delay-400"
            style={{
              width: '240px',
              borderRadius: '7px',
              marginLeft: '28%',
              marginTop: '-20px',
              padding: '15px'
            }}
          >
            <span className="text-2xl">📜</span>
            <p className="text-sm mt-2" style={{ fontFamily: "'Ma Shan Zheng', cursive", color: 'var(--text-secondary)' }}>
              人格增强报告
            </p>
          </div>

          {/* 第三个卡片 - 最低 */}
          <div
            className="sbti-card p-4 animate-fade-in-up delay-500"
            style={{
              width: '200px',
              borderRadius: '11px',
              marginLeft: '48%',
              marginTop: '-15px',
              padding: '17px'
            }}
          >
            <span className="text-2xl">🧧</span>
            <p className="text-sm mt-2" style={{ fontFamily: "'Ma Shan Zheng', cursive", color: 'var(--text-secondary)' }}>
              专属赚钱建议
            </p>
          </div>
        </div>

        {/* 开始测试按钮 - 右下角，直角 */}
        <div className="mt-20 ml-32 animate-fade-in-up delay-700">
          <Link href="/zh/sbti">
            <button
              className="btn-rect px-8 py-3 text-base font-semibold animate-pulse-glow"
              style={{
                width: '180px',
                height: '50px',
                borderRadius: '0'
              }}
            >
              开始测试
            </button>
          </Link>
        </div>

        {/* 底部说明 */}
        <div className="mt-6 ml-36 animate-fade-in-up delay-800">
          <p className="text-xs opacity-40" style={{ color: 'var(--text-muted)' }}>
            完全匿名·无需注册·3分钟完成
          </p>
        </div>

        {/* 右下角八卦装饰 */}
        <div className="absolute bottom-8 right-8 opacity-20 animate-spin-slow">
          ☯
        </div>
      </main>

      {/* 底部链接 */}
      <footer className="absolute bottom-4 left-0 right-0 text-center z-20">
        <div className="flex items-center justify-center gap-6 text-xs opacity-30" style={{ color: 'var(--text-muted)' }}>
          <Link href="/zh/privacy" className="hover:opacity-60 transition-opacity">隐私政策</Link>
          <Link href="/zh/terms" className="hover:opacity-60 transition-opacity">用户协议</Link>
        </div>
      </footer>
    </div>
  )
}

/* 甲骨文碎片装饰组件 */
function OracleBones() {
  const bones = ['鼎', '甲骨', '篆', '玊', '亼', '朮', '氵', '炓', '硎', '餮']

  return (
    <>
      {bones.map((char, i) => (
        <div
          key={i}
          className="oracle-bone text-xl"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            transform: `rotate(${Math.random() * 360}deg) scale(${0.8 + Math.random() * 0.8})`,
            fontSize: `${12 + Math.random() * 20}px`,
            opacity: 0.02 + Math.random() * 0.02
          }}
        >
          {char}
        </div>
      ))}
    </>
  )
}
