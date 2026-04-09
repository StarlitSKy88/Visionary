const express = require('express')
const router = express.Router()
const { AgentEngine } = require('../agents/engine')
const Database = require('../db')
const { authMiddleware, sanitizeInput, rateLimiter } = require('../lib/auth')

router.post('/create', authMiddleware, async (req, res) => {
  const { input } = req.body
  const userId = req.user.userId

  if (!input || typeof input !== 'string' || input.trim().length < 10) {
    return res.status(400).json({ success: false, error: '请详细描述您的经营痛点（至少10个字）' })
  }
  if (input.length > 2000) {
    return res.status(400).json({ success: false, error: '描述内容不能超过2000字' })
  }
  if (!rateLimiter.check(`agent:${userId}`, 2, 60 * 1000)) {
    return res.status(429).json({ success: false, error: '生成频率过高，请稍后再试' })
  }

  try {
    const engine = new AgentEngine()
    const result = await engine.generate(sanitizeInput(input), userId)

    const agent = Database.createAgent({
      userId, name: result.name, industry: result.industry,
      description: result.description, config: result.config || {},
      score: result.score, skills: result.skills, constraints: result.constraints,
    })

    res.json({ success: true, agent: { id: agent.id, ...result } })
  } catch (error) {
    console.error('Agent生成失败:', error)
    res.status(500).json({ success: false, error: '生成失败，请稍后重试' })
  }
})

router.get('/list', authMiddleware, (req, res) => {
  try {
    const agents = Database.getAgentsByUserId(req.user.userId)
    res.json({ success: true, agents })
  } catch (error) {
    console.error('获取Agent列表失败:', error)
    res.status(500).json({ success: false, error: '获取失败' })
  }
})

router.post('/regenerate/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { input } = req.body
  const userId = req.user.userId

  if (!input || input.trim().length < 10) {
    return res.status(400).json({ success: false, error: '请详细描述您的经营痛点' })
  }

  const agent = Database.getAgentByIdForUser(id, userId)
  if (!agent) {
    return res.status(403).json({ success: false, error: '无权操作此Agent' })
  }

  try {
    const engine = new AgentEngine()
    const result = await engine.generate(sanitizeInput(input), userId)
    res.json({ success: true, agent: result })
  } catch (error) {
    console.error('重新生成失败:', error)
    res.status(500).json({ success: false, error: '生成失败' })
  }
})

router.post('/:id/chat', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { message, history } = req.body
  const userId = req.user.userId

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ success: false, error: '消息不能为空' })
  }
  if (message.length > 5000) {
    return res.status(400).json({ success: false, error: '消息过长，请控制在5000字以内' })
  }
  if (!rateLimiter.check(`chat:${userId}`, 20, 60 * 1000)) {
    return res.status(429).json({ success: false, error: '消息发送过于频繁' })
  }

  const agent = Database.getAgentByIdForUser(id, userId)
  const systemPrompt = agent
    ? `你是"${agent.name}"，一个专门为${agent.industry || '企业'}设计的AI助手。
你的核心职责是：${agent.description || '帮助用户解决经营问题'}
你的核心技能：${Array.isArray(agent.skills) ? agent.skills.join('、') : ''}
业务约束：${Array.isArray(agent.constraints) ? agent.constraints.join('、') : ''}
请用简洁、专业的语言回答。`
    : '你是一个专业的AI助手，专门帮助小微企业解决经营问题。请用简洁、专业的语言回答。'

  try {
    const sanitizedMessage = sanitizeInput(message)
    const sanitizedHistory = Array.isArray(history)
      ? history.slice(-20).map(h => ({
          role: h.role === 'user' || h.role === 'assistant' ? h.role : 'user',
          content: sanitizeInput(String(h.content).substring(0, 2000)),
        }))
      : []

    const response = await AgentEngine.chat(sanitizedMessage, sanitizedHistory, {
      systemPrompt, temperature: 0.7, maxTokens: 1000,
    })

    Database.saveChatMessage(id, userId, 'user', sanitizedMessage)
    Database.saveChatMessage(id, userId, 'assistant', response)

    res.json({ success: true, response })
  } catch (error) {
    console.error('对话失败:', error)
    res.status(500).json({ success: false, error: '对话失败，请稍后重试' })
  }
})

router.get('/:id/messages', authMiddleware, (req, res) => {
  const { id } = req.params
  const userId = req.user.userId

  try {
    const messages = Database.getChatMessages(id, userId, parseInt(req.query.limit) || 50)
    res.json({ success: true, messages })
  } catch (error) {
    console.error('获取聊天历史失败:', error)
    res.status(500).json({ success: false, error: '获取失败' })
  }
})

router.get('/:id/export', authMiddleware, (req, res) => {
  const { id } = req.params
  const { format = 'json' } = req.query
  const userId = req.user.userId

  const agent = Database.getAgentByIdForUser(id, userId)
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent不存在' })
  }

  const agentConfig = {
    id: agent.id, name: agent.name, industry: agent.industry,
    description: agent.description, version: '1.0', createdAt: agent.created_at,
    config: {
      systemPrompt: `你是"${agent.name}"，${agent.description}`,
      skills: agent.skills || [],
      constraints: agent.constraints || [],
    },
    score: agent.score,
  }

  if (format === 'yaml') {
    const yaml = `id: ${agentConfig.id}
name: ${agentConfig.name}
industry: ${agentConfig.industry}
version: ${agentConfig.version}
createdAt: ${agentConfig.createdAt}
config:
  systemPrompt: ${agentConfig.config.systemPrompt}
  skills:
${(agentConfig.config.skills || []).map(s => `    - ${s}`).join('\n')}
  constraints:
${(agentConfig.config.constraints || []).map(c => `    - ${c}`).join('\n')}
score: ${agentConfig.score}
`
    res.setHeader('Content-Type', 'text/yaml')
    res.setHeader('Content-Disposition', `attachment; filename="agent-${id}.yaml"`)
    res.send(yaml)
  } else {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="agent-${id}.json"`)
    res.json(agentConfig)
  }
})

module.exports = router
