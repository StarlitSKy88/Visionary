/**
 * DeepSeek 直连供应商适配器
 * 通过 DeepSeek API 直连
 */

const BaseProvider = require('./base-provider')

const MODELS = {
  chat: 'deepseek-chat',
  reasoner: 'deepseek-reasoner',
}

class DeepSeekProvider extends BaseProvider {
  constructor(config) {
    super({
      id: 'deepseek',
      name: 'DeepSeek (直连)',
      apiKey: config.apiKey || process.env.DEEPSEEK_API_KEY,
      baseUrl: config.baseUrl || 'https://api.deepseek.com',
    })
  }

  async chat(messages, options = {}) {
    const {
      model = MODELS.chat,
      temperature = 0.7,
      maxTokens = 2000,
    } = options

    if (!this.isConfigured) {
      throw new Error('DeepSeek API Key 未配置')
    }

    const startTime = Date.now()
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepSeek API 错误 ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const latency = Date.now() - startTime

    return {
      content: data.choices[0].message.content,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      },
      model,
      latency,
      provider: this.id,
    }
  }

  getModels() {
    return Object.entries(MODELS).map(([key, id]) => ({
      id, name: `DeepSeek ${key}`, maxTokens: 4096, free: false,
    }))
  }
}

module.exports = { DeepSeekProvider, MODELS }
