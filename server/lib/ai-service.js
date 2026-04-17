/**
 * AI 服务模块 - 基于 Provider Router 的统一入口
 * 保持向后兼容的 API，内部使用多供应商路由
 */

const router = require('./providers/router')
const { safeLog } = require('./logger')

// ===== 向后兼容：保留原有的 chat / chatJSON 接口 =====

/**
 * 调用 AI（自动路由到最佳供应商）
 * 返回纯内容字符串（向后兼容）
 */
async function chat(messages, options = {}) {
  const result = await router.chat(messages, options)
  return result.content
}

/**
 * 调用 AI 并返回完整结果（包含 usage）
 * 用于需要统计 token 用量的场景
 */
async function chatWithUsage(messages, options = {}) {
  const result = await router.chat(messages, options)
  return {
    content: result.content,
    usage: result.usage || { inputTokens: 0, outputTokens: 0 },
    model: result.model,
    latency: result.latency,
    provider: result.provider,
  }
}

/**
 * 结构化输出（带 JSON 格式要求）
 */
async function chatJSON(messages, schema, options = {}) {
  const systemPrompt = `你是一个专业的业务分析师。请严格按照以下JSON Schema输出结果，不要包含任何其他文字：

${JSON.stringify(schema, null, 2)}

重要：只输出JSON，不要有任何前缀或后缀文字。`

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const response = await chat(fullMessages, { ...options, temperature: 0.3 })

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
    return JSON.parse(response)
  } catch (e) {
    safeLog({ type: 'ai_json_parse_error', response }, '❌ JSON解析失败')
    throw new Error('AI返回格式错误')
  }
}

// ===== Agent 专用方法（使用任务路由）=====

async function understandDemand(input) {
  const schema = {
    type: 'object',
    properties: {
      industry: { type: 'string', description: '识别的行业类型' },
      keywords: { type: 'array', items: { type: 'string' } },
      painPoints: { type: 'array', items: { type: 'string' } },
      businessType: { type: 'string' },
      scale: { type: 'string' },
    },
    required: ['industry', 'keywords', 'painPoints'],
  }

  return chatJSON(
    [{ role: 'user', content: `分析以下口语化的经营需求描述，提取关键信息：\n\n"${input}"\n\n请识别：1) 所属行业 2) 核心关键词 3) 主要痛点 4) 业务类型 5) 企业规模` }],
    schema,
    { taskType: 'understand-demand' }
  )
}

async function gatherIndustryIntel(industry, painPoints) {
  const schema = {
    type: 'object',
    properties: {
      trends: { type: 'string' },
      avgMargin: { type: 'string' },
      peakHours: { type: 'string' },
      commonProblems: { type: 'array', items: { type: 'string' } },
      bestPractices: { type: 'array', items: { type: 'string' } },
    },
    required: ['trends', 'commonProblems', 'bestPractices'],
  }

  return chatJSON(
    [{ role: 'user', content: `作为${industry}行业专家，分析以下痛点的行业背景：\n\n痛点：${painPoints.join('、')}\n\n请提供：1) 行业趋势 2) 平均利润率 3) 高峰时段 4) 常见问题 5) 最佳实践` }],
    schema,
    { taskType: 'gather-intel' }
  )
}

async function analyzeRootCause(painPoints, industryIntel) {
  const schema = {
    type: 'object',
    properties: {
      surfaceProblem: { type: 'string' },
      level1: { type: 'string' }, level2: { type: 'string' }, level3: { type: 'string' },
      rootCause: { type: 'string' },
      realNeeds: { type: 'array', items: { type: 'string' } },
    },
    required: ['rootCause', 'realNeeds'],
  }

  return chatJSON(
    [{ role: 'user', content: `使用5Why分析法挖掘以下痛点的根本原因：\n\n痛点：${JSON.stringify(painPoints)}\n行业背景：${JSON.stringify(industryIntel)}\n\n请进行5层深度分析，找出根本原因和用户真正需要什么（3-5个具体需求）` }],
    schema,
    { taskType: 'root-cause' }
  )
}

async function designSolution(industry, rootCause, realNeeds) {
  const schema = {
    type: 'object',
    properties: {
      agentName: { type: 'string' }, description: { type: 'string' },
      skills: { type: 'array', items: { type: 'string' } },
      constraints: { type: 'array', items: { type: 'string' } },
      roles: { type: 'array', items: { type: 'string' } },
      workflow: { type: 'array', items: { type: 'string' } },
    },
    required: ['agentName', 'description', 'skills', 'constraints'],
  }

  return chatJSON(
    [{ role: 'user', content: `为${industry}行业设计一个AI Agent方案：\n\n根本原因：${rootCause}\n用户真实需求：${realNeeds.join('、')}\n\n请设计：1) Agent名称 2) 功能描述 3) 核心技能(4-6个) 4) 业务约束(3-5个) 5) 可担任角色 6) 标准工作流程` }],
    schema,
    { taskType: 'design-solution' }
  )
}

async function debateOptimize(solution, industryIntel) {
  const schema = {
    type: 'object',
    properties: {
      critiques: { type: 'array', items: { type: 'object', properties: { point: { type: 'string' }, severity: { type: 'string' } } } },
      improvements: { type: 'array', items: { type: 'string' } },
      optimizedSkills: { type: 'array', items: { type: 'string' } },
      riskControls: { type: 'array', items: { type: 'string' } },
    },
    required: ['critiques', 'improvements', 'riskControls'],
  }

  return chatJSON(
    [{ role: 'user', content: `作为严格的质量评审官，对以下Agent方案进行批判性评审：\n\n方案：${JSON.stringify(solution)}\n行业背景：${JSON.stringify(industryIntel)}\n\n请：1) 指出3-5个潜在问题(标注严重程度) 2) 改进建议 3) 风险控制措施 4) 优化后技能列表` }],
    schema,
    { taskType: 'debate-optimize' }
  )
}

async function evaluateScore(solution, debates) {
  const schema = {
    type: 'object',
    properties: {
      demandMatch: { type: 'number' }, industryExpertise: { type: 'number' },
      feasibility: { type: 'number' }, simplicity: { type: 'number' },
      compliance: { type: 'number' }, surprise: { type: 'number' },
      totalScore: { type: 'number' }, passed: { type: 'boolean' },
      feedback: { type: 'string' },
    },
    required: ['demandMatch', 'industryExpertise', 'feasibility', 'simplicity', 'compliance', 'surprise', 'totalScore', 'passed'],
  }

  return chatJSON(
    [{ role: 'user', content: `对以下Agent方案进行专业评分(总分100分)：\n\n方案：${JSON.stringify(solution)}\n辩论优化结果：${JSON.stringify(debates)}\n\n评分标准：需求匹配度(0-25) + 行业专业性(0-20) + 落地可行性(0-20) + 简洁有效性(0-15) + 合规安全性(0-10) + 惊喜超越度(0-10)。95分及以上通过。` }],
    schema,
    { taskType: 'evaluate-score' }
  )
}

async function chatWithAgent(message, history, agentConfig) {
  const systemPrompt = agentConfig.systemPrompt || '你是一个专业的AI助手。'
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ]
  return chatWithUsage(messages, {
    taskType: 'chat',
    temperature: agentConfig.temperature || 0.7,
    maxTokens: agentConfig.maxTokens || 2000,
  })
}

/**
 * 简单补全接口（用于 ReAct Engine）
 * 直接传入单个提示词，返回内容
 */
async function complete(params) {
  const { messages, model, maxTokens } = params
  return chat(messages, { taskType: 'complete', model, maxTokens })
}

/**
 * 流式补全接口（用于 SSE）
 * 返回流式响应，通过回调函数处理每个 chunk
 */
async function completeStream(params) {
  const { messages, model, maxTokens, temperature = 0.7, onChunk, onComplete, onError } = params

  try {
    // 获取 API 配置
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY
    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://api.openai.com/v1'

    // 构建请求
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages,
        max_tokens: maxTokens || 2000,
        temperature,
        stream: true,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`API 请求失败: ${response.status} ${err}`)
    }

    // 处理流
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('无法获取响应流')
    }

    let fullContent = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const chunk = parsed.choices?.[0]?.delta?.content
            if (chunk) {
              fullContent += chunk
              if (onChunk) onChunk(chunk)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    if (onComplete) onComplete(fullContent)
    return fullContent
  } catch (error) {
    if (onError) onError(error)
    throw error
  }
}

module.exports = {
  chat, chatJSON, chatWithUsage,
  understandDemand, gatherIndustryIntel, analyzeRootCause,
  designSolution, debateOptimize, evaluateScore, chatWithAgent,
  complete, completeStream,
  getAvailableProviders: () => router.getAvailableProviders(),
}
