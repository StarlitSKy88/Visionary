'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#080a08' }}>
      {/* === 极高频噪点纹理 - 宣纸/羊皮纸感 === */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.2' numOctaves='8' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        opacity: 0.28
      }} />

      {/* === 古旧褪色叠加层 - 墨迹晕染感 === */}
      <div className="fixed inset-0 pointer-events-none z-[5]" style={{
        background: `
          radial-gradient(ellipse at 25% 18%, rgba(180,83,9,0.08) 0%, transparent 35%),
          radial-gradient(ellipse at 75% 85%, rgba(153,27,27,0.06) 0%, transparent 30%),
          radial-gradient(ellipse at 60% 40%, rgba(120,53,15,0.04) 0%, transparent 25%),
          radial-gradient(ellipse at 15% 75%, rgba(220,38,38,0.03) 0%, transparent 20%)
        `
      }} />

      {/* === 不均匀暗角 - 偏向右下 === */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{
        background: 'radial-gradient(ellipse at 40% 60%, transparent 5%, rgba(0,0,0,0.5) 30%, rgba(0,0,0,0.95) 100%)'
      }} />

      {/* === 左上角印章 - 墨迹晕染效果 === */}
      <div style={{
        position: 'absolute',
        left: '28px',
        top: '38px',
        transform: 'rotate(-11deg)',
        zIndex: 20
      }}>
        {/* 墨迹晕染背景 */}
        <div style={{
          position: 'absolute',
          left: '-12px',
          top: '-12px',
          right: '-12px',
          bottom: '-12px',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(180,83,9,0.2) 0%, transparent 70%)',
          filter: 'blur(6px)',
          transform: 'rotate(2deg)'
        }} />
        <div style={{
          fontSize: '30px',
          opacity: 0.65,
          color: '#b45309',
          textShadow: '2px 4px 6px rgba(0,0,0,0.7), 0 0 20px rgba(180,83,9,0.3)',
          fontFamily: "'Noto Serif SC', serif",
          letterSpacing: '8px',
          position: 'relative'
        }}>山海</div>
        {/* 铜钉 - 墨迹变形 */}
        <div style={{
          position: 'absolute',
          left: '-6px',
          top: '-8px',
          width: '11px',
          height: '11px',
          borderRadius: '40% 60% 55% 45%',
          backgroundColor: '#92400e',
          boxShadow: '2px 3px 4px rgba(0,0,0,0.7), inset 1px 1px 2px rgba(255,200,150,0.35), 0 0 8px rgba(180,83,9,0.4)',
          transform: 'rotate(15deg)'
        }} />
        <div style={{
          position: 'absolute',
          right: '-5px',
          bottom: '-6px',
          width: '8px',
          height: '8px',
          borderRadius: '60% 40% 45% 55%',
          backgroundColor: '#78350f',
          boxShadow: '1px 2px 3px rgba(0,0,0,0.7), inset 1px 1px 1px rgba(255,200,150,0.25)'
        }} />
        {/* 墨点散落 - 印章周围 */}
        <div style={{ position: 'absolute', left: '-18px', top: '15px', fontSize: '3px', color: '#92400e', opacity: 0.4, transform: 'rotate(-20deg)' }}>·</div>
        <div style={{ position: 'absolute', right: '-12px', top: '-5px', fontSize: '2px', color: '#78350f', opacity: 0.35 }}>·</div>
      </div>

      {/* === 右上角链接 - 褪色墨迹 === */}
      <div style={{
        position: 'absolute',
        right: '34px',
        top: '42px',
        transform: 'rotate(4deg)',
        zIndex: 20
      }}>
        <Link href="/privacy" className="hover:opacity-30 transition-opacity" style={{
          color: '#78716c',
          fontSize: '7px',
          letterSpacing: '5px',
          opacity: 0.4,
          textShadow: '1px 2px 3px rgba(0,0,0,0.5)'
        }}>
          隐私
        </Link>
        <span style={{ color: '#78716c', fontSize: '7px', opacity: 0.15, margin: '0 10px' }}>·</span>
        <Link href="/terms" className="hover:opacity-30 transition-opacity" style={{
          color: '#78716c',
          fontSize: '7px',
          letterSpacing: '5px',
          opacity: 0.4,
          textShadow: '1px 2px 3px rgba(0,0,0,0.5)'
        }}>
          协议
        </Link>
      </div>

      {/* === 墨点装饰群 (左边缘) - 羊皮纸毛边感 === */}
      <div style={{
        position: 'fixed',
        left: '2px',
        top: '25px',
        zIndex: 20,
        opacity: 0.35,
        color: '#b45309',
        fontSize: '5px',
        letterSpacing: '4px',
        writingMode: 'vertical-rl',
        textShadow: '0 0 6px rgba(180,83,9,0.3)'
      }}>
        ···　·　··　·　···　·　··　·　···　·　··　·　···　·　··　·　···　·　··
      </div>
      <div style={{
        position: 'fixed',
        left: '10px',
        top: '100px',
        zIndex: 20,
        opacity: 0.22,
        color: '#b45309',
        fontSize: '4px',
        letterSpacing: '3px'
      }}>
        ·　··　···　·　··　·　···　·　··　·　···　·　··　·　···　·　··
      </div>
      <div style={{
        position: 'fixed',
        left: '6px',
        top: '250px',
        zIndex: 20,
        opacity: 0.18,
        color: '#b45309',
        fontSize: '6px',
        letterSpacing: '5px'
      }}>
        ※◇※◇※◇
      </div>
      {/* 飞溅小点 - 更随意散落 */}
      <div style={{ position: 'fixed', left: '20px', top: '160px', zIndex: 20, opacity: 0.2, color: '#92400e', fontSize: '3px', transform: 'rotate(25deg)' }}>·</div>
      <div style={{ position: 'fixed', left: '4px', top: '190px', zIndex: 20, opacity: 0.14, color: '#78350f', fontSize: '4px' }}>·</div>
      <div style={{ position: 'fixed', left: '16px', top: '300px', zIndex: 20, opacity: 0.12, color: '#92400e', fontSize: '2px', transform: 'rotate(-15deg)' }}>·</div>
      <div style={{ position: 'fixed', left: '8px', top: '350px', zIndex: 20, opacity: 0.1, color: '#78350f', fontSize: '3px' }}>·</div>
      {/* 更多随机散落墨点 */}
      <div style={{ position: 'fixed', left: '25px', top: '420px', zIndex: 20, opacity: 0.08, color: '#78350f', fontSize: '2px', transform: 'rotate(35deg)' }}>·</div>
      <div style={{ position: 'fixed', left: '3px', top: '480px', zIndex: 20, opacity: 0.06, color: '#92400e', fontSize: '3px' }}>·</div>
      <div style={{ position: 'fixed', left: '14px', top: '520px', zIndex: 20, opacity: 0.05, color: '#78350f', fontSize: '2px', transform: 'rotate(-8deg)' }}>·</div>

      {/* === 主内容区 === */}
      <main style={{
        position: 'relative',
        zIndex: 20,
        padding: '120px 0 0 260px'
      }}>
        {/* 青龙图标 - 墨迹晕染+拆解龙形象 */}
        <div style={{
          position: 'absolute',
          left: '140px',
          top: '100px',
          width: '160px',
          height: '160px',
          filter: 'drop-shadow(6px 8px 12px rgba(0,0,0,0.7)) drop-shadow(-3px -2px 6px rgba(0,0,0,0.4))'
        }}>
          {/* 墨迹晕染光晕 - 不规则形状 */}
          <div style={{
            width: '165px',
            height: '165px',
            borderRadius: '42% 58% 52% 48% / 48% 52% 58% 42%',
            background: `
              radial-gradient(ellipse at 35% 35%, rgba(180,83,9,0.3) 0%, rgba(120,53,15,0.15) 30%, transparent 65%),
              radial-gradient(ellipse at 65% 70%, rgba(153,27,27,0.1) 0%, transparent 40%),
              radial-gradient(ellipse at 20% 80%, rgba(220,38,38,0.05) 0%, transparent 30%)
            `,
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(4px)'
          }} />
          {/* 龙图腾 - 用文字和符号组合代替单一emoji，打破完美圆形 */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            transform: 'rotate(18deg) translateX(-15px) translateY(8px)',
            filter: 'drop-shadow(2px 3px 4px rgba(0,0,0,0.5))'
          }}>
            {/* 龙身文字化处理 - 更歪斜更不规整 */}
            <div style={{
              fontFamily: "'Ma Shan Zheng', cursive",
              fontSize: '52px',
              color: '#dc2626',
              textShadow: '4px 4px 0 rgba(0,0,0,0.4), 0 0 20px rgba(220,38,38,0.5), 0 0 40px rgba(180,83,9,0.25)',
              transform: 'rotate(-12deg) skewX(-8deg)',
              display: 'inline-block',
              letterSpacing: '-4px',
              marginLeft: '-20px'
            }}>龍</div>
            {/* 龙角符号 */}
            <div style={{
              position: 'absolute',
              top: '-14px',
              right: '-10px',
              fontSize: '19px',
              color: '#b45309',
              opacity: 0.75,
              transform: 'rotate(25deg)',
              textShadow: '0 0 12px rgba(180,83,9,0.6), 2px 2px 4px rgba(0,0,0,0.5)',
              fontFamily: "'Ma Shan Zheng', cursive"
            }}>角</div>
            {/* 龙鳞符号 */}
            <div style={{
              position: 'absolute',
              bottom: '-10px',
              left: '22px',
              fontSize: '13px',
              color: '#78350f',
              opacity: 0.55,
              transform: 'rotate(-15deg)',
              textShadow: '1px 1px 3px rgba(0,0,0,0.4)'
            }}>鳞</div>
          </div>
          {/* 裂痕 */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '8px',
            fontSize: '12px',
            color: '#78350f',
            opacity: 0.6,
            transform: 'rotate(20deg)',
            textShadow: '0 0 8px rgba(120,53,15,0.5)'
          }}>〰</div>
          {/* 墨点飞溅 */}
          <div style={{ position: 'absolute', top: '25px', left: '5px', fontSize: '4px', color: '#92400e', opacity: 0.4, transform: 'rotate(-10deg)' }}>·</div>
          <div style={{ position: 'absolute', bottom: '20px', right: '15px', fontSize: '3px', color: '#78350f', opacity: 0.35 }}>·</div>
          {/* 更多墨点 */}
          <div style={{ position: 'absolute', top: '50px', left: '-10px', fontSize: '2px', color: '#92400e', opacity: 0.3, transform: 'rotate(30deg)' }}>·</div>
          <div style={{ position: 'absolute', bottom: '35px', right: '-5px', fontSize: '3px', color: '#78350f', opacity: 0.25 }}>·</div>
        </div>

        {/* 大标题 - 墨迹晕染阴影 */}
        <div style={{
          opacity: 1,
          transition: 'opacity 0.8s ease-out',
          transform: 'rotate(-3deg) translateX(-8px)',
          marginLeft: '-20px',
          position: 'relative'
        }}>
          {/* 标题墨迹背景 */}
          <div style={{
            position: 'absolute',
            left: '-15px',
            top: '-10px',
            right: '-10px',
            bottom: '-5px',
            background: 'radial-gradient(ellipse at 30% 50%, rgba(180,83,9,0.06) 0%, transparent 60%)',
            filter: 'blur(8px)',
            transform: 'rotate(-1deg)'
          }} />
          <h1 style={{
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: '700',
            fontSize: '48px',
            color: '#f8fafc',
            lineHeight: 1.2,
            letterSpacing: '4px',
            textShadow: '4px 5px 8px rgba(0,0,0,0.6), -1px 0 3px rgba(0,0,0,0.4), 0 0 30px rgba(180,83,9,0.15)',
            position: 'relative'
          }}>
            <span style={{
              color: '#dc2626',
              fontSize: '68px',
              textShadow: '5px 5px 0 rgba(0,0,0,0.6), -2px -1px 4px rgba(220,38,38,0.4), 0 0 40px rgba(220,38,38,0.2)'
            }}>山</span>
            <span style={{ position: 'relative', top: '5px', letterSpacing: '8px' }}>海经老板测试</span>
          </h1>
        </div>

        {/* 副标题 */}
        <div style={{
          opacity: 1,
          transition: 'opacity 0.8s ease-out 0.3s',
          marginTop: '22px',
          marginLeft: '60px',
          transform: 'rotate(1.5deg)'
        }}>
          <p style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '9px',
            color: '#a8a29e',
            opacity: 0.55,
            letterSpacing: '8px',
            textShadow: '1px 2px 4px rgba(0,0,0,0.5), 0 0 15px rgba(180,83,9,0.1)'
          }}>
            24道灵魂拷问，测出你的老板人格类型
          </p>
        </div>

        {/* 三个卡片 - 残缺边框+墨迹 */}
        <div style={{
          position: 'relative',
          height: '240px',
          marginTop: '18px'
        }}>
          {/* 卡片1 */}
          <div style={{
            position: 'absolute',
            left: '-40px',
            top: '0px',
            width: '155px',
            height: '82px',
            background: 'linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.4) 100%)',
            borderRadius: '3px 0 0 3px',
            padding: '10px 12px',
            boxShadow: 'inset 0 4px 18px rgba(0,0,0,0.8), 5px 6px 14px rgba(0,0,0,0.6), -1px -1px 4px rgba(180,83,9,0.25)',
            transform: 'rotate(-5deg)',
            borderLeft: '6px solid #b45309',
            opacity: 1,
            transition: 'opacity 0.8s ease-out 0.5s'
          }}>
            {/* 残缺边框暗示 */}
            <div style={{ position: 'absolute', top: '0', right: '0', width: '20px', height: '3px', background: 'rgba(0,0,0,0.8)' }} />
            <div style={{ position: 'absolute', bottom: '0', right: '0', width: '15px', height: '2px', background: 'rgba(0,0,0,0.6)' }} />
            <p style={{
              fontFamily: "'Ma Shan Zheng', cursive",
              fontSize: '13px',
              color: '#f8fafc',
              lineHeight: 1.8,
              letterSpacing: '2px',
              textShadow: '1px 2px 3px rgba(0,0,0,0.6), 0 0 12px rgba(180,83,9,0.1)'
            }}>
              36种精怪人格
            </p>
            <div style={{ position: 'absolute', right: '12px', bottom: '12px', width: '7px', height: '7px', borderRadius: '45% 55% 50% 50%', backgroundColor: '#78350f', boxShadow: '1px 2px 3px rgba(0,0,0,0.6), inset 0 0 3px rgba(255,200,150,0.25)' }} />
            {/* 额外墨点 */}
            <div style={{ position: 'absolute', left: '8px', bottom: '6px', width: '2px', height: '2px', backgroundColor: '#78350f', borderRadius: '50%', opacity: 0.4 }} />
          </div>

          {/* 卡片2 */}
          <div style={{
            position: 'absolute',
            left: '150px',
            top: '-25px',
            width: '190px',
            height: '92px',
            background: 'linear-gradient(120deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 100%)',
            borderRadius: '0 15px 0 0',
            padding: '14px',
            boxShadow: 'inset 0 5px 20px rgba(0,0,0,0.75), -5px 7px 16px rgba(0,0,0,0.6), 3px 3px 8px rgba(180,83,9,0.2)',
            transform: 'rotate(4.5deg)',
            borderRight: '5px solid rgba(180,83,9,0.7)',
            opacity: 1,
            transition: 'opacity 0.8s ease-out 0.65s'
          }}>
            <p style={{
              fontFamily: "'Ma Shan Zheng', cursive",
              fontSize: '14px',
              color: '#f8fafc',
              lineHeight: 1.7,
              letterSpacing: '1px',
              textShadow: '1px 2px 3px rgba(0,0,0,0.6)'
            }}>
              人格增强报告
            </p>
            {/* 裂痕装饰 */}
            <div style={{ position: 'absolute', top: '6px', right: '10px', fontSize: '8px', color: '#78350f', opacity: 0.4, transform: 'rotate(10deg)' }}>〰</div>
          </div>

          {/* 卡片3 */}
          <div style={{
            position: 'absolute',
            left: '380px',
            top: '20px',
            width: '145px',
            height: '78px',
            background: 'linear-gradient(225deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.5) 100%)',
            borderRadius: '0 0 20px 0',
            padding: '12px 14px',
            boxShadow: 'inset 0 5px 22px rgba(0,0,0,0.8), 6px 8px 18px rgba(0,0,0,0.65), -1px 0 4px rgba(220,38,38,0.25)',
            transform: 'rotate(-3deg)',
            borderTop: '5px solid rgba(220,38,38,0.65)',
            opacity: 1,
            transition: 'opacity 0.8s ease-out 0.8s'
          }}>
            <p style={{
              fontFamily: "'Ma Shan Zheng', cursive",
              fontSize: '12px',
              color: '#f8fafc',
              lineHeight: 1.8,
              letterSpacing: '1px',
              textShadow: '1px 2px 3px rgba(0,0,0,0.6)'
            }}>
              专属赚钱建议
            </p>
            <div style={{ position: 'absolute', top: '10px', right: '14px', fontSize: '8px', color: '#991b1b', opacity: 0.6, transform: 'rotate(-12deg)', textShadow: '0 0 6px rgba(153,27,27,0.5)' }}>〰</div>
            {/* 额外墨点 */}
            <div style={{ position: 'absolute', bottom: '8px', left: '10px', width: '3px', height: '3px', backgroundColor: '#92400e', borderRadius: '50%', opacity: 0.35, transform: 'rotate(20deg)' }} />
          </div>
        </div>

        {/* 开始测试按钮 - 印章篆刻+墨迹 */}
        <div style={{
          opacity: 1,
          transition: 'opacity 0.8s ease-out 0.95s',
          transform: 'rotate(-4deg)',
          marginTop: '16px',
          position: 'relative'
        }}>
          {/* 按钮墨迹背景 */}
          <div style={{
            position: 'absolute',
            left: '-10px',
            top: '-8px',
            right: '-8px',
            bottom: '-6px',
            background: 'radial-gradient(ellipse at 50% 50%, rgba(153,27,27,0.2) 0%, transparent 70%)',
            filter: 'blur(6px)',
            transform: 'rotate(-1deg)'
          }} />
          <Link href="/zh/sbti">
            <button style={{
              width: '175px',
              height: '56px',
              backgroundColor: '#991b1b',
              color: 'white',
              fontWeight: '700',
              fontSize: '18px',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              letterSpacing: '10px',
              boxShadow: '6px 6px 0 rgba(0,0,0,0.7), 4px 5px 10px rgba(0,0,0,0.5), inset 2px 2px 0 rgba(255,255,255,0.1), inset -2px -2px 0 rgba(0,0,0,0.2)',
              transform: 'skewX(-10deg)',
              textShadow: '3px 3px 4px rgba(0,0,0,0.6), 0 0 20px rgba(220,38,38,0.3)',
              position: 'relative'
            }}>
              <span style={{ position: 'relative', top: '-3px', display: 'inline-block' }}>开始测试</span>
            </button>
          </Link>
        </div>

        {/* 底部文字 */}
        <div style={{
          opacity: 1,
          transition: 'opacity 0.8s ease-out 1.1s',
          marginTop: '10px',
          transform: 'rotate(1deg)'
        }}>
          <p style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '7px',
            color: '#78716c',
            opacity: 0.25,
            letterSpacing: '5px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}>
            完全匿名·无需注册·3分钟完成
          </p>
        </div>
      </main>

      {/* === 右下角甲骨文碎片 - 墨迹晕染 === */}
      <div style={{
        position: 'fixed',
        bottom: '12px',
        right: '12px',
        opacity: 0.25,
        color: '#b45309',
        fontSize: '20px',
        transform: 'rotate(25deg)',
        letterSpacing: '8px',
        zIndex: 20,
        textShadow: '3px 3px 6px rgba(0,0,0,0.5), 0 0 25px rgba(180,83,9,0.35)'
      }}>
        ◯◻◽◾▫
      </div>

      {/* === 更多墨点群(右下) === */}
      <div style={{ position: 'fixed', right: '50px', bottom: '40px', opacity: 0.18, color: '#b45309', fontSize: '5px', letterSpacing: '5px', zIndex: 20 }}>···　·　··　·　···　·　··</div>
      <div style={{ position: 'fixed', right: '14px', bottom: '60px', opacity: 0.14, color: '#92400e', fontSize: '3px', zIndex: 20 }}>·</div>
      <div style={{ position: 'fixed', right: '30px', bottom: '15px', opacity: 0.1, color: '#78350f', fontSize: '4px', zIndex: 20 }}>·</div>
      {/* 更多随机散落 */}
      <div style={{ position: 'fixed', right: '6px', bottom: '100px', opacity: 0.06, color: '#78350f', fontSize: '2px', zIndex: 20, transform: 'rotate(-25deg)' }}>·</div>
      <div style={{ position: 'fixed', right: '40px', bottom: '90px', opacity: 0.05, color: '#92400e', fontSize: '3px', zIndex: 20 }}>·</div>

      {/* === 右侧装饰线群 - 墨迹流淌感 === */}
      <div style={{ position: 'fixed', right: '4px', top: '25%', width: '2px', height: '120px', background: 'linear-gradient(to bottom, transparent 0%, #b45309 15%, #78350f 50%, #b45309 85%, transparent 100%)', transform: 'rotate(10deg)', opacity: 0.22, zIndex: 20, boxShadow: '0 0 10px rgba(180,83,9,0.3)' }} />
      <div style={{ position: 'fixed', right: '10px', top: '40%', width: '1px', height: '80px', background: 'linear-gradient(to bottom, transparent 10%, rgba(180,83,9,0.5) 50%, transparent 90%)', transform: 'rotate(-8deg)', opacity: 0.14, zIndex: 20 }} />
      <div style={{ position: 'fixed', right: '16px', top: '52%', width: '1px', height: '55px', background: 'linear-gradient(to bottom, transparent, rgba(120,53,15,0.4) 40%, transparent)', transform: 'rotate(4deg)', opacity: 0.1, zIndex: 20 }} />
      {/* 更多装饰线 */}
      <div style={{ position: 'fixed', right: '22px', top: '65%', width: '1px', height: '40px', background: 'linear-gradient(to bottom, transparent, rgba(153,27,27,0.3) 50%, transparent)', transform: 'rotate(-3deg)', opacity: 0.08, zIndex: 20 }} />

      {/* === 角落破损暗示 - 4处不规则 === */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100px', height: '100px', background: 'radial-gradient(circle at top left, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.25) 25%, transparent 50%)', zIndex: 15, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, width: '120px', height: '60px', background: 'radial-gradient(circle at top right, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 20%, transparent 45%)', zIndex: 15, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '70px', height: '70px', background: 'radial-gradient(circle at bottom left, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 30%, transparent 55%)', zIndex: 15, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: 0, right: 0, width: '100px', height: '80px', background: 'radial-gradient(circle at bottom right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.12) 25%, transparent 50%)', zIndex: 15, pointerEvents: 'none' }} />

      {/* === 顶部古旧边缘 === */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)', zIndex: 15, pointerEvents: 'none' }} />

      {/* === 更多随机散落装饰元素 === */}
      {/* 左下角裂痕群 */}
      <div style={{ position: 'fixed', left: '45px', bottom: '80px', zIndex: 20, opacity: 0.15, color: '#78350f', fontSize: '8px', transform: 'rotate(12deg)' }}>〰</div>
      <div style={{ position: 'fixed', left: '60px', bottom: '120px', zIndex: 20, opacity: 0.1, color: '#92400e', fontSize: '6px', transform: 'rotate(-8deg)' }}>〰</div>
      {/* 右上角散落 */}
      <div style={{ position: 'fixed', right: '80px', top: '100px', zIndex: 20, opacity: 0.08, color: '#b45309', fontSize: '4px', transform: 'rotate(18deg)' }}>·</div>
      <div style={{ position: 'fixed', right: '120px', top: '80px', zIndex: 20, opacity: 0.06, color: '#78350f', fontSize: '3px' }}>·</div>
      {/* 中间散落 */}
      <div style={{ position: 'fixed', left: '50%', top: '30%', zIndex: 20, opacity: 0.04, color: '#92400e', fontSize: '5px', transform: 'rotate(-30deg)' }}>角</div>
    </div>
  )
}
