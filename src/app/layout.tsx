import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { I18nProvider } from '@/i18n'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'AI经营助手 - 小微企业专属定制',
  description: '口语描述经营痛点，AI自动生成专属经营助手，7天免费试用',
  keywords: 'AI经营助手,小微企业,智能客服,报价助手,库存管理',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased bg-[#161616] text-white min-h-screen">
        <ErrorBoundary>
          <I18nProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </I18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
