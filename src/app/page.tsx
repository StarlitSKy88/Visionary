'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(true)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0a1210' }}>
      {/* 噪点纹理背景 */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        opacity: 0.05
      }} />

      {/* 暗角效果 */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)'
      }} />

      {/* 左上角篆体印章 */}
      <div className="absolute z-20" style={{ left: '60px', top: '60px' }}>
        <div className="seal" style={{ fontSize: '16px', opacity: 0.3, color: '#14b8a6' }}>山</div>
      </div>

      {/* 右上角链接 */}
      <div className="absolute z-20 flex gap-6" style={{ right: '60px', top: '60px' }}>
        <Link href="/zh/privacy" className="text-xs opacity-30 hover:opacity-60 transition-opacity" style={{ color: '#64748b', fontSize: '11px' }}>
          隐私政策
        </Link>
        <Link href="/zh/terms" className="text-xs opacity-30 hover:opacity-60 transition-opacity" style={{ color: '#64748b', fontSize: '11px' }}>
          用户协议
        </Link>
      </div>

      {/* 主内容区 */}
      <main className="relative z-20" style={{ padding: '180px 0 0 460px' }}>
        {/* 青龙图标 - 精确坐标(320, 180) */}
        <div className="animate-breathe" style={{
          position: 'absolute',
          left: '320px',
          top: '180px',
          width: '120px',
          height: '120px',
        }}>
          <div style={{
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }} />
          <div style={{ fontSize: '80px', position: 'relative', zIndex: 1 }}>🐉</div>
        </div>

        {/* 大标题 - 精确坐标(460, 200) */}
        <div className={loaded ? 'animate-fade-in-up' : 'opacity-0'} style={{ animationDelay: '0.15s' }}>
          <h1 style={{
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: '700',
            fontSize: '48px',
            color: '#f8fafc',
            lineHeight: 1.3,
            letterSpacing: '0.5px'
          }}>
            <span style={{ color: '#14b8a6', fontSize: '64px' }}>山</span>
            <span style={{ position: 'relative', top: '1px' }}>海经老板测试</span>
          </h1>
        </div>

        {/* 副标题 - 精确坐标(460, 280) */}
        <div className={loaded ? 'animate-fade-in-up' : 'opacity-0'} style={{ animationDelay: '0.3s', marginTop: '20px' }}>
          <p style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '14px',
            color: '#cbd5e1',
            opacity: 0.6
          }}>
            24道灵魂拷问，测出你的老板人格类型
          </p>
        </div>

        {/* 三个卡片 - 精确坐标 */}
        <div className="mt-8">
          {/* 第一个卡片 - (380, 380), 220x110 */}
          <div
            className={loaded ? 'animate-fade-in-up' : 'opacity-0'}
            style={{
              animationDelay: '0.45s',
              position: 'absolute',
              left: '380px',
              top: '380px',
              width: '220px',
              height: '110px',
              backgroundColor: 'rgba(0,0,0,0.27)',
              borderRadius: '4px',
              padding: '13px',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
              letterSpacing: '0.5px'
            }}
          >
            <p style={{
              fontFamily: "'Ma Shan Zheng', cursive",
              fontSize: '13px',
              color: '#f8fafc',
              lineHeight: 1.7,
              position: 'relative',
              left: '-1px'
            }}>
              36种精怪人格
            </p>
          </div>

          {/* 第二个卡片 - (620, 410), 240x110 */}
          <div
            className={loaded ? 'animate-fade-in-up' : 'opacity-0'}
            style={{
              animationDelay: '0.6s',
              position: 'absolute',
              left: '620px',
              top: '410px',
              width: '240px',
              height: '110px',
              backgroundColor: 'rgba(0,0,0,0.27)',
              borderRadius: '7px',
              padding: '15px',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
              letterSpacing: '0.5px'
            }}
          >
            <p style={{
              fontFamily: "'Ma Shan Zheng', cursive",
              fontSize: '13px',
              color: '#f8fafc',
              lineHeight: 1.7
            }}>
              人格增强报告
            </p>
          </div>

          {/* 第三个卡片 - (880, 440), 200x110 */}
          <div
            className={loaded ? 'animate-fade-in-up' : 'opacity-0'}
            style={{
              animationDelay: '0.75s',
              position: 'absolute',
              left: '880px',
              top: '440px',
              width: '200px',
              height: '110px',
              backgroundColor: 'rgba(0,0,0,0.27)',
              borderRadius: '11px',
              padding: '17px',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
              letterSpacing: '0.5px'
            }}
          >
            <p style={{
              fontFamily: "'Ma Shan Zheng', cursive",
              fontSize: '13px',
              color: '#f8fafc',
              lineHeight: 1.7
            }}>
              专属赚钱建议
            </p>
          </div>
        </div>

        {/* 开始测试按钮 - (920, 620), 180x50 */}
        <div className={loaded ? 'animate-fade-in-up' : 'opacity-0'} style={{ animationDelay: '0.9s' }}>
          <Link href="/zh/sbti">
            <button
              style={{
                position: 'absolute',
                left: '920px',
                top: '620px',
                width: '180px',
                height: '50px',
                backgroundColor: '#dc2626',
                color: 'white',
                fontWeight: '600',
                fontSize: '16px',
                border: 'none',
                borderRadius: '0',
                cursor: 'pointer',
                letterSpacing: '0.5px'
              }}
            >
              <span style={{ position: 'relative', top: '-1px', display: 'inline-block' }}>开始测试</span>
            </button>
          </Link>
        </div>

        {/* 底部文字 - (920, 690) */}
        <div className={loaded ? 'animate-fade-in-up' : 'opacity-0'} style={{
          animationDelay: '1.05s',
          position: 'absolute',
          left: '920px',
          top: '690px',
          letterSpacing: '0.5px'
        }}>
          <p style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '11px',
            color: '#64748b',
            opacity: 0.4
          }}>
            完全匿名·无需注册·3分钟完成
          </p>
        </div>
      </main>

      {/* 右下角八卦装饰 */}
      <div
        className="fixed animate-spin-slow text-2xl"
        style={{
          bottom: '32px',
          right: '32px',
          opacity: 0.2,
          color: '#14b8a6',
          fontSize: '24px'
        }}
      >
        ☯
      </div>
    </div>
  )
}
