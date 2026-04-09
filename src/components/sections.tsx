'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  Shield,
  Sparkles,
  ChevronRight
} from 'lucide-react'

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[rgba(136,192,208,0.1)]">
      <div className="mx-auto max-w-7xl px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-[#88c0d0] flex items-center justify-center text-[#2e3440] font-display font-bold text-lg group-hover:shadow-frost transition-shadow">
            AI
          </div>
          <span className="font-display font-semibold text-[#eceff4] hidden sm:block tracking-tight">
            AI经营助手
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              登录
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">
              免费试用
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-16 md:pt-44 md:pb-28 overflow-hidden">
      {/* Layered background */}
      <div className="absolute inset-0 bg-[#2e3440]" />
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute inset-0 bg-radial-frost" />

      {/* Floating orbs */}
      <div className="absolute top-20 left-[10%] w-64 h-64 bg-[#88c0d0] opacity-[0.06] rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-10 right-[15%] w-48 h-48 bg-[#a3be8c] opacity-[0.04] rounded-full blur-[80px] animate-pulse-glow" />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 flex justify-center fade-in stagger-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(136,192,208,0.2)] bg-[rgba(136,192,208,0.06)]">
              <Sparkles className="w-4 h-4 text-[#88c0d0]" />
              <span className="text-sm text-[#88c0d0] font-medium">全新发布 · 7天免费试用</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="fade-in stagger-2 text-4xl md:text-6xl lg:text-7xl font-display font-extrabold tracking-tight text-[#eceff4] mb-6 leading-[1.1]">
            口语描述痛点
            <br />
            <span className="text-[#88c0d0]">
              AI自动生成助手
            </span>
          </h1>

          {/* Description */}
          <p className="fade-in stagger-3 text-lg md:text-xl text-[#81a1c1] mb-10 max-w-2xl mx-auto leading-relaxed font-light">
            不会表达专业需求？没关系。说出你的经营困难，
            <br className="hidden md:block" />
            我们帮你生成能真正干活的<span className="text-[#eceff4] font-normal">AI数字员工</span>。
          </p>

          {/* CTA */}
          <div className="fade-in stagger-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto group text-base">
                免费开始使用
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="#features" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base">
                了解更多
              </Button>
            </Link>
          </div>

          {/* Trust */}
          <div className="fade-in stagger-5 mt-10 flex items-center justify-center gap-2 text-sm text-[#616e88]">
            <Shield className="w-4 h-4 text-[#a3be8c]" />
            <span>隐私优先 · 数据本地处理 · 不上云</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export function FeaturesSection() {
  const features = [
    { icon: '🎯', title: '口语即专业', desc: '大白话描述困难，自动转化为专业AI配置' },
    { icon: '🧠', title: '6轮深度推演', desc: '多Agent协作辩论，确保方案可行' },
    { icon: '🔄', title: '免费重试', desc: '评分95分才交付，不满意无限优化' },
    { icon: '💰', title: '裂变退款', desc: '3天邀请3人，全额退款继续使用' },
  ]

  return (
    <section id="features" className="py-20 md:py-32 relative bg-[#2e3440]">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center mb-14 md:mb-20">
          <h2 className="fade-in stagger-1 text-3xl md:text-4xl font-display font-extrabold tracking-tight text-[#eceff4] mb-4">
            为什么选择我们
          </h2>
          <p className="fade-in stagger-2 text-[#81a1c1] text-lg font-light">
            专为小微企业设计的AI解决方案
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className={cn(
                'group relative rounded-2xl p-6 border border-[rgba(136,192,208,0.1)] bg-[#3b4252]',
                'hover:border-[rgba(136,192,208,0.25)] hover:shadow-frost transition-all duration-300',
                `fade-in stagger-${i + 2}`
              )}
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-base font-display font-bold text-[#eceff4] mb-2 tracking-tight">
                {f.title}
              </h3>
              <p className="text-sm text-[#81a1c1] leading-relaxed font-light">
                {f.desc}
              </p>
              <ChevronRight className="absolute bottom-6 right-6 w-4 h-4 text-[#616e88] group-hover:text-[#88c0d0] group-hover:translate-x-0.5 transition-all" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PricingSection() {
  const plans = [
    { name: '体验版', price: '¥0', period: '永久', features: ['1次基础翻译体验', '通用行业规则'], popular: false },
    { name: '专业版', price: '¥299', period: '永久', features: ['垂类专属规则库', '四平台配置导出', '7天免费试用'], popular: true },
    { name: '旗舰版', price: '¥499', period: '永久', features: ['全行业规则库', '优先人工支持', 'API接口调用'], popular: false },
  ]

  return (
    <section id="pricing" className="py-20 md:py-32 relative">
      <div className="absolute inset-0 bg-radial-aurora" />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center mb-14 md:mb-20">
          <h2 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight text-[#eceff4] mb-4">
            简单透明的定价
          </h2>
          <p className="text-[#81a1c1] text-lg font-light">
            一次性付费，永久使用
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={cn(
                'relative rounded-2xl p-8 border transition-all duration-300',
                plan.popular
                  ? 'bg-[#3b4252] border-[#88c0d0] shadow-frost md:scale-105 ring-1 ring-[rgba(136,192,208,0.2)]'
                  : 'bg-[#3b4252] border-[rgba(136,192,208,0.1)] hover:border-[rgba(136,192,208,0.2)]'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="solid">推荐</Badge>
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-lg font-display font-bold text-[#eceff4] mb-3 tracking-tight">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-display font-extrabold text-[#eceff4]">{plan.price}</span>
                  <span className="text-[#616e88]">/{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-[#81a1c1] font-light">
                    <span className="text-[#a3be8c] text-base">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block">
                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  className="w-full"
                >
                  开始使用
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-[rgba(136,192,208,0.08)] bg-[#2e3440]">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-[#88c0d0] flex items-center justify-center text-[#2e3440] font-display font-bold text-xs">
              AI
            </div>
            <span className="text-sm text-[#616e88]">
              © 2025 AI经营助手
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#616e88]">
            <Link href="/privacy" className="hover:text-[#88c0d0] transition-colors">隐私政策</Link>
            <Link href="/terms" className="hover:text-[#88c0d0] transition-colors">服务条款</Link>
            <Link href="/contact" className="hover:text-[#88c0d0] transition-colors">联系我们</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
