/**
 * MiniMax 供应商适配器
 * Anthropic 兼容格式 (v1/messages)
 */

const BaseProvider = require('./base-provider')
const { safeLog } = require('../../lib/logger')

const MODELS = {
  'MiniMax-M2.7': 'MiniMax-M2.7',  // Token Plan 模型
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
      baseUrl: config.baseUrl || process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/anthropic',
    })
    this.fallbackModels = [MODELS['MiniMax-M2.7']]
  }

  async chat(messages, options = {}) {
    const {
      model = MODELS['MiniMax-M2.7'],
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
        const response = await fetch(`${this.baseUrl}/v1/messages`, {
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

        // MiniMax Anthropic 兼容格式: content 是数组，包含 text/thinking 类型
        // 优先提取 text 类型内容，如果为空则尝试从 thinking 提取
        let content = ''

        if (data.content && Array.isArray(data.content)) {
          // 找 text 类型
          const textContent = data.content.find(c => c.type === 'text')
          if (textContent?.text) {
            content = textContent.text
          } else if (data.content.length > 0) {
            // text 为空时，尝试从 thinking 字段提取
            // thinking 内容可能包含实际的回复文本
            const thinkingContent = data.content.find(c => c.type === 'thinking')
            if (thinkingContent?.text) {
              // thinking 内容很长，取最后部分（通常是结论）
              const thinkingText = thinkingContent.text
              // 尝试从 thinking 中提取可能的 JSON 或实际回复
              const lines = thinkingText.split('\n')
              const lastMeaningfulLine = [...lines].reverse().find(l =>
                l.trim() && !l.includes('=') && l.length > 5
              )
              if (lastMeaningfulLine) {
                content = lastMeaningfulLine.trim()
              }
            }
          }
        }

        // 如果仍然为空，说明模型没有正常输出
        if (!content && data.stop_reason === 'max_tokens') {
          safeLog({
            model: currentModel,
            warning: 'Output truncated due to max_tokens, retrying with more tokens',
            type: 'minimax_truncated'
          }, `⚠️ MiniMax 输出被截断`)

          // 如果还有重试次数，增加 maxTokens 重试
          if (attempt < retries) {
            const newMaxTokens = Math.min(maxTokens * 2, 8000)
            options.maxTokens = newMaxTokens
            await new Promise(r => setTimeout(r, 1000))
            continue
          }
        }

        return {
          content,
          usage: {
            inputTokens: data.usage?.input_tokens || 0,
            outputTokens: data.usage?.output_tokens || 0,
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
