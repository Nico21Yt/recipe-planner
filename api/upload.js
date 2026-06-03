// Vercel Serverless Function：把成品照片上传到 Vercel Blob，返回公开 URL。
// 前端会先把图片压缩成 dataURL 再发过来，这里解码后存进 Blob。
//
// 需要的环境变量（在 Vercel 后台创建 Blob 存储后会自动注入）：
//   BLOB_READ_WRITE_TOKEN

import { put } from '@vercel/blob'

// Vercel 给 Blob 连接生成的 token 可能带自定义前缀（如 xxx_READ_WRITE_TOKEN），
// 这里不依赖固定变量名：Blob token 都以 vercel_blob_rw_ 开头，按特征找出来。
function getBlobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN
  for (const v of Object.values(process.env)) {
    if (typeof v === 'string' && v.startsWith('vercel_blob_rw_')) return v
  }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: '只支持 POST' })
    return
  }
  const blobToken = getBlobToken()
  if (!blobToken) {
    res.status(500).json({ error: '服务器未配置 Blob token（请确认 Blob 已连接并 Redeploy）' })
    return
  }

  const dataUrl = (req.body?.dataUrl || '').toString()
  const m = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!m) {
    res.status(400).json({ error: '图片格式不对' })
    return
  }

  const contentType = m[1]
  const ext = contentType.split('/')[1] || 'jpg'
  const buffer = Buffer.from(m[2], 'base64')

  // 上限保护：约 4MB
  if (buffer.length > 4 * 1024 * 1024) {
    res.status(413).json({ error: '图片太大了' })
    return
  }

  try {
    const name = `photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const blob = await put(name, buffer, {
      access: 'public',
      contentType,
      token: blobToken,
    })
    res.status(200).json({ url: blob.url })
  } catch (e) {
    res.status(500).json({ error: '上传失败', detail: String(e).slice(0, 300) })
  }
}
