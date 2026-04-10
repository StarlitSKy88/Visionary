/**
 * 日志服务 - 使用 pino
 * 脱敏处理敏感数据
 */

let pino = null
let logger = null

try {
  pino = require('pino')
  const level = process.env.LOG_LEVEL || 'info'
  const pretty = process.env.LOG_PRETTY === 'true' || process.env.NODE_ENV !== 'production'

  logger = pino({
    level,
    transport: pretty ? {
      target: 'pino-pretty',
      options: { colorize: true }
    } : undefined,
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  })
} catch (e) {
  // pino 未安装，降级到 console
  logger = {
    info: (...args) => console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
    debug: (...args) => console.log(...args),
    child: () => ({
      info: (...args) => console.log(...args),
      warn: (...args) => console.warn(...args),
      error: (...args) => console.error(...args),
      debug: (...args) => console.log(...args),
    }),
  }
}

/**
 * 脱敏敏感数据
 */
function desensitize(key, value) {
  if (value === undefined || value === null) return value

  const sensitiveKeys = [
    'password', 'passwd', 'secret', 'token', 'key', 'api_key', 'apikey',
    'authorization', 'auth', 'credential', 'private', 'jwt', 'hmac',
    'email', 'phone', 'mobile', 'idcard', '身份证', '验证码', 'code',
    'name', 'realname', 'bank', 'card', 'cvv', 'ssn',
  ]

  const lowerKey = key.toLowerCase()
  const isSensitive = sensitiveKeys.some(k => lowerKey.includes(k))

  if (isSensitive && typeof value === 'string') {
    if (value.length <= 4) return '****'
    return value.slice(0, 2) + '****' + value.slice(-2)
  }

  return value
}

/**
 * 创建子日志器（带请求上下文）
 */
function createRequestLogger(req) {
  if (!logger || !logger.child) {
    return {
      info: (...args) => console.log(`[${req?.method || ''} ${req?.path || ''}]`, ...args),
      warn: (...args) => console.warn(`[${req?.method || ''} ${req?.path || ''}]`, ...args),
      error: (...args) => console.error(`[${req?.method || ''} ${req?.path || ''}]`, ...args),
    }
  }

  return logger.child({
    req: {
      method: req.method,
      path: req.path,
      ip: req.ip,
    }
  })
}

/**
 * 安全记录日志（自动脱敏）
 */
function safeLog(obj, ...args) {
  if (!logger) return

  if (typeof obj === 'object' && obj !== null) {
    const sanitized = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = desensitize(key, value)
    }
    logger.info(sanitized, ...args)
  } else {
    logger.info(obj, ...args)
  }
}

module.exports = {
  logger,
  safeLog,
  createRequestLogger,
  desensitize,
}
