import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { STATUS, cleanRecipe, emptyRecipe, normalizePlans } from './storage'
import RecipeCard from './components/RecipeCard'
import RecipeDetail from './components/RecipeDetail'
import RecipeForm from './components/RecipeForm'
import MealPlan from './components/MealPlan'
import PlanDishDetail from './components/PlanDishDetail'
import Diary from './components/Diary'
import Home from './components/Home'
import { generateRecipe, modifyRecipe } from './ai'
import { fetchData, saveData, CLIENT_ID } from './cloud'
import { useUI } from './ui-context'
import { APP_VERSION } from './version'
import './App.css'

const TABS = [
  { id: 'recipes', label: '菜谱', short: '菜谱' },
  { id: 'plan', label: '明天吃什么', short: '吃什么' },
  { id: 'diary', label: '做饭日记', short: '日记' },
]

export default function App() {
  const { toast, confirm } = useUI()
  const [tab, setTab] = useState('home')
  const [recipes, setRecipes] = useState([])
  const [plans, setPlans] = useState([])
  const [view, setView] = useState('list') // list | detail | form
  const [activeId, setActiveId] = useState(null)
  const [planDish, setPlanDish] = useState(null) // { date, dishId }
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [genInput, setGenInput] = useState('')
  const [genBusy, setGenBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [hasUpdate, setHasUpdate] = useState(false) // 云端有他人的新改动
  const loadedRef = useRef(false)
  const saveTimer = useRef(null)
  const knownUpdatedAt = useRef(0)

  const applyRemote = useCallback(({ recipes, plans, updatedAt }) => {
    setRecipes(recipes.map(cleanRecipe))
    setPlans(normalizePlans(plans))
    setLoadError(null)
    knownUpdatedAt.current = updatedAt
    setHasUpdate(false)
  }, [])

  const doFetch = useCallback(() => {
    return fetchData()
      .then(applyRemote)
      .catch((e) => setLoadError(e.message))
      .finally(() => {
        setLoading(false)
        loadedRef.current = true
      })
  }, [applyRemote])

  const refreshFromCloud = useCallback(() => {
    return fetchData()
      .then((data) => {
        applyRemote(data)
        toast('已更新到最新', 'success', 2200)
      })
      .catch((e) => {
        toast('刷新失败：' + e.message, 'error', 3500)
        throw e
      })
  }, [applyRemote, toast])

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
        .then((updatedAt) => {
          setSaveState('saved')
          knownUpdatedAt.current = updatedAt
        })
        .catch(() => setSaveState('error'))
    }, 600)
    return () => saveTimer.current && clearTimeout(saveTimer.current)
  }, [recipes, plans])

  // 定时轮询：发现别人改了云端，就提示刷新（不强行覆盖正在编辑的内容）
  useEffect(() => {
    const id = setInterval(() => {
      if (!loadedRef.current) return
      fetchData()
        .then((remote) => {
          if (
            remote.updatedAt > knownUpdatedAt.current &&
            remote.clientId !== CLIENT_ID
          ) {
            setHasUpdate(true)
          }
        })
        .catch(() => {})
    }, 25000)
    return () => clearInterval(id)
  }, [])

  const active = recipes.find((r) => r.id === activeId) || null

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return recipes
      .filter((r) => {
        if (filterStatus !== 'all' && r.status !== filterStatus) return false
        if (!q) return true
        const hay = [
          r.name,
          r.notes,
          ...(r.ingredients || []).map((i) => i.name),
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => {
        const aTodo = a.status === 'todo' ? 1 : 0
        const bTodo = b.status === 'todo' ? 1 : 0
        if (bTodo !== aTodo) return bTodo - aTodo
        return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)
      })
  }, [recipes, search, filterStatus])

  const counts = useMemo(() => {
    const c = { all: recipes.length, todo: 0, done: 0 }
    recipes.forEach((r) => {
      if (r.status === 'todo' || r.status === 'done') c[r.status]++
    })
    return c
  }, [recipes])

  function openDetail(id) {
    setActiveId(id)
    setView('detail')
  }

  function openRecipeFromTab(id) {
    setPlanDish(null)
    setTab('recipes')
    openDetail(id)
  }

  function openPlanDish({ date, dishId }) {
    setTab('plan')
    setPlanDish({ date, dishId })
  }

  const planDishCtx = useMemo(() => {
    if (!planDish) return null
    const plan = plans.find((p) => p.date === planDish.date)
    const dish = plan?.dishes?.find((d) => d.id === planDish.dishId)
    if (!dish) return null
    const recipe = dish.recipeId
      ? recipes.find((r) => r.id === dish.recipeId) || null
      : null
    return { date: planDish.date, dish, recipe }
  }, [planDish, plans, recipes])

  function updateDishPrep(date, dishId, prep) {
    setPlans((prev) =>
      prev.map((p) =>
        p.date === date
          ? {
              ...p,
              dishes: p.dishes.map((d) =>
                d.id === dishId ? { ...d, prep } : d,
              ),
            }
          : p,
      ),
    )
  }

  async function handleAiModify(instruction) {
    if (!active) return
    const updated = await modifyRecipe(active, instruction)
    setRecipes((prev) =>
      prev.map((r) => (r.id === active.id ? updated : r)),
    )
  }

  async function handleGenerate(name) {
    const dish = name.trim()
    if (!dish || genBusy) return null
    setGenBusy(true)
    try {
      const recipe = await generateRecipe(dish)
      setRecipes((prev) => [recipe, ...prev])
      toast('已生成「' + recipe.name + '」', 'success')
      return recipe
    } catch (e) {
      toast('AI 生成失败：' + e.message, 'error', 4000)
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
    const cleaned = cleanRecipe(recipe)
    setRecipes((prev) => {
      const exists = prev.some((r) => r.id === cleaned.id)
      return exists
        ? prev.map((r) => (r.id === cleaned.id ? cleaned : r))
        : [cleaned, ...prev]
    })
    openDetail(cleaned.id)
  }

  async function handleDelete(id) {
    const ok = await confirm('确定要删除这道菜吗？', { danger: true, confirmText: '删除' })
    if (!ok) return
    setRecipes((prev) => prev.filter((r) => r.id !== id))
    setView('list')
    toast('已删除', 'info')
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

  function updateRecipePhotos(id, photosOrFn) {
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const photos =
          typeof photosOrFn === 'function'
            ? photosOrFn(r.photos || [])
            : photosOrFn
        return { ...r, photos }
      }),
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
            setPlanDish(null)
          }}
        >
          <span className="logo">灶</span>
          <div>
            <div className="brand-title-row">
              <h1>Nico的小厨房</h1>
              <span className="app-version" title="应用版本">
                v{APP_VERSION}
              </span>
            </div>
            <p>备菜 · 计划 · 记录</p>
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
                  setPlanDish(null)
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}

      </header>

      {hasUpdate && (
        <button className="update-banner" onClick={() => doFetch()}>
          有新的改动，点击刷新查看
        </button>
      )}

      {loading && (
        <main className="content state-screen">
          <div className="spinner" />
          <p>正在从云端加载…</p>
        </main>
      )}

      {!loading && loadError && (
        <main className="content state-screen">
          <p className="state-error">加载失败：{loadError}</p>
          <button className="btn primary" onClick={retryLoad}>
            重试
          </button>
        </main>
      )}

      {!loading && !loadError && tab === 'home' && (
        <Home
          recipes={recipes}
          plans={plans}
          onRefresh={refreshFromCloud}
          onPick={(id) => {
            setTab(id)
            if (id === 'recipes') setView('list')
          }}
        />
      )}

      {!loading && !loadError && tab === 'plan' && planDishCtx && (
        <PlanDishDetail
          date={planDishCtx.date}
          dish={planDishCtx.dish}
          recipe={planDishCtx.recipe}
          onBack={() => setPlanDish(null)}
          onPrepChange={(prep) =>
            updateDishPrep(planDishCtx.date, planDishCtx.dish.id, prep)
          }
          onPhotosChange={(photos) => {
            if (planDishCtx.recipe) {
              updateRecipePhotos(planDishCtx.recipe.id, photos)
            }
          }}
        />
      )}

      {!loading && !loadError && tab === 'plan' && !planDishCtx && (
        <MealPlan
          plans={plans}
          recipes={recipes}
          onChange={setPlans}
          onOpenDish={openPlanDish}
          onGenerateRecipe={handleGenerate}
        />
      )}

      {!loading && !loadError && tab === 'diary' && (
        <Diary
          plans={plans}
          recipes={recipes}
          onOpenPlanDish={openPlanDish}
          onOpenRecipe={openRecipeFromTab}
        />
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
              className="btn accent"
              onClick={generateAndOpen}
              disabled={genBusy || !genInput.trim()}
            >
              {genBusy ? 'AI 生成中…' : 'AI 生成菜谱'}
            </button>
          </div>

          <div className="toolbar">
            <input
              className="search"
              placeholder="搜索菜名 / 食材…"
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
            </div>
          </div>

          {filtered.length === 0 && !genBusy ? (
            <div className="empty">
              <p>还没有菜谱，在上面输入菜名让 AI 帮你生成第一道吧！</p>
            </div>
          ) : (
            <div className="grid">
              {genBusy && <SkeletonCard />}
              {filtered.map((r) => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  onClick={() => openDetail(r.id)}
                  onStatusChange={(s) => changeStatus(r.id, s)}
                  onToggleFavorite={() =>
                    updateRecipe(r.id, { favorite: !r.favorite })
                  }
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
          onPhotosChange={(photos) => updateRecipePhotos(active.id, photos)}
          onAiModify={handleAiModify}
        />
      )}

      {!loading && !loadError && tab === 'recipes' && view === 'form' && (
        <RecipeForm
          initial={active || emptyRecipe()}
          onCancel={() => setView(active ? 'detail' : 'list')}
          onSave={handleSave}
        />
      )}

      <nav className="bottom-nav" aria-label="主导航">
        <div className="bottom-nav-inner">
          {[{ id: 'home', short: '首页' }, ...TABS].map((t) => (
            <button
              key={t.id}
              className={'bn-item' + (tab === t.id ? ' active' : '')}
              onClick={() => {
                setTab(t.id)
                if (t.id === 'recipes') setView('list')
                setPlanDish(null)
              }}
            >
              <span className="bn-label">{t.short}</span>
            </button>
          ))}
        </div>
      </nav>

      <footer className="foot">
        Nico的小厨房 · 云端共享数据
        {saveState === 'saving' && <span className="sync"> · 保存中…</span>}
        {saveState === 'saved' && <span className="sync ok"> · 已同步</span>}
        {saveState === 'error' && (
          <span className="sync err"> · 保存失败，请检查网络</span>
        )}
      </footer>
    </div>
  )
}

function SkeletonCard() {
  return (
    <article className="card skeleton">
      <div className="sk-line sk-badge" />
      <div className="sk-line sk-title" />
      <div className="sk-line sk-meta" />
      <p className="sk-hint">AI 正在生成菜谱…</p>
    </article>
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
