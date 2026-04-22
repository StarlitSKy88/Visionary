'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrivacyPage() {
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
          <h1 className="font-semibold" style={{ color: 'var(--text-primary)' }}>隐私政策</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-6" style={{ color: 'var(--text-secondary)' }}>
          <p className="text-sm">最后更新日期：2024年</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>1. 信息收集</h2>
          <p>我们收集您在使用SBTI测试时主动提供的信息，包括：测试答案、人格类型等。您无需注册账户即可使用本服务。</p>
          <p>我们还收集服务使用日志，包括IP地址、访问时间等，用于安全分析和产品优化。</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>2. 信息使用</h2>
          <p>您的信息用于：生成人格测试报告；改进AI服务；安全验证。我们不会将您的个人信息用于营销目的。</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>3. 信息共享</h2>
          <p>除以下情况外，我们不会与第三方共享您的个人信息：获得您的明确同意；为提供服务而必须与合作伙伴共享；法律法规要求的情况。</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>4. 信息安全</h2>
          <p>我们采用加密存储、访问控制、安全审计等措施保护您的数据。但互联网传输无法保证100%安全，请您理解。</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>5. 数据保留</h2>
          <p>您的测试数据将在您注销账户后保留30天，此后彻底删除。</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>6. 您的权利</h2>
          <p>您有权：访问和导出您的数据；更正不准确的信息；注销账户删除数据。您可以通过联系客服行使这些权利。</p>

          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>7. 联系我们</h2>
          <p>如对隐私政策有任何疑问，请通过 support@yourdomain.com 与我们联系。</p>
        </div>
      </main>
    </div>
  )
}
