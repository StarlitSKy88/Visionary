// 加载环境变量
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { initDatabase } = require('./db')

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// 请求日志（仅非生产环境）
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
      const duration = Date.now() - start
      if (req.path !== '/health') {
        console.log(`${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`)
      }
    })
    next()
  })
}

// 初始化数据库
initDatabase()

// 路由
app.use('/api/auth', require('./routes/auth'))
app.use('/api/agents', require('./routes/agents'))
app.use('/api/orders', require('./routes/orders'))
app.use('/api/admin', require('./routes/admin'))

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
  console.error('Unhandled Error:', err)

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
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)

  // 检查关键环境变量
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('⚠️  OPENROUTER_API_KEY 未设置，AI功能不可用')
  }
})
