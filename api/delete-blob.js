// Vercel Serverless Function：删除照片时同步删除 Vercel Blob 上的文件。
// 前端传入照片的公开 URL，这里调用 del() 移除，避免云端残留垃圾文件。

import { del } from '@vercel/blob'

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

  const url = (req.body?.url || '').toString()
  // 只处理 Vercel Blob 上的文件；本地 dataURL 等直接忽略。
  if (!url || !url.includes('blob.vercel-storage.com')) {
    res.status(200).json({ ok: true, skipped: true })
    return
  }

  try {
    const blobToken = getBlobToken()
    const opts = {}
    if (blobToken) opts.token = blobToken
    await del(url, opts)
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: '删除失败', detail: String(e).slice(0, 300) })
  }
}
