import { normalizeStatus } from './storage'

// 后端代理地址：部署到 Vercel 时用相对路径 /api/generate-recipe 即可。
// 如果前端和后端分开部署，可在 .env 里设 VITE_AI_API 指向后端完整地址。
const API_URL = import.meta.env.VITE_AI_API || '/api/generate-recipe'
const MODIFY_API_URL =
  import.meta.env.VITE_AI_MODIFY_API || '/api/modify-recipe'

function uid() {
  return 'r_' + Math.random().toString(36).slice(2, 9)
}

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

  return {
    id: uid(),
    name: (r.name || fallbackName || '').toString().trim() || fallbackName,
    status: 'todo',
    favorite: false,
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

export async function modifyRecipe(existing, instruction) {
  const raw = await postAiJson(MODIFY_API_URL, {
    instruction: instruction.trim(),
    recipe: {
      name: existing.name,
      ingredients: existing.ingredients,
      steps: existing.steps,
      notes: existing.notes,
    },
  })
  const patch = normalizeRecipe(raw, existing.name)
  return {
    ...existing,
    name: patch.name,
    ingredients: patch.ingredients,
    steps: patch.steps,
    notes: patch.notes,
    status: normalizeStatus(existing.status),
  }
}
