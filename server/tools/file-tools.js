/**
 * 文件工具
 * 文件上传、下载、列表、删除、预览
 */

const { BaseTool, ValidationError, ToolExecutionError } = require('./base-tool')
const { upload, download, deleteFile, getPublicUrl } = require('../lib/storage-service')

/**
 * 文件上传
 */
class FileUploadTool extends BaseTool {
  constructor() {
    super({
      name: 'file_upload',
      description: '上传文件到存储',
      category: 'file',
      requiresConfirmation: true,
      parameters: [
        { name: 'file_name', type: 'string', required: true, description: '文件名' },
        { name: 'file_data', type: 'string', required: true, description: '文件内容（Base64 编码）' },
        { name: 'mime_type', type: 'string', required: false, description: 'MIME 类型' },
        { name: 'folder', type: 'string', default: 'uploads', required: false, description: '存储文件夹' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { file_name, file_data, mime_type, folder } = args

    // 上传到存储服务（R2/S3/本地）
    const { storageKey, publicUrl, sizeBytes } = await upload(file_data, file_name, folder)

    const file = await prisma.file.create({
      data: {
        userId: context.userId,
        originalName: file_name,
        storageKey,
        publicUrl,
        mimeType: mime_type || 'application/octet-stream',
        fileExtension: file_name.split('.').pop(),
        sizeBytes,
        storageProvider: process.env.STORAGE_PROVIDER || 'local',
        fileCategory: this._getFileCategory(mime_type),
      },
    })

    return {
      success: true,
      fileId: file.id,
      fileName: file_name,
      storageKey,
      publicUrl,
      sizeBytes,
      message: `文件已上传: ${file_name}`,
    }
  }

  _getFileCategory(mimeType) {
    if (!mimeType) return 'other'
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet'
    if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('pdf')) return 'document'
    return 'other'
  }
}

/**
 * 文件下载
 */
class FileDownloadTool extends BaseTool {
  constructor() {
    super({
      name: 'file_download',
      description: '下载文件',
      category: 'file',
      parameters: [
        { name: 'file_id', type: 'string', required: true, description: '文件 ID' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { file_id } = args

    const file = await prisma.file.findUnique({
      where: { id: file_id },
    })

    if (!file) {
      throw new ToolExecutionError(`文件不存在: ${file_id}`, this.name)
    }

    // 获取文件内容
    const { data, sizeBytes } = await download(file.storageKey)

    // 更新访问统计
    await prisma.file.update({
      where: { id: file_id },
      data: {
        downloadCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    })

    return {
      fileId: file.id,
      fileName: file.originalName,
      storageKey: file.storageKey,
      mimeType: file.mimeType,
      sizeBytes: sizeBytes || file.sizeBytes,
      // 返回 Base64 编码的文件内容
      fileData: data,
      publicUrl: getPublicUrl(file.storageKey),
    }
  }
}

/**
 * 文件列表
 */
class FileListTool extends BaseTool {
  constructor() {
    super({
      name: 'file_list',
      description: '列出用户文件',
      category: 'file',
      parameters: [
        { name: 'folder', type: 'string', required: false, description: '文件夹路径' },
        { name: 'file_category', type: 'string', required: false, description: '文件类别: spreadsheet/document/image/video/audio/other' },
        { name: 'limit', type: 'number', default: 20, required: false, description: '返回数量' },
        { name: 'offset', type: 'number', default: 0, required: false, description: '偏移量' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { folder, file_category, limit, offset } = args

    let where = { userId: context.userId }

    if (folder) {
      where.storageKey = { startsWith: folder }
    }
    if (file_category) {
      where.fileCategory = file_category
    }

    const files = await prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return {
      count: files.length,
      files: files.map(f => ({
        id: f.id,
        fileName: f.originalName,
        storageKey: f.storageKey,
        mimeType: f.mimeType,
        fileCategory: f.fileCategory,
        sizeBytes: f.sizeBytes,
        isPublic: f.isPublic,
        createdAt: f.createdAt,
      })),
    }
  }
}

/**
 * 文件删除
 */
class FileDeleteTool extends BaseTool {
  constructor() {
    super({
      name: 'file_delete',
      description: '删除文件',
      category: 'file',
      requiresConfirmation: true,
      parameters: [
        { name: 'file_id', type: 'string', required: true, description: '文件 ID' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { file_id } = args

    const file = await prisma.file.findUnique({
      where: { id: file_id },
    })

    if (!file) {
      throw new ToolExecutionError(`文件不存在: ${file_id}`, this.name)
    }

    // 从存储服务删除文件
    await deleteFile(file.storageKey)

    // 从数据库删除记录
    await prisma.file.delete({
      where: { id: file_id },
    })

    return {
      success: true,
      message: `文件已删除: ${file.originalName}`,
    }
  }
}

/**
 * 文件预览
 */
class FilePreviewTool extends BaseTool {
  constructor() {
    super({
      name: 'file_preview',
      description: '预览文件内容（文本/图片/表格）',
      category: 'file',
      parameters: [
        { name: 'file_id', type: 'string', required: true, description: '文件 ID' },
        { name: 'max_lines', type: 'number', default: 100, required: false, description: '最大行数（文本文件）' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { file_id, max_lines } = args

    const file = await prisma.file.findUnique({
      where: { id: file_id },
    })

    if (!file) {
      throw new ToolExecutionError(`文件不存在: ${file_id}`, this.name)
    }

    // TODO: 实际读取文件内容
    // 根据文件类型返回预览

    const preview = {
      id: file.id,
      fileName: file.originalName,
      mimeType: file.mimeType,
      fileCategory: file.fileCategory,
      previewText: file.previewText || '预览暂不可用',
      thumbnailUrl: file.thumbnailUrl,
      // 如果是表格，返回表格信息
      spreadsheetInfo: file.spreadsheetInfo,
    }

    return preview
  }
}

module.exports = {
  FileUploadTool,
  FileDownloadTool,
  FileListTool,
  FileDeleteTool,
  FilePreviewTool,
}
