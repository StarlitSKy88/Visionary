/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // API重写规则（代理到后端）
  async rewrites() {
    return [
      {
        source: '/api/sbti/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/sbti/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
