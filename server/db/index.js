/**
 * Database Layer - 统一入口
 *
 * 使用方式：
 *   const db = require('./db')
 *   db.users.getUserByEmail('test@example.com')
 *
 * 迁移 PG 时只需替换 store-sqlite.js 为 store-pg.js
 */

const { store, initDatabase, getDb } = require('./store-sqlite')
const UserRepository = require('./user-repository')
const AgentRepository = require('./agent-repository')
const OrderRepository = require('./order-repository')
const AdminRepository = require('./admin-repository')
const CodeRepository = require('./code-repository')
const TokenUsageRepository = require('./token-usage-repository')

const users = new UserRepository(store)
const agents = new AgentRepository(store)
const orders = new OrderRepository(store)
const admin = new AdminRepository(store)
const codes = new CodeRepository(store)
const tokenUsage = new TokenUsageRepository(store)

// 向后兼容：保留旧 users.js 的 Database 静态方法接口
// 旧代码 require('./db/users') 仍可正常工作
const formatUserResponse = UserRepository.formatResponse

module.exports = {
  // 初始化
  initDatabase,
  getDb,

  // Repository 实例（新代码使用这些）
  users,
  agents,
  orders,
  admin,
  codes,
  tokenUsage,

  // ===== 向后兼容层 =====
  // 旧代码 require('./db/users') 返回的对象有以下方法
  // 直接代理到对应 Repository

  // 用户
  createUser: (data) => users.createUser(data),
  getUserByEmail: (email) => users.getUserByEmail(email),
  getUserById: (id) => users.getUserById(id),
  getUserByInviteCode: (code) => users.getUserByInviteCode(code),
  updateInviteProgress: (userId, progress) => users.updateInviteProgress(userId, progress),
  markRefunded: (userId) => users.markRefunded(userId),
  getAllUsers: (limit, offset) => users.getAllUsers(limit, offset),

  // 验证码
  createEmailCode: (email, code, expiresAt) => codes.createEmailCode(email, code, expiresAt),
  verifyEmailCode: (email, code) => codes.verifyEmailCode(email, code),

  // Agent
  createAgent: (data) => agents.createAgent(data),
  getAgentsByUserId: (userId) => agents.getAgentsByUserId(userId),
  getAgentById: (id) => agents.getAgentById(id),
  getAgentByIdForUser: (agentId, userId) => agents.getAgentByIdForUser(agentId, userId),
  deleteAgent: (agentId, userId) => agents.deleteAgent(agentId, userId),

  // 聊天
  saveChatMessage: (agentId, userId, role, content) => agents.saveChatMessage(agentId, userId, role, content),
  getChatMessages: (agentId, userId, limit) => agents.getChatMessages(agentId, userId, limit),

  // 订单
  createOrder: (data) => orders.createOrder(data),
  updateOrderStatus: (orderId, status, payTime) => orders.updateOrderStatus(orderId, status, payTime),
  getOrderByTradeNo: (tradeNo) => orders.getOrderByTradeNo(tradeNo),
  getOrdersByUserId: (userId) => orders.getOrdersByUserId(userId),
  getAllOrdersWithUser: (limit) => orders.getAllOrdersWithUser(limit),

  // 管理后台
  getFullStats: () => admin.getFullStats(),
  getRecentTickets: (limit) => admin.getRecentTickets(limit),
  updateTicketStatus: (ticketId, status) => admin.updateTicketStatus(ticketId, status),
  getRecentKnowledge: (limit) => admin.getRecentKnowledge(limit),
  addKnowledge: (industry, keyword, content, source) => admin.addKnowledge(industry, keyword, content, source),

  // 工具函数
  formatUserResponse,
}
