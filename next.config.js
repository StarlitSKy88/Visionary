/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['localhost', 'api.yungouos.com', 'pay.yungouos.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_WECHAT_APPID: process.env.WECHAT_MINI_APPID,
  },
  // API重写规则（生产环境直接本地处理，不需要代理）
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/sbti/:path*',
  //       destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/sbti/:path*`,
  //     },
  //   ]
  // },
  // 安全策略
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' },
        ],
      },
    ]
  },
}

module.exports = nextConfig