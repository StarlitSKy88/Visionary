'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'rgba(var(--bg-elevated), 0.8)' }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
          <h1 className="font-semibold" style={{ color: 'var(--text-primary)' }}>用户协议</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-6" style={{ color: 'var(--text-secondary)' }}>
          <p className="text-sm">最后更新日期：2024年</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>1. 服务说明</h2>
          <p>山海经老板测试是一个基于人工智能的人格测试工具，帮助用户了解自己的老板人格类型和赚钱特质。用户使用本服务即表示同意遵守本协议。</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>2. 使用规则</h2>
          <p>用户需保证测试答案的真实性和原创性，对账户下所有活动负责。用户同意不利用本服务从事任何违法活动，因用户原因导致的任何损失，由用户自行承担。</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>3. 付费服务</h2>
          <p>完整报告解锁为付费服务，定价以平台公示为准（¥99）。付费服务一经开通，不支持退款，除非法律法规另有规定。</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>4. 知识产权</h2>
          <p>平台及其用户生成的内容，知识产权归属各有产方。用户同意授权平台在运营必要范围内使用其生成的内容。</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>5. 免责声明</h2>
          <p>AI生成内容仅供参考，平台不对其准确性、完整性做任何保证。用户因依赖建议而做出的决策，相应后果由用户自行承担。</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>6. 服务变更</h2>
          <p>平台保留随时修改或中断服务的权利，并会提前通知用户。因服务变更导致的损失，平台承担的责任不超过用户为该服务支付的金额。</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>7. 联系我们</h2>
          <p>如对本协议有任何疑问，请通过 support@yourdomain.com 与我们联系。</p>
        </div>
      </main>
    </div>
  )
}
