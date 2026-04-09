/**
 * Anthropic 直连供应商适配器
 * 通过 Anthropic API 直连 Claude 模型
 */

const BaseProvider = require('./base-provider')

const MODELS = {
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5',
}

class AnthropicProvider extends BaseProvider {
  constructor(config) {
    super({
      id: 'anthropic',
      name: 'Anthropic (直连)',
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      baseUrl: config.baseUrl || 'https://api.anthropic.com',
    })
  }

  async chat(messages, options = {}) {
    const {
      model = MODELS.sonnet,
      temperature = 0.7,
      maxTokens = 2000,
      systemPrompt,
    } = options

    if (!this.isConfigured) {
      throw new Error('Anthropic API Key 未配置')
    }

    // 分离 system 消息
    const systemMessages = messages.filter(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')
    const system = systemPrompt || (systemMessages.length > 0 ? systemMessages.map(m => m.content).join('\n') : undefined)

    const startTime = Date.now()
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(system ? { system } : {}),
        messages: chatMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Anthropic API 错误 ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const latency = Date.now() - startTime

    return {
      content: data.content[0].text,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
      model,
      latency,
      provider: this.id,
    }
  }

  getModels() {
    return Object.entries(MODELS).map(([key, id]) => ({
      id, name: `Claude ${key}`, maxTokens: 8192, free: false,
    }))
  }
}

module.exports = { AnthropicProvider, MODELS }
