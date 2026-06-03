import { CATEGORIES } from './storage'

// 后端代理地址：部署到 Vercel 时用相对路径 /api/generate-recipe 即可。
// 如果前端和后端分开部署，可在 .env 里设 VITE_AI_API 指向后端完整地址。
const API_URL = import.meta.env.VITE_AI_API || '/api/generate-recipe'

function uid() {
  return 'r_' + Math.random().toString(36).slice(2, 9)
}

function toInt(value, fallback) {
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : fallback
}

// 把 AI 返回的数据收拾成我们 app 用的标准菜谱结构
export function normalizeRecipe(raw, fallbackName) {
  const r = raw || {}
  const difficulty = Math.min(3, Math.max(1, toInt(r.difficulty, 1)))

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

  const tags = Array.isArray(r.tags)
    ? r.tags.map((t) => t.toString().trim()).filter(Boolean).slice(0, 4)
    : []

  return {
    id: uid(),
    name: (r.name || fallbackName || '').toString().trim() || fallbackName,
    category: CATEGORIES.includes(r.category) ? r.category : '家常菜',
    difficulty,
    time: Math.max(1, toInt(r.time, 20)),
    servings: Math.max(1, toInt(r.servings, 2)),
    status: 'todo',
    tags,
    ingredients: ingredients.length ? ingredients : [{ name: '', amount: '' }],
    steps: steps.length ? steps : [''],
    notes: (r.notes || '').toString(),
    photos: [],
  }
}

export async function generateRecipe(dish) {
  let resp
  try {
    resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dish }),
    })
  } catch {
    throw new Error('连不上 AI 服务，请检查网络或稍后再试')
  }

  let data = {}
  try {
    data = await resp.json()
  } catch {
    // 非 JSON 响应（例如本地 vite 没有后端时返回的 HTML）
  }

  if (!resp.ok) {
    throw new Error(data.error || `生成失败（${resp.status}）`)
  }
  if (!data.recipe) {
    throw new Error('AI 没有返回菜谱，请重试')
  }
  return normalizeRecipe(data.recipe, dish)
}
