import { CATEGORIES, cleanTags } from './storage'

// 后端代理地址：部署到 Vercel 时用相对路径 /api/generate-recipe 即可。
// 如果前端和后端分开部署，可在 .env 里设 VITE_AI_API 指向后端完整地址。
const API_URL = import.meta.env.VITE_AI_API || '/api/generate-recipe'
const MODIFY_API_URL =
  import.meta.env.VITE_AI_MODIFY_API || '/api/modify-recipe'

function uid() {
  return 'r_' + Math.random().toString(36).slice(2, 9)
}

// 把 AI 返回的数据收拾成我们 app 用的标准菜谱结构
export function normalizeRecipe(raw, fallbackName) {
  const r = raw || {}

  const ingredients = Array.isArray(r.ingredients)
    ? r.ingredients
        .map((i) =>
          typeof i === 'string'
            ? { name: i, amount: '' }
            : { name: (i?.name || '').toString(), amount: (i?.amount || '').toString() },
        )
        .filter((i) => i.name.trim())
    : []

  const steps = Array.isArray(r.steps)
    ? r.steps.map((s) => s.toString().trim()).filter(Boolean)
    : []

  const tags = cleanTags(
    Array.isArray(r.tags)
      ? r.tags.map((t) => t.toString().trim()).filter(Boolean).slice(0, 4)
      : [],
  )

  return {
    id: uid(),
    name: (r.name || fallbackName || '').toString().trim() || fallbackName,
    category: CATEGORIES.includes(r.category) ? r.category : '家常菜',
    status: 'todo',
    favorite: false,
    tags,
    ingredients: ingredients.length ? ingredients : [{ name: '', amount: '' }],
    steps: steps.length ? steps : [''],
    notes: (r.notes || '').toString(),
    photos: [],
  }
}

export async function generateRecipe(dish) {
  const raw = await postAiJson(API_URL, { dish })
  return normalizeRecipe(raw, dish)
}

async function postAiJson(url, body) {
  let resp
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('连不上 AI 服务，请检查网络或稍后再试')
  }

  let data = {}
  try {
    data = await resp.json()
  } catch {
    // 非 JSON（例如本地 vite 无后端时返回 HTML）
  }

  if (!resp.ok) {
    throw new Error(data.error || `请求失败（${resp.status}）`)
  }
  if (!data.recipe) {
    throw new Error('AI 没有返回菜谱，请重试')
  }
  return data.recipe
}

/** 按用户说明修改现有菜谱，保留 id / 照片 / 收藏等字段 */
export async function modifyRecipe(existing, instruction) {
  const raw = await postAiJson(MODIFY_API_URL, {
    instruction: instruction.trim(),
    recipe: {
      name: existing.name,
      category: existing.category,
      tags: existing.tags,
      ingredients: existing.ingredients,
      steps: existing.steps,
      notes: existing.notes,
    },
  })
  const patch = normalizeRecipe(raw, existing.name)
  return {
    ...existing,
    name: patch.name,
    category: patch.category,
    tags: patch.tags,
    ingredients: patch.ingredients,
    steps: patch.steps,
    notes: patch.notes,
  }
}
