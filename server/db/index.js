/**
 * Database Layer - 统一入口
 *
 * 使用方式：
 *   const db = require('./db')
 *   db.users.getUserByEmail('test@example.com')
 *
 * 迁移 PG 时只需替换 store-sqlite.js 为 store-pg.js
 */

const storeSqlite = require('./store-sqlite')
const initDatabase = storeSqlite.initDatabase
const getDb = storeSqlite.getDb
const UserRepository = require('./user-repository')
const AgentRepository = require('./agent-repository')
const OrderRepository = require('./order-repository')
const AdminRepository = require('./admin-repository')
const CodeRepository = require('./code-repository')
const TokenUsageRepository = require('./token-usage-repository')
const TeamRepository = require('./team-repository')
const TeamMemberRepository = require('./team-member-repository')
const LeaveRepository = require('./leave-repository')
const BusinessRulesRepository = require('./business-rules-repository')
const ScheduleRepository = require('./schedule-repository')
const AuditRepository = require('./audit-repository')
const InquirySessionRepository = require('./inquiry-session-repository')
const { ReportRepository } = require('./report-repository')

const users = new UserRepository(storeSqlite.store)
const agents = new AgentRepository(storeSqlite.store)
const orders = new OrderRepository(storeSqlite.store)
const admin = new AdminRepository(storeSqlite.store)
const codes = new CodeRepository(storeSqlite.store)
const tokenUsage = new TokenUsageRepository(storeSqlite.store)
const teams = new TeamRepository(storeSqlite.store)
const teamMembers = new TeamMemberRepository(storeSqlite.store)
const leave = new LeaveRepository(storeSqlite.store)
const businessRules = new BusinessRulesRepository(storeSqlite.store)
const schedules = new ScheduleRepository(storeSqlite.store)
const audit = new AuditRepository(storeSqlite.store)
const inquirySessions = new InquirySessionRepository(storeSqlite.store)
const reports = new ReportRepository(storeSqlite.store)

// 向后兼容：保留旧 users.js 的 Database 静态方法接口
// 旧代码 require('./db/users') 仍可正常工作
const formatUserResponse = UserRepository.formatResponse

module.exports = {
  // 初始化
  initDatabase,
  getDb,

  // 存储适配器（直接访问 sql.js）
  store: storeSqlite.store,

  // Repository 实例（新代码使用这些）
  users,
  agents,
  orders,
  admin,
  codes,
  tokenUsage,
  reports,
  inquirySessions,

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
  saveFeedback: (agentId, userId, messageContent, feedbackType) => agents.saveFeedback(agentId, userId, messageContent, feedbackType),

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

  // 团队操作 (Team Ops)
  teams,
  teamMembers,
  leave,
  businessRules,
  schedules,
  audit,

  // 帮你赚钱 - Inquiry Session
  inquirySessions,

  // 工具函数
  formatUserResponse,
}
