export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#2e3440] text-[#d8dee9]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[#eceff4] mb-8">隐私政策</h1>
        <div className="prose prose-invert prose-lg max-w-none space-y-6 text-[#d8dee9]">
          <p>最后更新日期：2024年</p>

          <h2 className="text-xl font-semibold text-[#88c0d0]">1. 信息收集</h2>
          <p>我们收集您主动提供的信息，包括：注册时提供的邮箱、企业信息；使用AI服务时输入的业务数据；通过微信支付等第三方平台收集的交易信息。</p>
          <p>我们还收集服务使用日志，包括IP地址、访问时间、操作行为等，用于安全分析和产品优化。</p>

          <h2 className="text-xl font-semibold text-[#88c0d0]">2. 信息使用</h2>
          <p>您的信息用于：提供和改进AI服务；处理交易和发送服务通知；安全验证和风控；遵守法律法规。我们不会将您的个人信息用于营销目的。</p>

          <h2 className="text-xl font-semibold text-[#88c0d0]">3. 信息共享</h2>
          <p>除以下情况外，我们不会与第三方共享您的个人信息：获得您的明确同意；为提供服务而必须与合作伙伴共享；法律法规要求的情况。</p>

          <h2 className="text-xl font-semibold text-[#88c0d0]">4. 信息安全</h2>
          <p>我们采用加密存储、访问控制、安全审计等措施保护您的数据。但互联网传输无法保证100%安全，请您理解。</p>

          <h2 className="text-xl font-semibold text-[#88c0d0]">5. 数据保留</h2>
          <p>您的账户数据将在您注销账户后保留30天，此后彻底删除。交易记录等法定保留期限内的数据，将按法律法规处理。</p>

          <h2 className="text-xl font-semibold text-[#88c0d0]">6. 您的权利</h2>
          <p>您有权：访问和导出您的数据；更正不准确的信息；注销账户删除数据。您可以通过应用内设置或联系客服行使这些权利。</p>

          <h2 className="text-xl font-semibold text-[#88c0d0]">7. 未成年人</h2>
          <p>我们的服务面向18岁以上用户。如有未满18岁的用户使用，须由其监护人同意。我们不会故意收集未成年人的个人信息。</p>

          <h2 className="text-xl font-semibold text-[#88c0d0]">8. 政策变更</h2>
          <p>我们可能会更新本政策，更新时会在应用内显著位置通知。如有重大变更，我们承诺继续保护您的权利。</p>

          <h2 className="text-xl font-semibold text-[#88c0d0]">9. 联系我们</h2>
          <p>如对隐私政策有任何疑问，请通过 support@yourdomain.com 与我们联系。</p>
        </div>
      </div>
    </div>
  )
}
