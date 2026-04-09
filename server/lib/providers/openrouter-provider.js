/**
 * OpenRouter 供应商适配器
 * 兼容现有 AI 服务的所有功能
 */

const BaseProvider = require('./base-provider')

const MODELS = {
  nemotron: 'nvidia/nemotron-3-super-120b-a12b:free',
  gemini: 'google/gemini-2.0-flash-exp:free',
  llama: 'meta-llama/llama-3.3-8b-instruct:free',
  deepseek: 'deepseek/deepseek-r1:free',
}

class OpenRouterProvider extends BaseProvider {
  constructor(config) {
    super({
      id: 'openrouter',
      name: 'OpenRouter',
      apiKey: config.apiKey || process.env.OPENROUTER_API_KEY,
      baseUrl: config.baseUrl || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    })
    this.fallbackModels = [MODELS.gemini, MODELS.deepseek]
  }

  async chat(messages, options = {}) {
    const {
      model = MODELS.nemotron,
      temperature = 0.7,
      maxTokens = 2000,
      retries = 2,
    } = options

    if (!this.isConfigured) {
      throw new Error('OpenRouter API Key 未配置')
    }

    const modelsToTry = [model, ...this.fallbackModels.filter(m => m !== model)]

    for (let attempt = 0; attempt <= retries; attempt++) {
      const currentModel = modelsToTry[Math.min(attempt, modelsToTry.length - 1)]

      try {
        const startTime = Date.now()
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
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
          console.error(`OpenRouter Error (${currentModel}):`, response.status, errorText)

          if (response.status === 429) {
            await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
            continue
          }
          if (attempt < retries) continue
          throw new Error(`OpenRouter 调用失败: ${response.status}`)
        }

        const data = await response.json()
        const latency = Date.now() - startTime

        return {
          content: data.choices[0].message.content,
          usage: {
            inputTokens: data.usage?.prompt_tokens || 0,
            outputTokens: data.usage?.completion_tokens || 0,
          },
          model: currentModel,
          latency,
          provider: this.id,
        }
      } catch (error) {
        if (attempt === retries) throw error
        console.warn(`OpenRouter 第${attempt + 1}次重试...`, error.message)
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
  }

  getModels() {
    return Object.entries(MODELS).map(([key, id]) => ({
      id, name: key, maxTokens: 2000, free: true,
    }))
  }
}

module.exports = { OpenRouterProvider, MODELS }
