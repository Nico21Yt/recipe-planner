import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, STATUS, emptyRecipe } from './storage'
import RecipeCard from './components/RecipeCard'
import RecipeDetail from './components/RecipeDetail'
import RecipeForm from './components/RecipeForm'
import MealPlan from './components/MealPlan'
import Diary from './components/Diary'
import Home from './components/Home'
import { generateRecipe } from './ai'
import { fetchData, saveData } from './cloud'
import './App.css'

const TABS = [
  { id: 'recipes', label: '菜谱', icon: '📖' },
  { id: 'plan', label: '明天吃什么', icon: '📅' },
  { id: 'diary', label: '做饭日记', icon: '📔' },
]

export default function App() {
  const [tab, setTab] = useState('home')
  const [recipes, setRecipes] = useState([])
  const [plans, setPlans] = useState([])
  const [view, setView] = useState('list') // list | detail | form
  const [activeId, setActiveId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [genInput, setGenInput] = useState('')
  const [genBusy, setGenBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const loadedRef = useRef(false)
  const saveTimer = useRef(null)

  const doFetch = useCallback(() => {
    return fetchData()
      .then(({ recipes, plans }) => {
        setRecipes(recipes)
        setPlans(plans)
        setLoadError(null)
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => {
        setLoading(false)
        loadedRef.current = true
      })
  }, [])

  function retryLoad() {
    setLoading(true)
    setLoadError(null)
    doFetch()
  }

  useEffect(() => {
    doFetch()
  }, [doFetch])

  // 任意改动后，防抖保存整份数据到云端
  useEffect(() => {
    if (!loadedRef.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveState('saving')
    saveTimer.current = setTimeout(() => {
      saveData({ recipes, plans })
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'))
    }, 600)
    return () => saveTimer.current && clearTimeout(saveTimer.current)
  }, [recipes, plans])

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

  function openRecipeFromTab(id) {
    setTab('recipes')
    openDetail(id)
  }

  async function handleGenerate(name) {
    const dish = name.trim()
    if (!dish || genBusy) return null
    setGenBusy(true)
    try {
      const recipe = await generateRecipe(dish)
      setRecipes((prev) => [recipe, ...prev])
      return recipe
    } catch (e) {
      alert('AI 生成失败：' + e.message)
      return null
    } finally {
      setGenBusy(false)
    }
  }

  async function generateAndOpen() {
    const r = await handleGenerate(genInput)
    if (r) {
      setGenInput('')
      openDetail(r.id)
    }
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

  function updateRecipe(id, patch) {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div
          className="brand"
          onClick={() => {
            setTab('home')
            setView('list')
          }}
        >
          <span className="logo">🍳</span>
          <div>
            <h1>菜谱规划</h1>
            <p>给新手厨师的备菜清单</p>
          </div>
        </div>

        {tab !== 'home' && (
          <nav className="tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={'tab' + (tab === t.id ? ' active' : '')}
                onClick={() => {
                  setTab(t.id)
                  if (t.id === 'recipes') setView('list')
                }}
              >
                <span className="tab-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        )}

      </header>

      {loading && (
        <main className="content state-screen">
          <div className="spinner" />
          <p>正在从云端加载…</p>
        </main>
      )}

      {!loading && loadError && (
        <main className="content state-screen">
          <p className="state-error">😕 加载失败：{loadError}</p>
          <button className="btn primary" onClick={retryLoad}>
            重试
          </button>
        </main>
      )}

      {!loading && !loadError && tab === 'home' && (
        <Home
          recipes={recipes}
          plans={plans}
          onPick={(id) => {
            setTab(id)
            if (id === 'recipes') setView('list')
          }}
        />
      )}

      {!loading && !loadError && tab === 'plan' && (
        <MealPlan
          plans={plans}
          recipes={recipes}
          onChange={setPlans}
          onOpenRecipe={openRecipeFromTab}
          onGenerateRecipe={handleGenerate}
        />
      )}

      {!loading && !loadError && tab === 'diary' && (
        <Diary plans={plans} recipes={recipes} onOpenRecipe={openRecipeFromTab} />
      )}

      {!loading && !loadError && tab === 'recipes' && view === 'list' && (
        <main className="content">
          <div className="section-head">
            <div>
              <h2>我的菜谱</h2>
              <p className="section-sub">输入菜名，AI 帮你生成新手菜谱。</p>
            </div>
          </div>

          <div className="ai-bar">
            <input
              className="dish-input"
              placeholder="想做什么菜？输入菜名，如 麻婆豆腐…"
              value={genInput}
              disabled={genBusy}
              onChange={(e) => setGenInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  generateAndOpen()
                }
              }}
            />
            <button
              className="btn primary"
              onClick={generateAndOpen}
              disabled={genBusy || !genInput.trim()}
            >
              {genBusy ? 'AI 生成中…' : '✨ AI 生成菜谱'}
            </button>
          </div>

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
              <p>还没有菜谱，在上面输入菜名让 AI 帮你生成第一道吧！</p>
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

      {!loading && !loadError && tab === 'recipes' && view === 'detail' && active && (
        <RecipeDetail
          recipe={active}
          onBack={() => setView('list')}
          onEdit={() => openEdit(active.id)}
          onDelete={() => handleDelete(active.id)}
          onStatusChange={(s) => changeStatus(active.id, s)}
          onPhotosChange={(photos) => updateRecipe(active.id, { photos })}
        />
      )}

      {!loading && !loadError && tab === 'recipes' && view === 'form' && (
        <RecipeForm
          initial={active || emptyRecipe()}
          onCancel={() => setView(active ? 'detail' : 'list')}
          onSave={handleSave}
        />
      )}

      <footer className="foot">
        🍳 菜谱规划 · 云端共享数据
        {saveState === 'saving' && <span className="sync"> · 保存中…</span>}
        {saveState === 'saved' && <span className="sync ok"> · 已同步</span>}
        {saveState === 'error' && (
          <span className="sync err"> · 保存失败，请检查网络</span>
        )}
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
