import seed from './data/recipes.json'

const STORAGE_KEY = 'recipe-planner.recipes.v1'

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
}

// 放弃本地修改，重新加载仓库（git）里的版本
export function resetToRepo() {
  localStorage.removeItem(STORAGE_KEY)
  return structuredClone(seed)
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
  }
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
