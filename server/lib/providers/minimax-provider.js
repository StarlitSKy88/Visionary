/**
 * MiniMax 供应商适配器
 * OpenAI 兼容格式
 */

const BaseProvider = require('./base-provider')
const { safeLog } = require('../../lib/logger')

const MODELS = {
  'MiniMax-Text-01': 'MiniMax-Text-01',
  'abab6.5s': 'abab6.5s',
  'abab6.5g': 'abab6.5g',
}

class MiniMaxProvider extends BaseProvider {
  constructor(config) {
    super({
      id: 'minimax',
      name: 'MiniMax',
      apiKey: config.apiKey || process.env.MINIMAX_API_KEY,
      baseUrl: config.baseUrl || process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1',
    })
    this.fallbackModels = [MODELS['MiniMax-Text-01']]
  }

  async chat(messages, options = {}) {
    const {
      model = MODELS['MiniMax-Text-01'],
      temperature = 0.7,
      maxTokens = 2000,
      retries = 2,
    } = options

    if (!this.isConfigured) {
      throw new Error('MiniMax API Key 未配置')
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
          safeLog({ model: currentModel, status: response.status, error: errorText, type: 'minimax_error' }, `❌ MiniMax Error (${currentModel})`)

          if (response.status === 429) {
            await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
            continue
          }
          if (attempt < retries) continue
          throw new Error(`MiniMax 调用失败: ${response.status}`)
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
        safeLog({ attempt: attempt + 1, model: currentModel, error: error.message, type: 'minimax_retry' }, `⚠️ MiniMax 第${attempt + 1}次重试...`)
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
  }

  getModels() {
    return Object.entries(MODELS).map(([key, id]) => ({
      id, name: key, maxTokens: 2000, free: false,
    }))
  }
}

module.exports = { MiniMaxProvider, MODELS }
