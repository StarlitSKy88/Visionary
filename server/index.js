// 加载环境变量
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { initDatabase } = require('./db')
const { init: initScheduler, shutdown: shutdownScheduler } = require('./lib/scheduler')
const { safeLog } = require('./lib/logger')

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
// 捕获原始 body（用于微信支付回调验签）
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => { req.rawBody = buf.toString() }
}))
app.use(express.urlencoded({ extended: true }))

// 请求日志
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    if (req.path !== '/health') {
      safeLog({ method: req.method, path: req.path, status: res.statusCode, durationMs: duration, type: 'http_request' })
    }
  })
  next()
})

// 初始化数据库
initDatabase().then(() => {
  safeLog({ type: 'db_initialized' }, '✅ 数据库初始化完成')
  // 启动调度器
  initScheduler()
}).catch(err => {
  safeLog({ error: err.message, type: 'db_init_failed' }, '❌ 数据库初始化失败')
})

// 路由
app.use('/api/auth', require('./routes/auth'))
app.use('/api/agents', require('./routes/agents'))
app.use('/api/orders', require('./routes/orders'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/analytics', require('./routes/analytics'))
app.use('/api/team', require('./routes/team'))

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  })
})

// 404处理
app.use((req, res) => {
  res.status(404).json({ success: false, error: '接口不存在' })
})

// 全局错误处理
app.use((err, req, res, next) => {
  safeLog({ error: err.message, stack: err.stack, type: 'unhandled_error' }, '❌ Unhandled Error')

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: '请求格式错误' })
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: '请求数据过大' })
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
  })
})

app.listen(PORT, () => {
  safeLog({ port: PORT, env: process.env.NODE_ENV || 'development', type: 'server_started' }, `🚀 Server running on http://localhost:${PORT}`)
})

// 优雅关闭
process.on('SIGTERM', () => {
  safeLog({ type: 'shutdown_signal', signal: 'SIGTERM' }, '收到 SIGTERM，正在关闭...')
  shutdownScheduler()
  process.exit(0)
})

process.on('SIGINT', () => {
  safeLog({ type: 'shutdown_signal', signal: 'SIGINT' }, '收到 SIGINT，正在关闭...')
  shutdownScheduler()
  process.exit(0)
})
