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
        source: '/api/auth/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/:path*`,
      },
      {
        source: '/api/agents/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/agents/:path*`,
      },
      {
        source: '/api/orders/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/orders/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/admin/:path*`,
      },
      {
        source: '/api/analytics/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/analytics/:path*`,
      },
      {
        source: '/api/team/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/team/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
