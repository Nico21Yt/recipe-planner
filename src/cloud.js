// 前端读写云端的封装。所有人共享同一份数据（菜谱 + 计划），
// 因此谁打开都能看到、也都能修改同一份内容。

const DATA_URL = import.meta.env.VITE_DATA_API || '/api/data'
const UPLOAD_URL = import.meta.env.VITE_UPLOAD_API || '/api/upload'
const DELETE_URL = import.meta.env.VITE_DELETE_API || '/api/delete-blob'

// 本次会话的随机标识，用来判断「云端更新是不是自己刚保存的」
export const CLIENT_ID = Math.random().toString(36).slice(2)

export async function fetchData() {
  let resp
  try {
    resp = await fetch(DATA_URL)
  } catch {
    throw new Error('连不上云端，请检查网络或稍后再试')
  }
  let data
  try {
    data = await resp.json()
  } catch {
    throw new Error('云端返回的数据无法解析')
  }
  if (!resp.ok) {
    throw new Error(data.error || `读取失败（${resp.status}）`)
  }
  return {
    recipes: Array.isArray(data.recipes) ? data.recipes : [],
    plans: Array.isArray(data.plans) ? data.plans : [],
    pantry: Array.isArray(data.pantry) ? data.pantry : [],
    updatedAt: data.updatedAt || 0,
    clientId: data.clientId || '',
  }
}

export async function saveData({ recipes, plans, pantry }) {
  const updatedAt = Date.now()
  const resp = await fetch(DATA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipes,
      plans,
      pantry: pantry ?? [],
      updatedAt,
      clientId: CLIENT_ID,
    }),
  })
  if (!resp.ok) {
    let msg = `保存失败（${resp.status}）`
    try {
      const d = await resp.json()
      if (d.error) msg = d.error
    } catch {
      // ignore
    }
    throw new Error(msg)
  }
  return updatedAt
}

// 上传一张压缩好的 dataURL 图片，返回云端公开 URL
export async function uploadPhoto(dataUrl) {
  const resp = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  })
  let data = {}
  try {
    data = await resp.json()
  } catch {
    // ignore
  }
  if (!resp.ok || !data.url) {
    const msg = data.error || `上传失败（${resp.status}）`
    throw new Error(data.detail ? `${msg}（${data.detail}）` : msg)
  }
  return data.url
}

// 删除照片时顺手删掉云端 Blob 文件，失败也不阻塞用户操作。
export async function deletePhotoBlob(url) {
  if (!url || !url.includes('blob.vercel-storage.com')) return
  try {
    await fetch(DELETE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  } catch {
    // 删除失败仅留下一个孤儿文件，不影响使用
  }
}
