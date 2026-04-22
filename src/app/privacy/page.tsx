'use client'

import Link from 'next/link'

export default function PrivacyPage() {
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
            隐私政策
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
            { title: '1. 信息收集', content: '我们收集您在使用SBTI测试时主动提供的信息，包括：测试答案、人格类型等。您无需注册账户即可使用本服务。我们还收集服务使用日志，包括IP地址、访问时间等，用于安全分析和产品优化。', rotation: '-0.8deg', marginLeft: '0px', borderStyle: 'borderLeft' },
            { title: '2. 信息使用', content: '您的信息用于：生成人格测试报告；改进AI服务；安全验证。我们不会将您的个人信息用于营销目的。', rotation: '0.5deg', marginLeft: '20px', borderStyle: 'borderTop' },
            { title: '3. 信息共享', content: '除以下情况外，我们不会与第三方共享您的个人信息：获得您的明确同意；为提供服务而必须与合作伙伴共享；法律法规要求的情况。', rotation: '-0.3deg', marginLeft: '8px', borderStyle: 'borderRight' },
            { title: '4. 信息安全', content: '我们采用加密存储、访问控制、安全审计等措施保护您的数据。但互联网传输无法保证100%安全，请您理解。', rotation: '0.7deg', marginLeft: '25px', borderStyle: 'borderLeft' },
            { title: '5. 数据保留', content: '您的测试数据将在您注销账户后保留30天，此后彻底删除。', rotation: '-0.5deg', marginLeft: '12px', borderStyle: 'borderBottom' },
            { title: '6. 您的权利', content: '您有权：访问和导出您的数据；更正不准确的信息；注销账户删除数据。您可以通过联系客服行使这些权利。', rotation: '0.4deg', marginLeft: '5px', borderStyle: 'borderLeft' },
            { title: '7. 联系我们', content: '如对隐私政策有任何疑问，请通过 support@yourdomain.com 与我们联系。', rotation: '-0.6deg', marginLeft: '18px', borderStyle: 'borderTop' },
          ].map((item, index) => (
            <div
              key={index}
              style={{
                backgroundColor: 'rgba(0,0,0,0.38)',
                borderRadius: ['3px', '6px', '4px', '8px', '5px', '7px', '2px'][index],
                padding: '20px',
                marginLeft: item.marginLeft,
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.4), 2px 3px 8px rgba(0,0,0,0.3)',
                transform: `rotate(${item.rotation})`,
                border: '1px solid rgba(180,83,9,0.2)',
                position: 'relative',
                ...(item.borderStyle === 'borderLeft' && { borderLeft: '4px solid #b45309' }),
                ...(item.borderStyle === 'borderTop' && { borderTop: '4px solid #991b1b' }),
                ...(item.borderStyle === 'borderRight' && { borderRight: '4px solid #dc2626' }),
                ...(item.borderStyle === 'borderBottom' && { borderBottom: '4px solid #10b981' }),
              }}
            >
              {/* 墨点装饰 */}
              {index % 3 === 0 && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '12px',
                  fontSize: '2px',
                  color: '#78350f',
                  opacity: 0.4
                }}>·</div>
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
        left: '12px',
        bottom: '80px',
        fontSize: '4px',
        color: '#b45309',
        opacity: 0.18,
        letterSpacing: '3px',
        zIndex: 15
      }}>
        ·　··　···　·　··
      </div>

      {/* 角落破损 */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '80px',
        height: '60px',
        background: 'radial-gradient(circle at top left, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.12) 30%, transparent 55%)',
        zIndex: 12,
        pointerEvents: 'none'
      }} />
    </div>
  )
}
