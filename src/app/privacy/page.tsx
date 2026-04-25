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
          color: '#065f46',
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
            最后更新日期：2024年12月
          </p>

          {/* 引言 */}
          <div style={{
            backgroundColor: 'rgba(6,95,70,0.15)',
            borderRadius: '5px',
            padding: '20px',
            marginLeft: '12px',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.4), 2px 3px 8px rgba(0,0,0,0.3)',
            transform: 'rotate(-0.4deg)',
            borderLeft: '4px solid #059669'
          }}>
            <p style={{
              fontFamily: "'Noto Serif SC', serif",
              fontSize: '14px',
              color: '#a7f3d0',
              lineHeight: 1.8,
              letterSpacing: '0.3px'
            }}>
              山海经老板测试（以下简称"我们"）非常重视用户的隐私保护。本政策阐述了我们如何收集、使用、存储和保护您的个人信息。
            </p>
          </div>

          {/* 各条款 - 不对称卡片 */}
          {[
            {
              title: '1. 信息收集',
              content: '我们收集您主动提供的信息，包括：测试答案（用于计算人格类型）、微信昵称和头像（用于分享功能）、付费记录（用于解锁报告）。我们不会收集与测试无关的个人信息。',
              rotation: '0.3deg',
              marginLeft: '18px',
              borderColor: '#059669'
            },
            {
              title: '2. 信息使用',
              content: '您的测试答案用于生成个性化报告；微信信息用于分享卡片展示；付费记录用于确认报告解锁状态。我们不会将您的信息用于广告推送或第三方营销。',
              rotation: '-0.5deg',
              marginLeft: '5px',
              borderColor: '#047857'
            },
            {
              title: '3. 信息存储',
              content: '您的数据存储于中国境内的服务器，采用加密存储。我们会在您注销账户后30天内删除您的个人信息，法律法规另有规定的除外。',
              rotation: '0.6deg',
              marginLeft: '25px',
              borderColor: '#065f46'
            },
            {
              title: '4. 信息共享',
              content: '除以下情况外，我们不会与任何第三方共享您的个人信息：(1) 获得您的明确同意；(2) 微信支付必需的支付信息；(3) 法律法规要求的情形。',
              rotation: '-0.3deg',
              marginLeft: '0px',
              borderColor: '#10b981'
            },
            {
              title: '5. Cookie 使用',
              content: '我们使用必要的 Cookie 来维护会话状态和保障服务安全。这些 Cookie 不会用于追踪您的浏览行为或用于广告目的。',
              rotation: '0.4deg',
              marginLeft: '20px',
              borderColor: '#059669'
            },
            {
              title: '6. 儿童隐私',
              content: '我们的服务不面向未满14周岁的儿童。如果我们发现收集了儿童个人信息，会立即删除并终止服务。',
              rotation: '-0.7deg',
              marginLeft: '8px',
              borderColor: '#047857'
            },
            {
              title: '7. 您的权利',
              content: '您有权查询、复制、更正、删除您的个人信息。如需行使权利，请通过 support@yourdomain.com 联系我们，我们会在15个工作日内响应。',
              rotation: '0.2deg',
              marginLeft: '15px',
              borderColor: '#065f46'
            },
            {
              title: '8. 政策更新',
              content: '我们会适时更新本隐私政策。更新时会在首页显著位置提醒，重大变更会通过微信消息通知。继续使用服务即表示您同意更新后的政策。',
              rotation: '-0.4deg',
              marginLeft: '3px',
              borderColor: '#059669'
            },
            {
              title: '9. 联系我们',
              content: '如对本政策有任何疑问或建议，请通过 support@yourdomain.com 与我们联系。',
              rotation: '0.5deg',
              marginLeft: '22px',
              borderColor: '#10b981'
            },
          ].map((item, index) => (
            <div
              key={index}
              style={{
                backgroundColor: 'rgba(0,0,0,0.38)',
                borderRadius: ['4px', '7px', '3px', '8px', '5px', '6px', '2px', '9px', '4px'][index],
                padding: '20px',
                marginLeft: item.marginLeft,
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.4), 2px 3px 8px rgba(0,0,0,0.3)',
                transform: `rotate(${item.rotation})`,
                borderLeft: `4px solid ${item.borderColor}`,
                position: 'relative',
              }}
            >
              {/* 裂痕装饰 */}
              {index % 3 === 1 && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '14px',
                  fontSize: '9px',
                  color: '#064e3b',
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
        color: '#059669',
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
        color: '#059669',
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