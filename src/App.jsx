import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CATEGORIES,
  STATUS,
  emptyRecipe,
  exportRecipes,
  importRecipes,
  loadRecipes,
  resetToRepo,
  saveRecipes,
} from './storage'
import RecipeCard from './components/RecipeCard'
import RecipeDetail from './components/RecipeDetail'
import RecipeForm from './components/RecipeForm'
import './App.css'

export default function App() {
  const [recipes, setRecipes] = useState(() => loadRecipes())
  const [view, setView] = useState('list') // list | detail | form
  const [activeId, setActiveId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const importRef = useRef(null)

  useEffect(() => {
    saveRecipes(recipes)
  }, [recipes])

  const active = recipes.find((r) => r.id === activeId) || null

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return recipes.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterCategory !== 'all' && r.category !== filterCategory) return false
      if (!q) return true
      const hay = [
        r.name,
        r.notes,
        ...(r.tags || []),
        ...(r.ingredients || []).map((i) => i.name),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [recipes, search, filterStatus, filterCategory])

  const counts = useMemo(() => {
    const c = { all: recipes.length, todo: 0, doing: 0, done: 0 }
    recipes.forEach((r) => {
      c[r.status] = (c[r.status] || 0) + 1
    })
    return c
  }, [recipes])

  function openDetail(id) {
    setActiveId(id)
    setView('detail')
  }

  function openNew() {
    setActiveId(null)
    setView('form')
  }

  function openEdit(id) {
    setActiveId(id)
    setView('form')
  }

  function handleSave(recipe) {
    setRecipes((prev) => {
      const exists = prev.some((r) => r.id === recipe.id)
      return exists
        ? prev.map((r) => (r.id === recipe.id ? recipe : r))
        : [recipe, ...prev]
    })
    openDetail(recipe.id)
  }

  function handleDelete(id) {
    if (!confirm('确定要删除这道菜吗？')) return
    setRecipes((prev) => prev.filter((r) => r.id !== id))
    setView('list')
  }

  function changeStatus(id, status) {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    )
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await importRecipes(file)
      setRecipes(data)
      alert(`导入成功，共 ${data.length} 道菜`)
    } catch (err) {
      alert('导入失败：' + err.message)
    }
    e.target.value = ''
  }

  function handleReset() {
    if (!confirm('放弃本地修改，恢复为仓库(git)里的版本？')) return
    setRecipes(resetToRepo())
    setView('list')
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => setView('list')}>
          <span className="logo">🍳</span>
          <div>
            <h1>菜谱规划</h1>
            <p>给新手厨师的备菜清单</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn ghost" onClick={() => exportRecipes(recipes)}>
            导出 JSON
          </button>
          <button className="btn ghost" onClick={() => importRef.current?.click()}>
            导入
          </button>
          <button className="btn ghost" onClick={handleReset} title="恢复为 git 仓库里的 recipes.json">
            恢复仓库版
          </button>
          <button className="btn primary" onClick={openNew}>
            ＋ 新菜谱
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            hidden
            onChange={handleImport}
          />
        </div>
      </header>

      {view === 'list' && (
        <main className="content">
          <div className="toolbar">
            <input
              className="search"
              placeholder="搜索菜名 / 食材 / 标签…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="filters">
              <div className="chip-group">
                <Chip active={filterStatus === 'all'} onClick={() => setFilterStatus('all')}>
                  全部 {counts.all}
                </Chip>
                {Object.entries(STATUS).map(([key, s]) => (
                  <Chip
                    key={key}
                    active={filterStatus === key}
                    onClick={() => setFilterStatus(key)}
                    color={s.color}
                  >
                    {s.label} {counts[key] || 0}
                  </Chip>
                ))}
              </div>
              <select
                className="select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">全部分类</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              <p>还没有菜谱</p>
              <button className="btn primary" onClick={openNew}>
                添加第一道菜
              </button>
            </div>
          ) : (
            <div className="grid">
              {filtered.map((r) => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  onClick={() => openDetail(r.id)}
                  onStatusChange={(s) => changeStatus(r.id, s)}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {view === 'detail' && active && (
        <RecipeDetail
          recipe={active}
          onBack={() => setView('list')}
          onEdit={() => openEdit(active.id)}
          onDelete={() => handleDelete(active.id)}
          onStatusChange={(s) => changeStatus(active.id, s)}
        />
      )}

      {view === 'form' && (
        <RecipeForm
          initial={active || emptyRecipe()}
          onCancel={() => setView(active ? 'detail' : 'list')}
          onSave={handleSave}
        />
      )}

      <footer className="foot">
        数据保存在浏览器本地。点「导出 JSON」下载后替换仓库里的{' '}
        <code>src/data/recipes.json</code> 并提交，即可通过 git 同步。
      </footer>
    </div>
  )
}

function Chip({ active, onClick, color, children }) {
  return (
    <button
      className={'chip' + (active ? ' active' : '')}
      onClick={onClick}
      style={active && color ? { borderColor: color, color } : undefined}
    >
      {children}
    </button>
  )
}
