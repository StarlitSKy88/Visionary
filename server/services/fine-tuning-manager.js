/**
 * 微调管理服务
 * 封装 OpenRouter 微调 API (兼容 OpenAI 格式)
 */

const { prisma } = require('../lib/prisma')

class FineTuningManager {
  constructor() {
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
    this.apiKey = process.env.OPENROUTER_API_KEY
  }

  /**
   * 创建微调任务
   */
  async createFineTuningJob(userId, agentId, trainingData) {
    const { jsonl } = trainingData

    try {
      // 1. 上传训练文件
      const file = await this._uploadTrainingFile(agentId, jsonl)

      // 2. 获取 Agent 的基础模型
      const agent = await prisma.agent.findUnique({ where: { id: agentId } })
      const baseModel = agent?.config?.baseModel || 'nvidia/nemotron-3-super-120b-a12b:free'

      // 3. 创建微调任务 (OpenRouter 兼容 OpenAI 格式)
      const createResponse = await fetch(`${this.baseUrl}/fine_tuning/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: baseModel,
          training_file: file.id,
          hyperparameters: {
            n_epochs: 3,
            batch_size: 1,
            learning_rate_multiplier: 1,
          },
        }),
      })

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        throw new Error(`微调任务创建失败: ${errorText}`)
      }

      const job = await createResponse.json()

      // 4. 记录到数据库
      const model = await prisma.fineTunedModel.create({
        data: {
          userId,
          agentId,
          baseModel,
          fineTunedModelId: job.id,
          modelAlias: `v${Date.now()}`,
          trainingJobId: job.id,
          trainingFileId: file.id,
          status: this._mapJobStatus(job.status),
          estimatedCost: job.estimated_cost || 0,
        },
      })

      return model
    } catch (error) {
      console.error('创建微调任务失败:', error)
      throw error
    }
  }

  /**
   * 获取微调任务状态
   */
  async getFineTuningStatus(modelId) {
    const model = await prisma.fineTunedModel.findUnique({ where: { id: modelId } })

    if (!model || !model.trainingJobId) {
      return model
    }

    try {
      const response = await fetch(`${this.baseUrl}/fine_tuning/jobs/${model.trainingJobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        return model
      }

      const job = await response.json()

      // 更新状态
      const updates = {
        status: this._mapJobStatus(job.status),
        trainingProgress: job.progress || model.trainingProgress,
      }

      if (job.status === 'succeeded') {
        updates.isActive = true
        updates.completedAt = new Date()
        updates.actualCost = job.final_cost
        updates.fineTunedModelId = job.fine_tuned_model || model.fineTunedModelId
      } else if (job.status === 'failed') {
        updates.errorMessage = job.error?.message || '微调失败'
      }

      return prisma.fineTunedModel.update({
        where: { id: modelId },
        data: updates,
      })
    } catch (error) {
      console.error('获取微调状态失败:', error)
      return model
    }
  }

  /**
   * 列出某 Agent 的所有微调版本
   */
  async listFineTuningModels(userId, agentId) {
    return prisma.fineTunedModel.findMany({
      where: { userId, agentId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 列出可用的微调模型（训练成功的）
   */
  async listAvailableModels(userId, agentId) {
    return prisma.fineTunedModel.findMany({
      where: {
        userId,
        agentId,
        status: 'succeeded',
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 激活某个微调版本
   */
  async activateModel(modelId) {
    const model = await prisma.fineTunedModel.findUnique({ where: { id: modelId } })

    if (!model) {
      throw new Error('模型不存在')
    }

    if (model.status !== 'succeeded') {
      throw new Error('只有训练成功的模型才能激活')
    }

    // 先停用同 Agent 的其他版本
    await prisma.fineTunedModel.updateMany({
      where: {
        agentId: model.agentId,
        id: { not: modelId },
      },
      data: { isActive: false },
    })

    // 激活选中的版本
    return prisma.fineTunedModel.update({
      where: { id: modelId },
      data: { isActive: true },
    })
  }

  /**
   * 获取当前激活的微调模型
   */
  async getActiveModel(userId, agentId) {
    return prisma.fineTunedModel.findFirst({
      where: { userId, agentId, isActive: true, status: 'succeeded' },
    })
  }

  /**
   * 取消微调任务
   */
  async cancelFineTuning(modelId) {
    const model = await prisma.fineTunedModel.findUnique({ where: { id: modelId } })

    if (!model || !model.trainingJobId) {
      throw new Error('微调任务不存在')
    }

    try {
      await fetch(`${this.baseUrl}/fine_tuning/jobs/${model.trainingJobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })
    } catch (error) {
      console.error('取消微调任务失败:', error)
    }

    return prisma.fineTunedModel.update({
      where: { id: modelId },
      data: { status: 'cancelled' },
    })
  }

  /**
   * 获取微调进度（批量轮询）
   */
  async refreshRunningJobs() {
    const runningModels = await prisma.fineTunedModel.findMany({
      where: {
        status: { in: ['training', 'queued', 'running'] },
      },
    })

    const results = []
    for (const model of runningModels) {
      const updated = await this.getFineTuningStatus(model.id)
      results.push(updated)
    }

    return results
  }

  // ==================== 私有方法 ====================

  /**
   * 上传训练文件
   */
  async _uploadTrainingFile(agentId, jsonlContent) {
    // 创建 FormData
    const formData = new FormData()
    const blob = new Blob([jsonlContent], { type: 'application/jsonl' })
    formData.append('file', blob, `training-${agentId}.jsonl`)
    formData.append('purpose', 'fine-tune')

    const response = await fetch(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`文件上传失败: ${errorText}`)
    }

    const data = await response.json()
    return { id: data.id, filename: data.filename }
  }

  /**
   * 映射 OpenRouter 状态到内部状态
   */
  _mapJobStatus(openRouterStatus) {
    const statusMap = {
      'queued': 'queued',
      'running': 'running',
      'succeeded': 'succeeded',
      'failed': 'failed',
      'cancelled': 'cancelled',
    }
    return statusMap[openRouterStatus] || 'training'
  }
}

// 单例
const fineTuningManager = new FineTuningManager()

module.exports = { fineTuningManager, FineTuningManager }
