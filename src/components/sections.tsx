'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/misc'
import { LangSwitch } from '@/components/ui/lang-switch'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'
import {
  ArrowRight,
  Shield,
  Sparkles,
  ChevronRight,
  Bot,
  Zap,
  Users,
  FileText,
  Star,
  Check,
  MessageSquare,
  BarChart3,
  Workflow
} from 'lucide-react'

export function Navbar() {
  const { t } = useI18n()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[rgba(255,255,255,0.05)]">
      <div className="mx-auto max-w-7xl px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3ec489] to-[#2eb06c] flex items-center justify-center shadow-lg shadow-[#3ec489]/20 group-hover:shadow-[#3ec489]/40 transition-all">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-white hidden sm:block tracking-tight">
            {t.common.appName}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <LangSwitch />
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-[#a3a3a3] hover:text-white">
              {t.common.login}
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="shadow-lg shadow-[#3ec489]/20">
              {t.home.pricingFree}
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}

export function HeroSection() {
  const { t } = useI18n()

  return (
    <section className="relative pt-32 pb-16 md:pt-44 md:pb-28 overflow-hidden">
      {/* Layered background */}
      <div className="absolute inset-0 bg-[#161616]" />
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 bg-radial-green-intense" />

      {/* Floating orbs */}
      <div className="absolute top-20 left-[10%] w-96 h-96 bg-[#3ec489] opacity-10 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-10 right-[15%] w-[500px] h-[500px] bg-[#3ec489] opacity-5 rounded-full blur-[150px] animate-float" style={{ animationDelay: '2s' }} />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 flex justify-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#3ec489]/20 bg-[#3ec489]/10 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-[#3ec489]" />
              <span className="text-sm text-[#3ec489] font-medium">{t.home.heroBadge}</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="animate-fade-in-up animation-delay-100 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
            {t.home.heroTitle}
          </h1>

          {/* Description */}
          <p className="animate-fade-in-up animation-delay-200 text-lg md:text-xl text-[#a3a3a3] mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.home.heroSubtitle}
          </p>

          {/* CTA */}
          <div className="animate-fade-in-up animation-delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto group text-base h-12 px-8 shadow-xl shadow-[#3ec489]/20 hover:shadow-[#3ec489]/40 transition-all duration-300">
                {t.home.heroCta}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="#features" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base h-12 px-8 border-[#333333] hover:bg-[#262626] transition-all">
                {t.home.heroLearnMore}
              </Button>
            </Link>
          </div>

          {/* Trust */}
          <div className="animate-fade-in-up animation-delay-400 mt-12 flex items-center justify-center gap-6 text-sm text-[#737373]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#3ec489]" />
              <span>{t.home.trustPrivacy}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#3ec489]" />
              <span>{t.home.trustLocal}</span>
            </div>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#3ec489]" />
              <span>{t.home.trustAI}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function FeaturesSection() {
  const { t } = useI18n()

  const features = [
    {
      icon: MessageSquare,
      title: t.home.feature1Title,
      desc: t.home.feature1Desc,
    },
    {
      icon: Workflow,
      title: t.home.feature2Title,
      desc: t.home.feature2Desc,
    },
    {
      icon: Star,
      title: t.home.feature3Title,
      desc: t.home.feature3Desc,
    },
    {
      icon: Users,
      title: t.home.feature4Title,
      desc: t.home.feature4Desc,
    },
  ]

  return (
    <section id="features" className="py-20 md:py-32 relative bg-[#1a1a1a]">
      <div className="absolute inset-0 bg-grid-subtle opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-[#3ec489]/20 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center mb-14 md:mb-20">
          <h2 className="animate-fade-in-up text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
            {t.home.featureTitle}
          </h2>
          <p className="animate-fade-in-up animation-delay-100 text-[#a3a3a3] text-lg">
            {t.home.featureSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className={cn(
                'group relative rounded-2xl p-6 border border-[#2e2e2e] bg-[#1f1f1f]',
                'hover:border-[#3ec489]/30 hover:bg-[#262626] transition-all duration-300',
                `animate-fade-in-up animation-delay-${i + 100}`
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3ec489]/20 to-[#3ec489]/5 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-[#3ec489]" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-[#a3a3a3] leading-relaxed">
                {f.desc}
              </p>
              <ChevronRight className="absolute bottom-6 right-6 w-4 h-4 text-[#525252] group-hover:text-[#3ec489] group-hover:translate-x-1 transition-all" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PricingSection() {
  const { t } = useI18n()

  const plans = [
    {
      name: t.home.pricingFree,
      price: t.home.pricingFreePrice || '¥0',
      period: t.home.pricingFreePeriod || '永久',
      features: [t.home.pricingFreeDesc1 || '1次基础翻译体验', t.home.pricingFreeDesc2 || '通用行业规则'],
      popular: false,
      icon: FileText
    },
    {
      name: t.home.pricingPro,
      price: t.home.pricingProPrice,
      period: t.home.pricingProPeriod,
      features: [t.home.pricingProDesc1 || '垂类专属规则库', t.home.pricingProDesc2 || '四平台配置导出', t.home.pricingProDesc3 || '7天免费试用'],
      popular: true,
      icon: Zap
    },
    {
      name: t.home.pricingEnterprise,
      price: t.home.pricingEnterprisePrice || '¥499',
      period: t.home.pricingEnterprisePeriod || '永久',
      features: [t.home.pricingEnterpriseDesc1 || '全行业规则库', t.home.pricingEnterpriseDesc2 || '优先人工支持', t.home.pricingEnterpriseDesc3 || 'API接口调用'],
      popular: false,
      icon: BarChart3
    },
  ]

  return (
    <section id="pricing" className="py-20 md:py-32 relative bg-[#161616]">
      <div className="absolute inset-0 bg-radial-green opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#3ec489]/5 rounded-full blur-[200px]" />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center mb-14 md:mb-20">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
            {t.home.pricingTitle}
          </h2>
          <p className="text-[#a3a3a3] text-lg">
            {t.home.pricingSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={cn(
                'relative rounded-2xl p-8 border transition-all duration-300',
                plan.popular
                  ? 'bg-gradient-to-b from-[#262626] to-[#1f1f1f] border-[#3ec489] shadow-xl shadow-[#3ec489]/10 md:scale-105'
                  : 'bg-[#1f1f1f] border-[#2e2e2e] hover:border-[#333333]'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="primary" size="md">{t.home.pricingRecommended}</Badge>
                </div>
              )}

              <div className="w-12 h-12 rounded-xl bg-[#3ec489]/10 flex items-center justify-center mb-6">
                <plan.icon className="w-6 h-6 text-[#3ec489]" />
              </div>

              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-white mb-3">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-[#737373]">/{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm text-[#a3a3a3]">
                    <Check className="w-4 h-4 text-[#3ec489] flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href="/register" className="block">
                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  className={cn('w-full', !plan.popular && 'border-[#333333] hover:bg-[#262626]')}
                >
                  {t.home.pricingStart}
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
  const { t } = useI18n()

  return (
    <footer className="border-t border-[#2e2e2e] bg-[#0f0f0f]">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3ec489] to-[#2eb06c] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-[#737373]">
              {t.home.footerRights}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#737373]">
            <Link href="/privacy" className="hover:text-[#3ec489] transition-colors">{t.home.footerPrivacy}</Link>
            <Link href="/terms" className="hover:text-[#3ec489] transition-colors">{t.home.footerTerms}</Link>
            <Link href="/contact" className="hover:text-[#3ec489] transition-colors">{t.home.footerContact}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
