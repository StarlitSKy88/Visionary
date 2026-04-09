/**
 * AI Provider 基类 - 所有 AI 供应商适配器的抽象接口
 * 参考 GSD-2 的多供应商架构设计
 */

class BaseProvider {
  /**
   * @param {object} config - 供应商配置
   * @param {string} config.id - 供应商唯一标识
   * @param {string} config.name - 供应商显示名称
   * @param {string} config.apiKey - API 密钥
   * @param {string} config.baseUrl - API 基础 URL
   */
  constructor(config) {
    this.id = config.id
    this.name = config.name
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
    this._available = null
  }

  /**
   * 发送聊天请求
   * @param {Array} messages - 消息列表 [{role, content}]
   * @param {object} options - {model, temperature, maxTokens}
   * @returns {Promise<{content: string, usage: {inputTokens: number, outputTokens: number}, model: string}>}
   */
  async chat(messages, options = {}) {
    throw new Error(`${this.id} provider: chat() 未实现`)
  }

  /**
   * 健康检查 - 验证供应商是否可用
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const result = await this.chat(
        [{ role: 'user', content: 'ping' }],
        { maxTokens: 5 }
      )
      this._available = true
      return true
    } catch {
      this._available = false
      return false
    }
  }

  /**
   * 获取可用模型列表
   * @returns {Array<{id: string, name: string, maxTokens: number}>}
   */
  getModels() {
    return []
  }

  /**
   * 是否已配置（有 API Key）
   */
  get isConfigured() {
    return !!this.apiKey
  }

  /**
   * 是否可用（上次健康检查通过）
   */
  get isAvailable() {
    return this._available !== false && this.isConfigured
  }
}

module.exports = BaseProvider
