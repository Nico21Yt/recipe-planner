// Vercel Serverless Function：把成品照片上传到 Vercel Blob，返回公开 URL。
// 前端会先把图片压缩成 dataURL 再发过来，这里解码后存进 Blob。
//
// 需要的环境变量（在 Vercel 后台创建 Blob 存储后会自动注入）：
//   BLOB_READ_WRITE_TOKEN

import { put } from '@vercel/blob'

// Blob 鉴权两种方式都支持：
// 1) 静态 token（BLOB_READ_WRITE_TOKEN 或以 vercel_blob_rw_ 开头的变量）
// 2) 新版 OIDC（仅有 BLOB_STORE_ID，运行时自动注入 OIDC 凭证）——无需 token
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
    const opts = { access: 'public', contentType }
    if (blobToken) opts.token = blobToken // 没有静态 token 时走 OIDC
    const blob = await put(name, buffer, opts)
    res.status(200).json({ url: blob.url })
  } catch (e) {
    res.status(500).json({ error: '上传失败', detail: String(e).slice(0, 300) })
  }
}
