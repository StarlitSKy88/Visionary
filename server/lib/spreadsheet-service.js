/**
 * 表格处理服务
 * 使用 xlsx 库进行 Excel/CSV 读写和分析
 */

const XLSX = require('xlsx')
const { upload, download } = require('./storage-service')

/**
 * 读取表格文件
 * @param {string} fileData - Base64 编码的文件内容
 * @param {object} options - 读取选项
 */
function readSpreadsheet(fileData, options = {}) {
  const { sheet, range } = options

  // Base64 解码为二进制
  const binaryData = Buffer.from(fileData, 'base64')

  // 使用 xlsx 解析
  const workbook = XLSX.read(binaryData, { type: 'buffer' })

  // 获取工作表
  const sheetName = sheet || workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  // 解析范围
  let data
  if (range) {
    data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range })
  } else {
    data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  }

  // 转换为带标题的对象数组
  if (data.length > 0) {
    const headers = data[0]
    const rows = data.slice(1)

    // 转为对象数组
    const objects = rows.map(row => {
      const obj = {}
      headers.forEach((header, i) => {
        obj[header || `列${i + 1}`] = row[i]
      })
      return obj
    })

    // 也保留原始二维数组
    return {
      headers,
      data: objects,
      rawData: data,
      sheetNames: workbook.SheetNames,
      sheetCount: workbook.SheetNames.length,
    }
  }

  return {
    headers: [],
    data: [],
    rawData: [],
    sheetNames: workbook.SheetNames,
    sheetCount: workbook.SheetNames.length,
  }
}

/**
 * 写入数据到表格
 * @param {array} data - 二维数组
 * @param {string} format - 格式 xlsx/csv
 * @param {string} sheetName - 工作表名
 */
function writeSpreadsheet(data, format = 'xlsx', sheetName = 'Sheet1') {
  // 创建工作簿
  const workbook = XLSX.utils.book_new()

  // 创建工作表
  const worksheet = XLSX.utils.aoa_to_sheet(data)

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // 生成文件
  const fileBuffer = format === 'csv'
    ? XLSX.utils.sheet_to_csv(worksheet)
    : XLSX.write(workbook, { bookType: format, type: 'buffer' })

  return {
    buffer: fileBuffer,
    base64: fileBuffer.toString('base64'),
    mimeType: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
}

/**
 * 分析表格数据
 * @param {string} fileData - Base64 编码的文件内容
 */
function analyzeSpreadsheet(fileData) {
  const { headers, data, rawData, sheetCount } = readSpreadsheet(fileData)

  if (!data.length) {
    return {
      totalRows: 0,
      totalColumns: 0,
      numericColumns: [],
      textColumns: [],
      statistics: {},
      insights: [],
    }
  }

  // 分析列类型
  const numericColumns = []
  const textColumns = []

  headers.forEach(header => {
    const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined)
    const numericCount = values.filter(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v)))).length

    if (numericCount > values.length * 0.5) {
      numericColumns.push(header)
    } else {
      textColumns.push(header)
    }
  })

  // 计算统计信息
  const statistics = {}

  numericColumns.forEach(col => {
    const values = data
      .map(row => row[col])
      .filter(v => v !== null && v !== undefined && (typeof v === 'number' || !isNaN(parseFloat(v))))
      .map(v => typeof v === 'number' ? v : parseFloat(v))

    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0)
      const avg = sum / values.length
      const min = Math.min(...values)
      const max = Math.max(...values)

      statistics[col] = {
        sum: Math.round(sum * 100) / 100,
        avg: Math.round(avg * 100) / 100,
        min,
        max,
        count: values.length,
      }
    }
  })

  // 生成洞察
  const insights = []

  // 分析数值列
  Object.entries(statistics).forEach(([col, stats]) => {
    if (stats.max > stats.avg * 2) {
      insights.push(`${col}最高达到 ${stats.max}，远超平均值 ${stats.avg}`)
    }
    if (stats.min < stats.avg * 0.5 && stats.min > 0) {
      insights.push(`${col}最低为 ${stats.min}，低于平均值较多`)
    }
  })

  // 数据量洞察
  if (rawData.length > 1000) {
    insights.push(`数据量较大，共 ${rawData.length} 行`)
  }

  return {
    totalRows: rawData.length - 1, // 减去表头
    totalColumns: headers.length,
    numericColumns,
    textColumns,
    statistics,
    insights,
  }
}

/**
 * 创建空表格
 * @param {string} fileName - 文件名
 * @param {array} headers - 表头
 * @param {string} format - 格式
 */
function createSpreadsheet(fileName, headers = [], format = 'xlsx') {
  const data = headers.length > 0 ? [headers] : []
  const result = writeSpreadsheet(data, format)

  return {
    fileName,
    base64: result.base64,
    mimeType: result.mimeType,
    sheetCount: 1,
    rowCount: data.length,
  }
}

module.exports = { readSpreadsheet, writeSpreadsheet, analyzeSpreadsheet, createSpreadsheet }
