/**
 * Prisma Client 初始化
 * 使用方式:
 *   const { prisma } = require('../lib/prisma')
 *   await prisma.user.findMany()
 */

const { PrismaClient } = require('@prisma/client')

const globalForPrisma = globalThis // 用于 dev server 热重载避免重复创建 client

let prisma

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: [{ emit: 'event', level: 'warn' }],
  })
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    })
  }
  prisma = globalForPrisma.prisma
}

module.exports = { prisma }
