import seed from './data/recipes.json'

const STORAGE_KEY = 'recipe-planner.recipes.v1'
const PLANS_KEY = 'recipe-planner.plans.v1'

export const CATEGORIES = ['家常菜', '汤羹', '主食', '甜点', '凉菜', '早餐', '其他']

export const STATUS = {
  todo: { label: '想试', color: '#f59e0b' },
  doing: { label: '正在做', color: '#3b82f6' },
  done: { label: '做过', color: '#22c55e' },
}

export const DIFFICULTY = {
  1: '简单',
  2: '适中',
  3: '有挑战',
}

function uid() {
  return 'r_' + Math.random().toString(36).slice(2, 9)
}

// 读取：优先用浏览器本地编辑过的数据，否则用仓库里的种子数据
export function loadRecipes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // 解析失败则回退到种子数据
  }
  return structuredClone(seed)
}

export function saveRecipes(recipes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
    return { ok: true }
  } catch (e) {
    // 多为照片过多导致浏览器存储空间不足（QuotaExceededError）
    return { ok: false, error: e }
  }
}

// 放弃本地的文字修改，重新加载仓库（git）里的版本；
// 但会按菜的 id 保留已拍的成品照片，避免误删记录
export function resetToRepo(current = []) {
  const photoMap = {}
  current.forEach((r) => {
    if (r.photos?.length) photoMap[r.id] = r.photos
  })
  const fresh = structuredClone(seed).map((r) => ({
    ...r,
    photos: photoMap[r.id] || r.photos || [],
  }))
  localStorage.removeItem(STORAGE_KEY)
  return fresh
}

export function emptyRecipe() {
  return {
    id: uid(),
    name: '',
    category: '家常菜',
    difficulty: 1,
    time: 20,
    servings: 2,
    status: 'todo',
    tags: [],
    ingredients: [{ name: '', amount: '' }],
    steps: [''],
    notes: '',
    photos: [],
  }
}

// 把上传的图片压缩缩放后转成 dataURL，避免照片过大占满浏览器存储
export function readPhoto(file, maxSize = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('图片读取失败'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve({
          id: 'p_' + Math.random().toString(36).slice(2, 9),
          src: canvas.toDataURL('image/jpeg', quality),
          date: new Date().toISOString(),
          caption: '',
        })
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// 导出为 recipes.json 文件，用户提交到 git 即可同步
export function exportRecipes(recipes) {
  const blob = new Blob([JSON.stringify(recipes, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'recipes.json'
  a.click()
  URL.revokeObjectURL(url)
}

/* ============== 用餐计划（明天吃什么 / 做饭日记） ============== */

export function loadPlans() {
  try {
    const raw = localStorage.getItem(PLANS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // 忽略解析错误
  }
  return []
}

export function savePlans(plans) {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e }
  }
}

export function emptyPlan(date) {
  return {
    id: 'pl_' + Math.random().toString(36).slice(2, 9),
    date,
    dishes: [],
  }
}

export function makeDish(name, recipeId = null) {
  return {
    id: 'd_' + Math.random().toString(36).slice(2, 9),
    name: name.trim(),
    recipeId,
  }
}

/* ---------- 日期工具 ---------- */

// 本地时区的 YYYY-MM-DD
export function toDayStr(d = new Date()) {
  return d.toLocaleDateString('sv-SE') // sv-SE 输出形如 2026-06-03
}

export function todayStr() {
  return toDayStr()
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDayStr(d)
}

// 把任意时间戳（ISO 或日期字符串）归一到本地“某一天”
export function dayOf(value) {
  if (!value) return ''
  const d = new Date(value)
  return isNaN(d) ? String(value).slice(0, 10) : toDayStr(d)
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function weekdayCN(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return isNaN(d) ? '' : WEEKDAYS[d.getDay()]
}

// 今天/明天/后天/昨天 等相对说法
export function relativeDay(dateStr) {
  const today = todayStr()
  if (dateStr === today) return '今天'
  if (dateStr === addDays(today, 1)) return '明天'
  if (dateStr === addDays(today, 2)) return '后天'
  if (dateStr === addDays(today, -1)) return '昨天'
  return ''
}

// 形如 6月3日
export function formatMD(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d)) return dateStr
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function importRecipes(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (!Array.isArray(data)) throw new Error('文件格式不正确')
        resolve(data)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
