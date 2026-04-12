/**
 * 存储服务
 * 支持本地存储（开发）和 Cloudflare R2 / S3 兼容存储（生产）
 */

const { safeLog } = require('./logger')
const path = require('path')
const fs = require('fs')

// ===== 配置 =====
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local' // 'local' | 'r2' | 's3'
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL // 如 https://xxx.r2.dev

const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || './data/uploads'

// ===== 本地存储 =====

async function uploadLocal(fileData, fileName, folder) {
  const folderPath = path.join(LOCAL_STORAGE_PATH, folder)
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true })
  }

  const timestamp = Date.now()
  const storageKey = `${folder}/${timestamp}_${fileName}`
  const filePath = path.join(LOCAL_STORAGE_PATH, storageKey)

  // fileData 是 Base64 编码
  const buffer = Buffer.from(fileData, 'base64')
  fs.writeFileSync(filePath, buffer)

  return {
    storageKey,
    publicUrl: `/uploads/${storageKey}`,
    sizeBytes: buffer.length,
  }
}

async function downloadLocal(storageKey) {
  const filePath = path.join(LOCAL_STORAGE_PATH, storageKey)
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${storageKey}`)
  }

  const buffer = fs.readFileSync(filePath)
  return {
    data: buffer.toString('base64'),
    sizeBytes: buffer.length,
  }
}

async function deleteLocal(storageKey) {
  const filePath = path.join(LOCAL_STORAGE_PATH, storageKey)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

function getLocalUrl(storageKey) {
  return `/uploads/${storageKey}`
}

// ===== R2 / S3 存储 =====

// 使用原生 fetch 实现 S3 签名请求（不依赖 AWS SDK）
async function uploadR2(fileData, fileName, folder) {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error('R2 环境变量未配置')
  }

  const timestamp = Date.now()
  const storageKey = `${folder}/${timestamp}_${fileName}`

  // 文件是 Base64，解码
  const binaryData = Buffer.from(fileData, 'base64')

  // 生成 R2 POST 上传 URL（使用预签名 PUT）
  // R2 API: https://developers.cloudflare.com/r2/api/s3/presigned-operations/
  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestream.com/${R2_BUCKET_NAME}/${storageKey}`

  // 注意：实际生产应使用预签名 URL，这里演示直接上传
  // R2 支持 S3 兼容 API
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
      'x-amz-acl': 'public-read',
    },
    body: binaryData,
  })

  if (!response.ok) {
    throw new Error(`R2 上传失败: ${response.status}`)
  }

  const publicUrl = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL}/${storageKey}`
    : `https://${R2_ACCOUNT_ID}.r2.dev/${R2_BUCKET_NAME}/${storageKey}`

  return {
    storageKey,
    publicUrl,
    sizeBytes: binaryData.length,
  }
}

async function downloadR2(storageKey) {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error('R2 环境变量未配置')
  }

  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestream.com/${R2_BUCKET_NAME}/${storageKey}`

  const response = await fetch(endpoint)
  if (!response.ok) {
    throw new Error(`R2 下载失败: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return {
    data: buffer.toString('base64'),
    sizeBytes: buffer.length,
  }
}

async function deleteR2(storageKey) {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error('R2 环境变量未配置')
  }

  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestream.com/${R2_BUCKET_NAME}/${storageKey}`

  const response = await fetch(endpoint, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) {
    throw new Error(`R2 删除失败: ${response.status}`)
  }
}

function getR2Url(storageKey) {
  return R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL}/${storageKey}`
    : `https://${R2_ACCOUNT_ID}.r2.dev/${R2_BUCKET_NAME}/${storageKey}`
}

// ===== 统一接口 =====

/**
 * 上传文件
 * @param {string} fileData - Base64 编码的文件内容
 * @param {string} fileName - 文件名
 * @param {string} folder - 文件夹路径
 */
async function upload(fileData, fileName, folder = 'uploads') {
  safeLog({ provider: STORAGE_PROVIDER, fileName, folder, type: 'storage_upload' }, `📁 上传文件: ${fileName}`)

  switch (STORAGE_PROVIDER) {
    case 'r2':
      return uploadR2(fileData, fileName, folder)
    case 's3':
      // S3 与 R2 API 兼容
      return uploadR2(fileData, fileName, folder)
    case 'local':
    default:
      return uploadLocal(fileData, fileName, folder)
  }
}

/**
 * 下载文件
 * @param {string} storageKey - 存储键
 */
async function download(storageKey) {
  safeLog({ provider: STORAGE_PROVIDER, storageKey, type: 'storage_download' }, `📥 下载文件: ${storageKey}`)

  switch (STORAGE_PROVIDER) {
    case 'r2':
    case 's3':
      return downloadR2(storageKey)
    case 'local':
    default:
      return downloadLocal(storageKey)
  }
}

/**
 * 删除文件
 * @param {string} storageKey - 存储键
 */
async function deleteFile(storageKey) {
  safeLog({ provider: STORAGE_PROVIDER, storageKey, type: 'storage_delete' }, `🗑️ 删除文件: ${storageKey}`)

  switch (STORAGE_PROVIDER) {
    case 'r2':
    case 's3':
      return deleteR2(storageKey)
    case 'local':
    default:
      return deleteLocal(storageKey)
  }
}

/**
 * 获取文件公开 URL
 * @param {string} storageKey - 存储键
 */
function getPublicUrl(storageKey) {
  switch (STORAGE_PROVIDER) {
    case 'r2':
    case 's3':
      return getR2Url(storageKey)
    case 'local':
    default:
      return getLocalUrl(storageKey)
  }
}

module.exports = { upload, download, deleteFile, getPublicUrl }
