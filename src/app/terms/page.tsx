'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0a1210' }}>
      {/* 噪点纹理 */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='7' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        opacity: 0.22
      }} />

      {/* 暗角 */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{
        background: 'radial-gradient(ellipse at center, transparent 10%, rgba(0,0,0,0.85) 100%)'
      }} />

      {/* 左上角印章 */}
      <div style={{
        position: 'fixed',
        left: '28px',
        top: '28px',
        transform: 'rotate(-12deg)',
        zIndex: 20
      }}>
        <div style={{
          fontSize: '26px',
          opacity: 0.6,
          color: '#b45309',
          textShadow: '2px 3px 5px rgba(0,0,0,0.5)',
          fontFamily: "'Noto Serif SC', serif",
          letterSpacing: '6px'
        }}>山海</div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20" style={{ padding: '16px 24px 16px 80px' }}>
        <div className="flex items-center justify-between">
          <Link
            href="/"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#78716c',
              fontSize: '11px',
              cursor: 'pointer',
              opacity: 0.5,
              letterSpacing: '1px',
              transform: 'rotate(-3deg)',
              fontFamily: "'Noto Serif SC', serif",
              textDecoration: 'none'
            }}
          >
            ← 返回首页
          </Link>

          <h1 style={{
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: '700',
            fontSize: '21px',
            color: '#f8fafc',
            letterSpacing: '2px',
            transform: 'rotate(1deg)'
          }}>
            用户协议
          </h1>

          <div style={{ width: '60px' }} />
        </div>
      </header>

      {/* Content - 山海经风格 */}
      <main style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '40px 24px 80px 20px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <p style={{
            fontSize: '11px',
            opacity: 0.4,
            color: '#78716c',
            letterSpacing: '1px',
            fontFamily: "'Noto Serif SC', serif",
            transform: 'rotate(-0.5deg)'
          }}>
            最后更新日期：2024年
          </p>

          {/* 各条款 - 不对称卡片 */}
          {[
            { title: '1. 服务说明', content: '山海经老板测试是一个基于人工智能的人格测试工具，帮助用户了解自己的老板人格类型和赚钱特质。用户使用本服务即表示同意遵守本协议。', rotation: '-0.6deg', marginLeft: '15px', borderColor: '#b45309' },
            { title: '2. 使用规则', content: '用户需保证测试答案的真实性和原创性，对账户下所有活动负责。用户同意不利用本服务从事任何违法活动，因用户原因导致的任何损失，由用户自行承担。', rotation: '0.4deg', marginLeft: '5px', borderColor: '#991b1b' },
            { title: '3. 付费服务', content: '完整报告解锁为付费服务，定价以平台公示为准（¥99）。付费服务一经开通，不支持退款，除非法律法规另有规定。', rotation: '-0.3deg', marginLeft: '22px', borderColor: '#dc2626' },
            { title: '4. 知识产权', content: '平台及其用户生成的内容，知识产权归属各有产方。用户同意授权平台在运营必要范围内使用其生成的内容。', rotation: '0.7deg', marginLeft: '8px', borderColor: '#10b981' },
            { title: '5. 免责声明', content: 'AI生成内容仅供参考，平台不对其准确性、完整性做任何保证。用户因依赖建议而做出的决策，相应后果由用户自行承担。', rotation: '-0.5deg', marginLeft: '0px', borderColor: '#c9a962' },
            { title: '6. 服务变更', content: '平台保留随时修改或中断服务的权利，并会提前通知用户。因服务变更导致的损失，平台承担的责任不超过用户为该服务支付的金额。', rotation: '0.3deg', marginLeft: '18px', borderColor: '#b45309' },
            { title: '7. 联系我们', content: '如对本协议有任何疑问，请通过 support@yourdomain.com 与我们联系。', rotation: '-0.8deg', marginLeft: '10px', borderColor: '#991b1b' },
          ].map((item, index) => (
            <div
              key={index}
              style={{
                backgroundColor: 'rgba(0,0,0,0.38)',
                borderRadius: ['4px', '7px', '3px', '8px', '5px', '6px', '2px'][index],
                padding: '20px',
                marginLeft: item.marginLeft,
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.4), 2px 3px 8px rgba(0,0,0,0.3)',
                transform: `rotate(${item.rotation})`,
                borderLeft: `4px solid ${item.borderColor}`,
                position: 'relative',
              }}
            >
              {/* 裂痕装饰 */}
              {index % 2 === 1 && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '14px',
                  fontSize: '9px',
                  color: '#78350f',
                  opacity: 0.4,
                  transform: 'rotate(12deg)'
                }}>〰</div>
              )}
              <h2 style={{
                fontFamily: "'Noto Serif SC', serif",
                fontWeight: '700',
                fontSize: '17px',
                color: '#f8fafc',
                letterSpacing: '1px',
                marginBottom: '12px'
              }}>
                {item.title}
              </h2>
              <p style={{
                fontFamily: "'Noto Serif SC', serif",
                fontSize: '14px',
                color: '#b8b5ad',
                lineHeight: 1.8,
                letterSpacing: '0.3px'
              }}>
                {item.content}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* 装饰元素 */}
      {/* 右下角甲骨文 */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        opacity: 0.2,
        color: '#b45309',
        fontSize: '14px',
        transform: 'rotate(20deg)',
        letterSpacing: '3px',
        zIndex: 15
      }}>
        ◯◻◽◾▫
      </div>

      {/* 墨点装饰 */}
      <div style={{
        position: 'fixed',
        right: '60px',
        top: '40%',
        fontSize: '3px',
        color: '#b45309',
        opacity: 0.15,
        zIndex: 15,
        transform: 'rotate(-30deg)'
      }}>·</div>

      {/* 角落破损 */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '100px',
        height: '70px',
        background: 'radial-gradient(circle at bottom right, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.12) 30%, transparent 55%)',
        zIndex: 12,
        pointerEvents: 'none'
      }} />
    </div>
  )
}
