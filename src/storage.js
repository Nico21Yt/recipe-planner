export const CATEGORIES = ['家常菜', '汤羹', '主食', '甜点', '凉菜', '早餐', '其他']

const EXCLUDED_TAGS = new Set(['新手友好'])

export function cleanTags(tags) {
  return (tags || []).filter((t) => t && !EXCLUDED_TAGS.has(String(t).trim()))
}

export const STATUS = {
  todo: { label: '想试', color: '#cf9a2c' },
  done: { label: '做过', color: '#3c6e47' },
}

export function normalizeStatus(status) {
  if (status === 'doing') return 'todo'
  return STATUS[status] ? status : 'todo'
}

export function cleanRecipe(recipe) {
  if (!recipe) return recipe
  return {
    ...recipe,
    tags: cleanTags(recipe.tags),
    status: normalizeStatus(recipe.status),
  }
}

function uid() {
  return 'r_' + Math.random().toString(36).slice(2, 9)
}

export function emptyRecipe() {
  return {
    id: uid(),
    name: '',
    category: '家常菜',
    status: 'todo',
    favorite: false,
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

/* ============== 用餐计划（明天吃什么 / 做饭日记） ============== */

export function emptyPlan(date) {
  return {
    id: 'pl_' + Math.random().toString(36).slice(2, 9),
    date,
    dishes: [],
    chefNote: '',
  }
}

export function normalizePrep(prep) {
  const checked = Array.isArray(prep?.checked)
    ? [...new Set(prep.checked.filter((n) => Number.isInteger(n) && n >= 0))]
    : []
  return { checked }
}

export function normalizeDish(dish) {
  if (!dish) return dish
  return {
    ...dish,
    name: (dish.name || '').trim(),
    prep: normalizePrep(dish.prep),
  }
}

export function normalizePlan(plan) {
  if (!plan) return plan
  return {
    ...plan,
    chefNote: plan.chefNote ?? '',
    dishes: (plan.dishes || []).map(normalizeDish),
  }
}

export function normalizePlans(plans) {
  return (plans || []).map(normalizePlan)
}

export function makeDish(name, recipeId = null) {
  return {
    id: 'd_' + Math.random().toString(36).slice(2, 9),
    name: name.trim(),
    recipeId,
    prep: normalizePrep(null),
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
