import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/misc'
import { Navbar, HeroSection, FeaturesSection, PricingSection, Footer } from '@/components/sections'

export const metadata: Metadata = {
  title: 'AI经营助手 - 小微企业专属定制平台',
  description: '口语描述经营痛点，AI自动帮你生成落地的AI数字员工配置方案',
}

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </main>
  )
}
