// 前端读写云端的封装。所有人共享同一份数据（菜谱 + 计划），
// 因此谁打开都能看到、也都能修改同一份内容。

const DATA_URL = import.meta.env.VITE_DATA_API || '/api/data'
const UPLOAD_URL = import.meta.env.VITE_UPLOAD_API || '/api/upload'

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
  }
}

export async function saveData({ recipes, plans }) {
  const resp = await fetch(DATA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipes, plans }),
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
  return true
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
