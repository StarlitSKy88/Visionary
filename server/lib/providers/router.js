/**
 * AI Provider Router - 供应商路由器
 * 按任务类型智能选择供应商和模型
 * 参考 GSD-2 的 GSDModelConfig 按任务类型选模型
 */

const { OpenRouterProvider, MODELS: OR_MODELS } = require('./openrouter-provider')
const { AnthropicProvider, MODELS: ANTHROPIC_MODELS } = require('./anthropic-provider')
const { DeepSeekProvider, MODELS: DEEPSEEK_MODELS } = require('./deepseek-provider')

// 按任务类型的模型路由策略
const TASK_ROUTES = {
  // 需求理解 - 需要强推理能力
  'understand-demand': {
    provider: 'anthropic',
    model: ANTHROPIC_MODELS.sonnet,
    fallback: { provider: 'openrouter', model: OR_MODELS.nemotron },
    temperature: 0.3,
    maxTokens: 1500,
  },
  // 行业情报 - 需要广泛知识
  'gather-intel': {
    provider: 'openrouter',
    model: OR_MODELS.nemotron,
    fallback: { provider: 'deepseek', model: DEEPSEEK_MODELS.chat },
    temperature: 0.5,
    maxTokens: 1500,
  },
  // 根因分析 - 需要深度推理
  'root-cause': {
    provider: 'anthropic',
    model: ANTHROPIC_MODELS.sonnet,
    fallback: { provider: 'deepseek', model: DEEPSEEK_MODELS.reasoner },
    temperature: 0.3,
    maxTokens: 1500,
  },
  // 方案设计 - 需要创造力 + 推理
  'design-solution': {
    provider: 'anthropic',
    model: ANTHROPIC_MODELS.sonnet,
    fallback: { provider: 'openrouter', model: OR_MODELS.nemotron },
    temperature: 0.5,
    maxTokens: 2000,
  },
  // 辩论优化 - 需要批判性思维
  'debate-optimize': {
    provider: 'anthropic',
    model: ANTHROPIC_MODELS.sonnet,
    fallback: { provider: 'deepseek', model: DEEPSEEK_MODELS.chat },
    temperature: 0.4,
    maxTokens: 1500,
  },
  // 评分 - 需要精准评估
  'evaluate-score': {
    provider: 'anthropic',
    model: ANTHROPIC_MODELS.sonnet,
    fallback: { provider: 'openrouter', model: OR_MODELS.nemotron },
    temperature: 0.2,
    maxTokens: 800,
  },
  // 聊天 - 快速响应
  'chat': {
    provider: 'openrouter',
    model: OR_MODELS.gemini,
    fallback: { provider: 'deepseek', model: DEEPSEEK_MODELS.chat },
    temperature: 0.7,
    maxTokens: 1000,
  },
  // 默认
  'default': {
    provider: 'openrouter',
    model: OR_MODELS.nemotron,
    fallback: { provider: 'openrouter', model: OR_MODELS.gemini },
    temperature: 0.7,
    maxTokens: 2000,
  },
}

class ProviderRouter {
  constructor() {
    this.providers = {}
    this._initProviders()
  }

  _initProviders() {
    // 始终初始化 OpenRouter（免费，必有）
    this.providers.openrouter = new OpenRouterProvider({})

    // 如果配置了 Anthropic Key 则启用
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.anthropic = new AnthropicProvider({})
      console.log('✅ Anthropic provider 已启用')
    }

    // 如果配置了 DeepSeek Key 则启用
    if (process.env.DEEPSEEK_API_KEY) {
      this.providers.deepseek = new DeepSeekProvider({})
      console.log('✅ DeepSeek provider 已启用')
    }
  }

  /**
   * 根据任务类型路由到最佳供应商
   * @param {string} taskType - 任务类型
   * @returns {{provider: BaseProvider, model: string, temperature: number, maxTokens: number}}
   */
  resolveRoute(taskType) {
    const route = TASK_ROUTES[taskType] || TASK_ROUTES['default']

    // 首选供应商可用？
    const primary = this.providers[route.provider]
    if (primary && primary.isConfigured) {
      return {
        provider: primary,
        model: route.model,
        temperature: route.temperature,
        maxTokens: route.maxTokens,
        fallback: route.fallback,
      }
    }

    // 降级到备选供应商
    const fallback = this.providers[route.fallback?.provider]
    if (fallback && fallback.isConfigured) {
      return {
        provider: fallback,
        model: route.fallback.model,
        temperature: route.temperature,
        maxTokens: route.maxTokens,
      }
    }

    // 最终降级到 OpenRouter（始终可用）
    return {
      provider: this.providers.openrouter,
      model: OR_MODELS.nemotron,
      temperature: route.temperature,
      maxTokens: route.maxTokens,
    }
  }

  /**
   * 统一聊天接口 - 自动路由
   */
  async chat(messages, options = {}) {
    const { taskType = 'default', ...restOptions } = options
    const route = this.resolveRoute(taskType)

    try {
      const result = await route.provider.chat(messages, {
        model: route.model,
        temperature: route.temperature,
        maxTokens: route.maxTokens,
        ...restOptions,
      })
      return result
    } catch (error) {
      // 首选失败，尝试备选
      if (route.fallback) {
        const fallbackProvider = this.providers[route.fallback.provider]
        if (fallbackProvider && fallbackProvider.isConfigured) {
          console.warn(`⚠️ ${route.provider.id} 失败，降级到 ${route.fallback.provider}:`, error.message)
          return fallbackProvider.chat(messages, {
            model: route.fallback.model,
            temperature: route.temperature,
            maxTokens: route.maxTokens,
            ...restOptions,
          })
        }
      }
      throw error
    }
  }

  /**
   * 获取所有可用供应商
   */
  getAvailableProviders() {
    return Object.values(this.providers)
      .filter(p => p.isConfigured)
      .map(p => ({ id: p.id, name: p.name, models: p.getModels() }))
  }
}

// 单例
const router = new ProviderRouter()
module.exports = router
