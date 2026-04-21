/**
 * Inquiry Engine - 追问引擎核心
 * 管理7维度追问流程，判断触发时机
 */

const db = require('./db')

// 7个维度定义（按固定顺序追问）
const DIMENSIONS = [
  { id: 'location', label_zh: '位置/流量', label_en: 'Location/Traffic', required: true },
  { id: 'scale', label_zh: '规模', label_en: 'Scale', required: true },
  { id: 'financial', label_zh: '财务', label_en: 'Financial', required: true },
  { id: 'competition', label_zh: '竞争', label_en: 'Competition', required: true },
  { id: 'pain_point', label_zh: '痛点', label_en: 'Pain Point', required: true },
  { id: 'resource', label_zh: '资源', label_en: 'Resource', required: false },
  { id: 'experience', label_zh: '经验', label_en: 'Experience', required: false },
]

// 5个必选维度
const REQUIRED_DIMENSIONS = DIMENSIONS.filter(d => d.required).map(d => d.id)

// 维度对应的初始问题（中文）
const QUESTIONS_ZH = {
  location: {
    default: '你的店开在什么地方？周围人流量怎么样？',
    withContext: (ctx) => `你说的"${ctx.location}"，具体是在街道哪个位置？靠近地铁口还是社区入口？`,
  },
  scale: {
    default: '你的店大概多大？有多少个座位？',
    withContext: (ctx) => `你提到店面在${ctx.location || '那里'}，大概多少平方米？`,
  },
  financial: {
    default: '每个月能赚多少钱？成本大概多少？',
    withContext: (ctx) => `你提到规模是${ctx.scale || '那样'}，目前月收入大概什么水平？`,
  },
  competition: {
    default: '你周围有多少同行？他们的生意怎么样？',
    withContext: (ctx) => `你提到${ctx.location || '那个位置'}周边有竞争，现在情况如何？`,
  },
  pain_point: {
    default: '现在最让你头疼的问题是什么？',
    withContext: (ctx) => `综合你目前的情况（${ctx.location || '位置'}${ctx.scale ? '、' + ctx.scale : ''}），你觉得最需要解决的是什么？`,
  },
  resource: {
    default: '你现在有哪些资源可以利用？比如人力、资金、渠道等',
    withContext: (ctx) => `你目前的资源配置情况如何？`,
  },
  experience: {
    default: '你之前有做过类似的生意吗？有哪些经验？',
    withContext: (ctx) => `你的过往经验对你现在有哪些帮助？`,
  },
}

// 维度对应的初始问题（英文）
const QUESTIONS_EN = {
  location: {
    default: 'Where is your store located? How is the foot traffic around there?',
    withContext: (ctx) => `You mentioned "${ctx.location}". Where exactly on the street? Near a subway entrance or community entrance?`,
  },
  scale: {
    default: 'How large is your store? How many seats do you have?',
    withContext: (ctx) => `You mentioned the store is at ${ctx.location || 'that location'}, roughly how many square meters?`,
  },
  financial: {
    default: 'How much revenue do you make each month? What are your costs?',
    withContext: (ctx) => `You mentioned the scale is ${ctx.scale || 'that'}, roughly what is your monthly income?`,
  },
  competition: {
    default: 'How many competitors are around you? How are they doing?',
    withContext: (ctx) => `You mentioned ${ctx.location || 'that location'} has competition, how is the situation now?`,
  },
  pain_point: {
    default: 'What is your biggest headache right now?',
    withContext: (ctx) => `Based on your current situation (${ctx.location || 'location'}${ctx.scale ? ', ' + ctx.scale : ''}), what do you most need to solve?`,
  },
  resource: {
    default: 'What resources can you leverage? Such as manpower, capital, channels, etc.',
    withContext: (ctx) => `How is your current resource allocation?`,
  },
  experience: {
    default: 'Have you done anything similar before? What experience do you have?',
    withContext: (ctx) => `How has your past experience helped you now?`,
  },
}

// Q3: 模糊回答的追问提示词（优化版 - 更自然、更具体）
const CLARIFICATION_PROMPTS = {
  zh: {
    vague: [
      '可以举个例子说明吗？比如具体的场景或情况？',
      '能再详细一点吗？比如什么时候、在哪里、什么情况？',
      '我有点不太明白，能具体描述一下吗？',
      '方便的话，能说说具体情况吗？',
      '能举个例子吗？这样我能更好地帮你分析。',
    ],
    generic: [
      '您指的是哪方面呢？',
      '能具体说说是哪个部分吗？',
      '方便详细描述一下吗？',
      '可以更具体一点吗？',
      '我需要了解更多细节才能帮你分析。',
    ],
    // Q3: 每个维度的专属追问
    dimensionSpecific: {
      location: [
        '具体在街道的哪个位置？靠近地铁口、学校还是社区入口？',
        '人流量大概是什么样的？上下班高峰期还是全天都不错？',
      ],
      scale: [
        '店面大概有多大？有多少个座位或工作区？',
        '目前的人员规模是怎样的？有多少员工？',
      ],
      financial: [
        '能说说具体的数字吗？比如每月收入大概多少？',
        '成本主要包括哪些方面？大概占比是多少？',
      ],
      competition: [
        '这些同行大概是什么类型的？规模相当还是比您大？',
        '他们的生意大概是什么样的？排队还是冷冷清清？',
      ],
      pain_point: [
        '这个问题大概是什么时候开始的？严重程度如何？',
        '给您带来了哪些具体的影响？',
      ],
      resource: [
        '这些资源目前的使用情况如何？有没有闲置的？',
        '能说说人力的具体情况吗？有多少人在帮忙？',
      ],
      experience: [
        '之前做的时候，遇到过什么困难吗？',
        '这些经验对现在的生意有哪些帮助或启发？',
      ],
    },
  },
  en: {
    vague: [
      'Could you give me a specific example? Like a particular scene or situation?',
      'Could you be more specific? For example, when, where, or under what circumstances?',
      "I'm not quite sure I understand. Could you describe it in more detail?",
      'Would you mind sharing more specific details?',
      'Could you give an example? That way I can help you better.',
    ],
    generic: [
      'Which aspect are you referring to?',
      'Could you be more specific about which part?',
      'Would you mind elaborating?',
      'Could you be more concrete?',
      'I need more details to help you analyze.',
    ],
    // Q3: Dimension-specific prompts
    dimensionSpecific: {
      location: [
        'Where exactly on the street? Near a subway entrance, school, or community entrance?',
        'What is the foot traffic like? Rush hour or all day?',
      ],
      scale: [
        'How large is the store? How many seats or workstations?',
        'What is the current team size? How many employees?',
      ],
      financial: [
        'Can you share specific numbers? Like roughly how much revenue per month?',
        'What are the main costs? Roughly what percentage?',
      ],
      competition: [
        'What type of competitors are they? Similar size or larger than yours?',
        'How are their businesses doing? Long lines or quiet?',
      ],
      pain_point: [
        'When did this problem start? How severe is it?',
        'What specific impacts has it had on you?',
      ],
      resource: [
        'How are these resources currently being used? Any idle ones?',
        'Can you share the manpower situation? How many people are helping?',
      ],
      experience: [
        'When you did this before, what difficulties did you encounter?',
        'How have these experiences helped or inspired your current business?',
      ],
    },
  },
}

/**
 * 选择下一个追问维度
 * @param {string[]} covered - 已覆盖的维度ID列表
 * @param {number} round - 当前轮次
 * @returns {string|null} 下一个维度ID，如果已覆盖5个必选维度则返回null
 */
function selectNextDimension(covered, round) {
  // 如果5个必选维度都覆盖了，不再继续追问
  const allRequiredCovered = REQUIRED_DIMENSIONS.every(dim => covered.includes(dim))
  if (allRequiredCovered) {
    return null
  }

  // 按顺序找第一个未覆盖的维度
  for (const dim of DIMENSIONS) {
    if (!covered.includes(dim.id)) {
      return dim.id
    }
  }

  return null // 不应该走到这里
}

/**
 * 获取维度标签
 * @param {string} dimensionId
 * @param {string} lang - 'zh' | 'en'
 */
function getDimensionLabel(dimensionId, lang) {
  const dim = DIMENSIONS.find(d => d.id === dimensionId)
  if (!dim) return dimensionId
  return lang === 'en' ? dim.label_en : dim.label_zh
}

/**
 * 生成追问问题
 * @param {string} dimension - 维度ID
 * @param {object} context - 已收集的上下文 { dimensionId: answer }
 * @param {string} lang - 'zh' | 'en'
 * @returns {string} 生成的问题
 */
function generateQuestion(dimension, context, lang = 'zh') {
  const questions = lang === 'en' ? QUESTIONS_EN : QUESTIONS_ZH
  const dimConfig = questions[dimension]

  if (!dimConfig) {
    return lang === 'zh' ? '能详细说说吗？' : 'Can you tell me more?'
  }

  // 如果有上下文，用 withContext 追问具体化
  if (context && Object.keys(context).length > 0) {
    return dimConfig.withContext(context)
  }

  return dimConfig.default
}

/**
 * 解析用户回答
 * @param {string} answer - 用户输入
 * @param {string} lang - 'zh' | 'en'
 * @param {string} dimension - 当前维度（可选）
 * @returns {object} { skipped: boolean, answer: string, clarified: boolean }
 */
function parseAnswer(answer, lang = 'zh', dimension = null) {
  if (typeof answer !== 'string') {
    return { skipped: false, answer: '', clarified: false }
  }

  const trimmed = answer.trim()

  // "不知道"、"说不上来"、空白 → 跳过
  const skipPatterns = ['不知道', '说不上来', '没什么', '没想好', '没考虑过', 'not sure', "don't know", 'unsure']
  if (trimmed === '' || skipPatterns.includes(trimmed.toLowerCase())) {
    return { skipped: true, answer: trimmed, clarified: false }
  }

  // 检查是否是模糊回答
  const vaguePatterns = {
    zh: ['还行', '差不多', '一般', '还好', '普通', '正常', '一般般', '都差不多'],
    en: ['okay', 'ok', 'so-so', 'average', 'normal', 'fine', 'not bad', 'its okay'],
  }

  const patterns = vaguePatterns[lang] || vaguePatterns.zh
  const isVague = patterns.some(p => trimmed.toLowerCase().includes(p.toLowerCase()))

  if (isVague) {
    // Q3: 使用维度专属的追问提示
    return { skipped: false, answer: trimmed, clarified: true, clarification: getClarificationPrompt(lang, 'vague', dimension) }
  }

  return { skipped: false, answer: trimmed, clarified: false }
}

/**
 * 获取追问提示
 * @param {string} lang
 * @param {string} type - 'vague' | 'generic'
 * @param {string} dimension - 当前维度（可选）
 */
function getClarificationPrompt(lang, type = 'vague', dimension = null) {
  const prompts = CLARIFICATION_PROMPTS[lang] || CLARIFICATION_PROMPTS.zh

  // Q3: 如果有维度专属提示，优先使用
  if (dimension && prompts.dimensionSpecific && prompts.dimensionSpecific[dimension]) {
    const dimPrompts = prompts.dimensionSpecific[dimension]
    return dimPrompts[Math.floor(Math.random() * dimPrompts.length)]
  }

  const list = prompts[type] || prompts.vague
  return list[Math.floor(Math.random() * list.length)]
}

/**
 * 检查是否触发了报告生成
 * @param {object} coverage - { covered: string[], skipped: string[], total: number }
 * @param {number} round - 当前轮次
 * @returns {object} { trigger: boolean, reason: string }
 */
function checkTrigger(coverage, round) {
  // 5个必选维度全覆盖
  const allRequiredCovered = REQUIRED_DIMENSIONS.every(dim => coverage.covered.includes(dim))
  if (allRequiredCovered) {
    return { trigger: true, reason: 'dimensions_covered' }
  }

  // 15轮上限
  if (round >= 15) {
    return { trigger: true, reason: 'round_limit' }
  }

  return { trigger: false, reason: 'not_ready' }
}

/**
 * 判断用户输入是否包含语音/图片（检查 URL 或特殊格式）
 * @param {string} input
 * @returns {boolean}
 */
function containsMedia(input) {
  if (!input || typeof input !== 'string') return false

  // 检查是否是URL（图片、语音等）
  const urlPattern = /(https?:\/\/[^\s]+|\/static\/[^\s]+|data:[^;]+;base64)/i
  if (urlPattern.test(input)) return true

  // 检查是否是媒体格式标记
  const mediaPatterns = [
    /\[图片\]/i,
    /\[语音\]/i,
    /\[视频\]/i,
    /<img/i,
    /<audio/i,
    /<video/i,
    /data:image/i,
    /data:audio/i,
  ]

  return mediaPatterns.some(p => p.test(input))
}

/**
 * 处理用户回答
 * @param {number} sessionId - session ID
 * @param {string} dimension - 维度ID
 * @param {string} answer - 用户回答
 * @param {string} lang - 'zh' | 'en'
 * @returns {object} 处理结果
 */
function processAnswer(sessionId, dimension, answer, lang = 'zh') {
  // 检查是否包含媒体
  if (containsMedia(answer)) {
    return {
      type: 'media_rejected',
      message: lang === 'zh'
        ? '请用文字描述，我会更好地帮助你'
        : 'Please describe in text, I can help you better this way',
    }
  }

  // 解析回答（Q3: 传入维度以获取专属追问提示）
  const parsed = parseAnswer(answer, lang, dimension)

  if (parsed.clarified) {
    // 模糊回答，需要追问具体化
    return {
      type: 'clarification',
      dimension,
      message: parsed.clarification,
    }
  }

  // 记录回答
  db.inquirySessions.recordAnswer(sessionId, dimension, parsed.answer, parsed.skipped)

  // 检查触发条件
  const coverage = db.inquirySessions.getCoverage(sessionId)
  const session = db.inquirySessions.getById(sessionId)
  const trigger = checkTrigger(coverage, session.round_count)

  if (trigger.trigger) {
    // 更新状态为 waiting_payment
    db.inquirySessions.updateStatus(sessionId, 'waiting_payment')
    return {
      type: 'triggered',
      reason: trigger.reason,
      coverage,
    }
  }

  // 返回下一题
  const nextDimension = selectNextDimension(coverage.covered, session.round_count)

  if (!nextDimension) {
    // 所有维度都覆盖了，但没满足触发条件（不应该发生）
    return {
      type: 'error',
      message: lang === 'zh' ? '数据异常' : 'Data error',
    }
  }

  // 生成下一题
  // 构建上下文（已收集的所有回答）
  // dimension_answers 已是数组（jsonFields 自动解析）
  const context = {}
  const answers = session.dimension_answers || []
  for (const ans of answers) {
    context[ans.dimension] = ans.answer
  }

  const nextQuestion = generateQuestion(nextDimension, context, lang)

  return {
    type: 'next_question',
    dimension: nextDimension,
    question: nextQuestion,
    coverage,
    skipped: parsed.skipped,
  }
}

/**
 * 获取当前追问状态
 * @param {number} sessionId
 * @param {string} lang
 * @returns {object}
 */
function getInquiryState(sessionId, lang = 'zh') {
  const session = db.inquirySessions.getById(sessionId)
  if (!session) return null

  const coverage = db.inquirySessions.getCoverage(sessionId)

  // 获取当前应该问的维度
  const currentDimension = selectNextDimension(coverage.covered, session.round_count)

  // 生成当前问题
  let question = null
  if (currentDimension) {
    const context = {}
    // dimension_answers 已是数组（jsonFields 自动解析）
    const answers = session.dimension_answers || []
    for (const ans of answers) {
      context[ans.dimension] = ans.answer
    }
    question = generateQuestion(currentDimension, context, lang)
  }

  return {
    sessionId,
    status: session.status,
    lang: session.lang,
    round: session.round_count,
    coverage,
    currentDimension,
    question,
    triggerReady: coverage.covered.length >= 5 || session.round_count >= 15,
  }
}

module.exports = {
  DIMENSIONS,
  REQUIRED_DIMENSIONS,
  selectNextDimension,
  generateQuestion,
  parseAnswer,
  checkTrigger,
  containsMedia,
  processAnswer,
  getInquiryState,
  getDimensionLabel,
}