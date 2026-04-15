/**
 * AI Provider Router - 供应商路由器
 * 按任务类型智能选择供应商和模型
 * 参考 GSD-2 的 GSDModelConfig 按任务类型选模型
 */

const { OpenRouterProvider, MODELS: OR_MODELS } = require('./openrouter-provider')
const { AnthropicProvider, MODELS: ANTHROPIC_MODELS } = require('./anthropic-provider')
const { DeepSeekProvider, MODELS: DEEPSEEK_MODELS } = require('./deepseek-provider')
const { MiniMaxProvider, MODELS: MINIMAX_MODELS } = require('./minimax-provider')
const { safeLog } = require('../../lib/logger')

// 按任务类型的模型路由策略
const TASK_ROUTES = {
  // 需求理解 - 需要强推理能力
  'understand-demand': {
    provider: 'minimax',
    model: MINIMAX_MODELS['MiniMax-Text-01'],
    fallback: { provider: 'anthropic', model: ANTHROPIC_MODELS.sonnet },
    temperature: 0.3,
    maxTokens: 1500,
  },
  // 行业情报 - 需要广泛知识
  'gather-intel': {
    provider: 'minimax',
    model: MINIMAX_MODELS['MiniMax-Text-01'],
    fallback: { provider: 'openrouter', model: OR_MODELS.nemotron },
    temperature: 0.5,
    maxTokens: 1500,
  },
  // 根因分析 - 需要深度推理
  'root-cause': {
    provider: 'minimax',
    model: MINIMAX_MODELS['MiniMax-Text-01'],
    fallback: { provider: 'anthropic', model: ANTHROPIC_MODELS.sonnet },
    temperature: 0.3,
    maxTokens: 1500,
  },
  // 方案设计 - 需要创造力 + 推理
  'design-solution': {
    provider: 'minimax',
    model: MINIMAX_MODELS['MiniMax-Text-01'],
    fallback: { provider: 'anthropic', model: ANTHROPIC_MODELS.sonnet },
    temperature: 0.5,
    maxTokens: 2000,
  },
  // 辩论优化 - 需要批判性思维
  'debate-optimize': {
    provider: 'minimax',
    model: MINIMAX_MODELS['MiniMax-Text-01'],
    fallback: { provider: 'anthropic', model: ANTHROPIC_MODELS.sonnet },
    temperature: 0.4,
    maxTokens: 1500,
  },
  // 评分 - 需要精准评估
  'evaluate-score': {
    provider: 'minimax',
    model: MINIMAX_MODELS['MiniMax-Text-01'],
    fallback: { provider: 'anthropic', model: ANTHROPIC_MODELS.sonnet },
    temperature: 0.2,
    maxTokens: 800,
  },
  // 聊天 - 快速响应
  'chat': {
    provider: 'minimax',
    model: MINIMAX_MODELS['MiniMax-Text-01'],
    fallback: { provider: 'openrouter', model: OR_MODELS.gemini },
    temperature: 0.7,
    maxTokens: 1000,
  },
  // 完成补全
  'complete': {
    provider: 'minimax',
    model: MINIMAX_MODELS['MiniMax-Text-01'],
    fallback: { provider: 'openrouter', model: OR_MODELS.gemini },
    temperature: 0.7,
    maxTokens: 2000,
  },
  // 默认
  'default': {
    provider: 'minimax',
    model: MINIMAX_MODELS['MiniMax-Text-01'],
    fallback: { provider: 'openrouter', model: OR_MODELS.nemotron },
    temperature: 0.7,
    maxTokens: 2000,
  },
}

// 熔断器配置
const CB_MAX_FAILURES = 3       // 连续失败3次后触发熔断
const CB_COOLDOWN_MS = 5 * 60 * 1000  // 5分钟冷却期

class ProviderRouter {
  constructor() {
    this.providers = {}
    // 熔断器状态: { 'provider:model': { failures: number, cooldownUntil: number } }
    this._modelState = {}
    this._initProviders()
  }

  /**
   * 获取模型的熔断状态key
   */
  _modelKey(providerId, model) {
    return `${providerId}:${model}`
  }

  /**
   * 检查模型是否在冷却中
   */
  _isInCooldown(providerId, model) {
    const key = this._modelKey(providerId, model)
    const state = this._modelState[key]
    if (!state) return false
    if (state.cooldownUntil === 0) return false
    return Date.now() < state.cooldownUntil
  }

  /**
   * 触发模型熔断
   */
  _tripBreaker(providerId, model) {
    const key = this._modelKey(providerId, model)
    const state = this._modelState[key] || { failures: 0, cooldownUntil: 0 }
    state.failures++
    state.cooldownUntil = Date.now() + CB_COOLDOWN_MS
    this._modelState[key] = state
    safeLog({ providerId, model, failures: state.failures, cooldownUntil: new Date(state.cooldownUntil).toISOString(), type: 'circuit_breaker_tripped' }, `⚡ 熔断器触发`)
  }

  /**
   * 模型成功后重置熔断器
   */
  _resetBreaker(providerId, model) {
    const key = this._modelKey(providerId, model)
    delete this._modelState[key]
  }

  /**
   * 记录一次成功调用
   */
  recordSuccess(providerId, model) {
    this._resetBreaker(providerId, model)
  }

  /**
   * 记录一次失败调用
   */
  recordFailure(providerId, model) {
    const key = this._modelKey(providerId, model)
    const state = this._modelState[key] || { failures: 0, cooldownUntil: 0 }
    state.failures++

    if (state.failures >= CB_MAX_FAILURES) {
      state.cooldownUntil = Date.now() + CB_COOLDOWN_MS
      safeLog({ providerId, model, failures: state.failures, cooldownMinutes: CB_COOLDOWN_MS / 1000 / 60, type: 'circuit_breaker_tripped' }, `⚡ 熔断器触发`)
    }

    this._modelState[key] = state
  }

  /**
   * 获取所有模型的熔断状态（调试用）
   */
  getCircuitBreakerStatus() {
    const result = {}
    for (const [key, state] of Object.entries(this._modelState)) {
      const [providerId, model] = key.split(':')
      result[key] = {
        failures: state.failures,
        inCooldown: this._isInCooldown(providerId, model),
        cooldownRemainingMs: state.cooldownUntil > 0 ? Math.max(0, state.cooldownUntil - Date.now()) : 0,
      }
    }
    return result
  }

  _initProviders() {
    // 始终初始化 OpenRouter（免费，必有）
    this.providers.openrouter = new OpenRouterProvider({})

    // 如果配置了 Anthropic Key 则启用
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.anthropic = new AnthropicProvider({})
      safeLog({ provider: 'anthropic', type: 'provider_enabled' }, '✅ Anthropic provider 已启用')
    }

    // 如果配置了 DeepSeek Key 则启用
    if (process.env.DEEPSEEK_API_KEY) {
      this.providers.deepseek = new DeepSeekProvider({})
      safeLog({ provider: 'deepseek', type: 'provider_enabled' }, '✅ DeepSeek provider 已启用')
    }

    // 如果配置了 MiniMax Key 则启用
    if (process.env.MINIMAX_API_KEY) {
      this.providers.minimax = new MiniMaxProvider({})
      safeLog({ provider: 'minimax', type: 'provider_enabled' }, '✅ MiniMax provider 已启用')
    }
  }

  /**
   * 根据任务类型路由到最佳供应商（熔断感知）
   * @param {string} taskType - 任务类型
   * @returns {{provider: BaseProvider, model: string, temperature: number, maxTokens: number}}
   */
  resolveRoute(taskType) {
    const route = TASK_ROUTES[taskType] || TASK_ROUTES['default']

    // 首选供应商可用且未在冷却？
    const primary = this.providers[route.provider]
    if (primary && primary.isConfigured && !this._isInCooldown(primary.id, route.model)) {
      return {
        provider: primary,
        model: route.model,
        temperature: route.temperature,
        maxTokens: route.maxTokens,
        fallback: route.fallback,
      }
    }

    // 降级到备选供应商（如果未在冷却）
    const fb = route.fallback
    if (fb) {
      const fallbackProvider = this.providers[fb.provider]
      if (fallbackProvider && fallbackProvider.isConfigured && !this._isInCooldown(fb.provider, fb.model)) {
        return {
          provider: fallbackProvider,
          model: fb.model,
          temperature: route.temperature,
          maxTokens: route.maxTokens,
        }
      }
    }

    // 尝试任何未冷却的可用供应商
    for (const [pid, p] of Object.entries(this.providers)) {
      if (!p.isConfigured) continue
      const models = p.getModels()
      for (const m of models) {
        if (!this._isInCooldown(pid, m.id)) {
          return {
            provider: p,
            model: m.id,
            temperature: route.temperature,
            maxTokens: route.maxTokens,
          }
        }
      }
    }

    // 所有模型都在冷却，最终降级到 OpenRouter（强制绕过熔断）
    const openrouter = this.providers.openrouter
    return {
      provider: openrouter,
      model: OR_MODELS.nemotron,
      temperature: route.temperature,
      maxTokens: route.maxTokens,
    }
  }

  /**
   * 获取微调模型路由（如果可用）
   * @param {string} userId
   * @param {string} agentId
   * @param {string} taskType
   * @returns {Promise<{provider: BaseProvider, model: string, temperature: number, maxTokens: number, isFineTuned: boolean, modelVersion: number}|null>}
   */
  async resolveFineTunedRoute(userId, agentId, taskType) {
    // 动态导入避免循环依赖
    const { fineTuningManager } = require('../../services/fine-tuning-manager')

    try {
      const activeModel = await fineTuningManager.getActiveModel(userId, agentId)

      if (!activeModel || !activeModel.fineTunedModelId) {
        return null // 没有激活的微调模型
      }

      // 获取任务类型的默认温度和 token 配置
      const route = TASK_ROUTES[taskType] || TASK_ROUTES['default']
      const openrouter = this.providers.openrouter

      return {
        provider: openrouter,
        model: activeModel.fineTunedModelId,
        temperature: route.temperature,
        maxTokens: route.maxTokens,
        isFineTuned: true,
        modelVersion: activeModel.version,
      }
    } catch (error) {
      console.error('获取微调路由失败:', error)
      return null
    }
  }

  /**
   * 统一聊天接口 - 自动路由（带熔断）
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
      // 成功，重置熔断器
      this.recordSuccess(route.provider.id, route.model)
      return result
    } catch (error) {
      // 失败，记录熔断
      this.recordFailure(route.provider.id, route.model)

      // 尝试备选供应商（如果熔断后还有其他可用供应商）
      if (route.fallback) {
        const fallbackProvider = this.providers[route.fallback.provider]
        if (fallbackProvider && fallbackProvider.isConfigured) {
          safeLog({ fromProvider: route.provider.id, fromModel: route.model, toProvider: route.fallback.provider, toModel: route.fallback.model, error: error.message, type: 'provider_fallback' }, `⚠️ 提供商降级`)
          try {
            const fbResult = await fallbackProvider.chat(messages, {
              model: route.fallback.model,
              temperature: route.temperature,
              maxTokens: route.maxTokens,
              ...restOptions,
            })
            this.recordSuccess(route.fallback.provider, route.fallback.model)
            return fbResult
          } catch (fbError) {
            this.recordFailure(route.fallback.provider, route.fallback.model)
            throw fbError
          }
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
