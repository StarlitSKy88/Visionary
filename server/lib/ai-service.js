/**
 * AI 服务模块 - OpenRouter 接入
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'

// 检查API Key是否配置（延迟检查，不阻塞启动）
let apiKeyChecked = false
function ensureApiKey() {
  if (!apiKeyChecked) {
    apiKeyChecked = true
    if (!OPENROUTER_API_KEY) {
      console.error('⚠️ OPENROUTER_API_KEY 未设置，AI功能将不可用')
    }
  }
  return !!OPENROUTER_API_KEY
}

// 可用模型列表
const MODELS = {
  // 主力模型 - 免费
  nemotron: 'nvidia/nemotron-3-super-120b-a12b:free',

  // 备选模型
  gemini: 'google/gemini-2.0-flash-exp:free',
  llama: 'meta-llama/llama-3.3-8b-instruct:free',
  deepseek: 'deepseek/deepseek-r1:free',
}

/**
 * 调用 AI 模型（带重试和降级）
 */
async function chat(messages, options = {}) {
  const {
    model = MODELS.nemotron,
    temperature = 0.7,
    maxTokens = 2000,
    retries = 2,
  } = options

  if (!ensureApiKey()) {
    throw new Error('AI服务未配置，请设置OPENROUTER_API_KEY')
  }

  const modelsToTry = [model]
  if (model !== MODELS.gemini) modelsToTry.push(MODELS.gemini)
  if (model !== MODELS.deepseek) modelsToTry.push(MODELS.deepseek)

  for (let attempt = 0; attempt <= retries; attempt++) {
    const currentModel = modelsToTry[Math.min(attempt, modelsToTry.length - 1)]

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
          'X-Title': 'AI Agent Generator',
        },
        body: JSON.stringify({
          model: currentModel,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`OpenRouter API Error (${currentModel}):`, response.status, errorText)

        if (response.status === 429) {
          // 速率限制，等一下再试
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
          continue
        }

        if (attempt < retries) continue
        throw new Error(`AI调用失败: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      if (attempt === retries) {
        console.error('AI Service Error (all retries exhausted):', error)
        throw error
      }
      console.warn(`AI调用失败，第${attempt + 1}次重试...`, error.message)
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
}

/**
 * 结构化输出（带JSON格式要求）
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
    // 尝试提取JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return JSON.parse(response)
  } catch (e) {
    console.error('JSON解析失败:', response)
    throw new Error('AI返回格式错误')
  }
}

/**
 * 需求理解Agent
 */
async function understandDemand(input) {
  const schema = {
    type: 'object',
    properties: {
      industry: { type: 'string', description: '识别的行业类型' },
      keywords: { type: 'array', items: { type: 'string' }, description: '提取的关键词' },
      painPoints: { type: 'array', items: { type: 'string' }, description: '识别的痛点' },
      businessType: { type: 'string', description: '业务类型（零售/服务/制造等）' },
      scale: { type: 'string', description: '推测的企业规模' },
    },
    required: ['industry', 'keywords', 'painPoints'],
  }

  return chatJSON([
    { role: 'user', content: `分析以下口语化的经营需求描述，提取关键信息：

"${input}"

请识别：1) 所属行业 2) 核心关键词 3) 主要痛点 4) 业务类型 5) 企业规模` },
  ], schema)
}

/**
 * 行业情报Agent
 */
async function gatherIndustryIntel(industry, painPoints) {
  const schema = {
    type: 'object',
    properties: {
      trends: { type: 'string', description: '行业趋势' },
      avgMargin: { type: 'string', description: '平均利润率' },
      peakHours: { type: 'string', description: '高峰时段' },
      commonProblems: { type: 'array', items: { type: 'string' }, description: '常见问题' },
      bestPractices: { type: 'array', items: { type: 'string' }, description: '最佳实践' },
    },
    required: ['trends', 'commonProblems', 'bestPractices'],
  }

  return chatJSON([
    { role: 'user', content: `作为${industry}行业专家，分析以下痛点的行业背景：

痛点：${painPoints.join('、')}

请提供：1) 行业趋势 2) 平均利润率 3) 高峰时段 4) 常见问题 5) 最佳实践` },
  ], schema)
}

/**
 * 根因分析Agent
 */
async function analyzeRootCause(painPoints, industryIntel) {
  const schema = {
    type: 'object',
    properties: {
      surfaceProblem: { type: 'string' },
      level1: { type: 'string' },
      level2: { type: 'string' },
      level3: { type: 'string' },
      rootCause: { type: 'string' },
      realNeeds: { type: 'array', items: { type: 'string' } },
    },
    required: ['rootCause', 'realNeeds'],
  }

  return chatJSON([
    { role: 'user', content: `使用5Why分析法挖掘以下痛点的根本原因：

痛点：${JSON.stringify(painPoints)}
行业背景：${JSON.stringify(industryIntel)}

请进行5层深度分析，找出：
1. 表面问题
2. 第1层原因
3. 第2层原因
4. 第3层原因
5. 根本原因
6. 用户真正需要什么（3-5个具体需求）` },
  ], schema)
}

/**
 * 方案架构Agent
 */
async function designSolution(industry, rootCause, realNeeds) {
  const schema = {
    type: 'object',
    properties: {
      agentName: { type: 'string', description: 'Agent名称' },
      description: { type: 'string', description: 'Agent描述' },
      skills: { type: 'array', items: { type: 'string' }, description: '核心技能' },
      constraints: { type: 'array', items: { type: 'string' }, description: '业务约束' },
      roles: { type: 'array', items: { type: 'string' }, description: '可担任的角色' },
      workflow: { type: 'array', items: { type: 'string' }, description: '工作流程' },
    },
    required: ['agentName', 'description', 'skills', 'constraints'],
  }

  return chatJSON([
    { role: 'user', content: `为${industry}行业设计一个AI Agent方案：

根本原因：${rootCause}
用户真实需求：${realNeeds.join('、')}

请设计：
1. Agent名称（简洁专业）
2. 功能描述
3. 核心技能（4-6个）
4. 业务约束（3-5个，如报价底线、操作确认等）
5. 可担任的角色
6. 标准工作流程` },
  ], schema)
}

/**
 * 辩论优化Agent
 */
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

  return chatJSON([
    { role: 'user', content: `作为严格的质量评审官，对以下Agent方案进行批判性评审：

方案：${JSON.stringify(solution)}
行业背景：${JSON.stringify(industryIntel)}

请：
1. 指出3-5个潜在问题或漏洞（标注严重程度：高/中/低）
2. 提出改进建议
3. 补充风险控制措施
4. 优化后的技能列表` },
  ], schema)
}

/**
 * 评分Agent
 */
async function evaluateScore(solution, debates) {
  const schema = {
    type: 'object',
    properties: {
      demandMatch: { type: 'number', description: '需求匹配度(0-25分)' },
      industryExpertise: { type: 'number', description: '行业专业性(0-20分)' },
      feasibility: { type: 'number', description: '落地可行性(0-20分)' },
      simplicity: { type: 'number', description: '简洁有效性(0-15分)' },
      compliance: { type: 'number', description: '合规安全性(0-10分)' },
      surprise: { type: 'number', description: '惊喜超越度(0-10分)' },
      totalScore: { type: 'number', description: '总分' },
      passed: { type: 'boolean', description: '是否通过(≥95分)' },
      feedback: { type: 'string', description: '评价反馈' },
    },
    required: ['demandMatch', 'industryExpertise', 'feasibility', 'simplicity', 'compliance', 'surprise', 'totalScore', 'passed'],
  }

  return chatJSON([
    { role: 'user', content: `对以下Agent方案进行专业评分（总分100分）：

方案：${JSON.stringify(solution)}
辩论优化结果：${JSON.stringify(debates)}

评分标准：
- 需求匹配度（0-25分）：是否准确解决用户痛点
- 行业专业性（0-20分）：是否符合行业规则
- 落地可行性（0-20分）：是否可直接使用
- 简洁有效性（0-15分）：是否简单易懂
- 合规安全性（0-10分）：是否有风险控制
- 惊喜超越度（0-10分）：是否超出预期

95分及以上通过。` },
  ], schema)
}

/**
 * 与Agent对话
 */
async function chatWithAgent(message, history, agentConfig) {
  const systemPrompt = agentConfig.systemPrompt || '你是一个专业的AI助手。'

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({
      role: h.role,
      content: h.content,
    })),
    { role: 'user', content: message },
  ]

  return chat(messages, {
    temperature: agentConfig.temperature || 0.7,
    maxTokens: agentConfig.maxTokens || 2000,
  })
}

module.exports = {
  chat,
  chatJSON,
  understandDemand,
  gatherIndustryIntel,
  analyzeRootCause,
  designSolution,
  debateOptimize,
  evaluateScore,
  chatWithAgent,
  MODELS,
}
