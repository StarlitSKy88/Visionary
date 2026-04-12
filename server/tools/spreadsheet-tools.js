/**
 * 表格工具
 * Excel/CSV 读取、写入、分析
 */

const { BaseTool, ValidationError, ToolExecutionError } = require('./base-tool')
const { readSpreadsheet, writeSpreadsheet, analyzeSpreadsheet, createSpreadsheet } = require('../lib/spreadsheet-service')
const { upload, download } = require('../lib/storage-service')

/**
 * 读取表格
 */
class SpreadsheetReadTool extends BaseTool {
  constructor() {
    super({
      name: 'spreadsheet_read',
      description: '读取 Excel/CSV 表格文件',
      category: 'spreadsheet',
      parameters: [
        { name: 'file_id', type: 'string', required: true, description: '文件 ID' },
        { name: 'sheet', type: 'string', required: false, description: '工作表名称（Excel 多个 sheet 时）' },
        { name: 'range', type: 'string', required: false, description: '范围，如 "A1:D10"' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { file_id, sheet, range } = args

    const file = await prisma.file.findUnique({
      where: { id: file_id },
    })

    if (!file) {
      throw new ToolExecutionError(`文件不存在: ${file_id}`, this.name)
    }

    // 下载文件内容
    const { data: fileData } = await download(file.storageKey)

    // 使用 xlsx 读取表格
    const result = readSpreadsheet(fileData, { sheet, range })

    return {
      fileId: file.id,
      fileName: file.originalName,
      headers: result.headers,
      data: result.data,
      rawData: result.rawData,
      sheetNames: result.sheetNames,
      sheetCount: result.sheetCount,
    }
  }
}

/**
 * 写入表格
 */
class SpreadsheetWriteTool extends BaseTool {
  constructor() {
    super({
      name: 'spreadsheet_write',
      description: '写入数据到 Excel/CSV 表格',
      category: 'spreadsheet',
      requiresConfirmation: true,
      parameters: [
        { name: 'file_id', type: 'string', required: true, description: '文件 ID' },
        { name: 'sheet', type: 'string', default: 'Sheet1', required: false, description: '工作表名称' },
        { name: 'range', type: 'string', required: false, description: '写入范围，如 "A1"' },
        { name: 'data', type: 'array', required: true, description: '要写入的数据（二维数组）' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { file_id, sheet, range, data } = args

    if (!Array.isArray(data) || !data.length) {
      throw new ValidationError('data 必须是二维数组')
    }

    const file = await prisma.file.findUnique({
      where: { id: file_id },
    })

    if (!file) {
      throw new ToolExecutionError(`文件不存在: ${file_id}`, this.name)
    }

    // 获取现有文件内容（如果有）
    let existingData = []
    try {
      const { data: existingFileData } = await download(file.storageKey)
      const parsed = readSpreadsheet(existingFileData, { sheet })
      if (range) {
        // 合并数据
        existingData = parsed.rawData
      }
    } catch (e) {
      // 文件不存在或无法读取，创建新的
    }

    // 合并数据
    const mergedData = existingData.length > 0
      ? [...existingData, ...data]
      : data

    // 使用 xlsx 写入
    const format = file.fileExtension === 'csv' ? 'csv' : 'xlsx'
    const { base64 } = writeSpreadsheet(mergedData, format, sheet || 'Sheet1')

    // 上传更新后的文件
    const { storageKey: newStorageKey, publicUrl } = await upload(
      base64,
      file.originalName,
      file.storageKey.split('/')[0]
    )

    // 更新数据库
    await prisma.file.update({
      where: { id: file_id },
      data: {
        storageKey: newStorageKey,
        publicUrl,
        previewText: `已更新 ${mergedData.length} 行数据`,
        spreadsheetInfo: {
          sheet_count: 1,
          row_count: mergedData.length,
        },
      },
    })

    return {
      success: true,
      fileId: file_id,
      rowsWritten: data.length,
      totalRows: mergedData.length,
      message: `已写入 ${data.length} 行数据（总计 ${mergedData.length} 行）`,
    }
  }
}

/**
 * 分析表格
 */
class SpreadsheetAnalyzeTool extends BaseTool {
  constructor() {
    super({
      name: 'spreadsheet_analyze',
      description: '分析表格数据，生成统计摘要',
      category: 'spreadsheet',
      parameters: [
        { name: 'file_id', type: 'string', required: true, description: '文件 ID' },
        { name: 'sheet', type: 'string', required: false, description: '工作表名称' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { file_id, sheet } = args

    const file = await prisma.file.findUnique({
      where: { id: file_id },
    })

    if (!file) {
      throw new ToolExecutionError(`文件不存在: ${file_id}`, this.name)
    }

    // 下载并分析文件
    const { data: fileData } = await download(file.storageKey)
    const analysis = analyzeSpreadsheet(fileData)

    return {
      fileId: file.id,
      fileName: file.originalName,
      summary: {
        totalRows: analysis.totalRows,
        totalColumns: analysis.totalColumns,
        numericColumns: analysis.numericColumns,
        textColumns: analysis.textColumns,
        statistics: analysis.statistics,
      },
      insights: analysis.insights,
    }
  }
}

/**
 * 创建表格
 */
class SpreadsheetCreateTool extends BaseTool {
  constructor() {
    super({
      name: 'spreadsheet_create',
      description: '创建新的 Excel/CSV 表格',
      category: 'spreadsheet',
      requiresConfirmation: true,
      parameters: [
        { name: 'file_name', type: 'string', required: true, description: '文件名' },
        { name: 'data', type: 'array', required: false, description: '初始数据（二维数组）' },
        { name: 'format', type: 'string', default: 'xlsx', required: false, description: '格式: xlsx/csv' },
      ],
    })
  }

  async execute(args, context) {
    const { prisma } = context
    const { file_name, data, format } = args

    const fileFormat = format || 'xlsx'

    // 使用 xlsx 创建表格
    const result = createSpreadsheet(file_name, data, fileFormat)

    // 上传到存储
    const { storageKey, publicUrl } = await upload(
      result.base64,
      file_name,
      'spreadsheets'
    )

    const file = await prisma.file.create({
      data: {
        userId: context.userId,
        originalName: file_name,
        storageKey,
        publicUrl,
        mimeType: result.mimeType,
        fileExtension: fileFormat,
        sizeBytes: Buffer.from(result.base64, 'base64').length,
        fileCategory: 'spreadsheet',
        spreadsheetInfo: {
          sheet_count: result.sheetCount,
          row_count: data ? data.length : 0,
        },
      },
    })

    return {
      success: true,
      fileId: file.id,
      fileName: file_name,
      storageKey,
      publicUrl,
      message: `已创建表格: ${file_name}`,
    }
  }
}

module.exports = {
  SpreadsheetReadTool,
  SpreadsheetWriteTool,
  SpreadsheetAnalyzeTool,
  SpreadsheetCreateTool,
}
