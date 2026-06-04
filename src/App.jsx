import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { STATUS, cleanRecipe, emptyRecipe } from './storage'
import RecipeCard from './components/RecipeCard'
import RecipeDetail from './components/RecipeDetail'
import Home from './components/Home'
import PageHeader from './components/PageHeader'
import WeChatBanner from './components/WeChatBanner'
import { generateRecipe, modifyRecipe } from './ai'
import { fetchData } from './cloud'
import { useUI } from './ui-context'
import { applyAppUpdateIfNeeded } from './appUpdate'
import { APP_VERSION } from './version'
import { useKitchenData } from './hooks/useKitchenData'
import './App.css'

const MealPlan = lazy(() => import('./components/MealPlan'))
const PlanDishDetail = lazy(() => import('./components/PlanDishDetail'))
const Pantry = lazy(() => import('./components/Pantry'))
const Diary = lazy(() => import('./components/Diary'))
const RecipeForm = lazy(() => import('./components/RecipeForm'))

const TABS = [
  { id: 'recipes', label: '菜谱', short: '菜谱' },
  { id: 'plan', label: '吃什么', short: '吃什么' },
  { id: 'pantry', label: '有什么', short: '有什么' },
  { id: 'diary', label: '做饭日记', short: '日记' },
]

const BRAND = 'Nico的小厨房'

function TabFallback() {
  return (
    <main className="content state-screen">
      <div className="spinner" />
    </main>
  )
}

export default function App() {
  const { toast, confirm } = useUI()
  const {
    recipes,
    setRecipes,
    plans,
    setPlans,
    pantry,
    setPantry,
    loading,
    loadError,
    saveState,
    hasUpdate,
    doFetch,
    applyRemote,
    retryLoad,
  } = useKitchenData()

  const [tab, setTab] = useState('home')
  const [view, setView] = useState('list')
  const [activeId, setActiveId] = useState(null)
  const [planDish, setPlanDish] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [genInput, setGenInput] = useState('')
  const [genBusy, setGenBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const lastRefreshToastAt = useRef(0)
  const REFRESH_TOAST_GAP_MS = 8000

  const refreshFromCloud = useCallback(async () => {
    setSyncing(true)
    try {
      const data = await fetchData()
      applyRemote(data)

      const reloading = await applyAppUpdateIfNeeded()
      if (reloading) {
        toast('发现新版本，正在更新…', 'info', 1600)
        return
      }

      const now = Date.now()
      if (now - lastRefreshToastAt.current >= REFRESH_TOAST_GAP_MS) {
        lastRefreshToastAt.current = now
        toast('已同步到最新', 'success', 2200)
      }
    } catch (e) {
      toast('同步失败：' + e.message, 'error', 3500)
      throw e
    } finally {
      setSyncing(false)
    }
  }, [applyRemote, toast])

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
    const ok = await confirm('确定要删除这道菜吗？', {
      danger: true,
      confirmText: '删除',
    })
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

  const mobileSaveHint =
    saveState === 'saving'
      ? '保存中'
      : saveState === 'error'
        ? '保存失败'
        : ''

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
          <span className="logo">N</span>
          <div>
            <div className="brand-title-row">
              <h1>{BRAND}</h1>
              <span className="app-version" title="应用版本">
                v{APP_VERSION}
              </span>
            </div>
            <p>备菜 · 计划 · 记录</p>
          </div>
        </div>

        <div className="topbar-actions">
          {tab !== 'home' && (
            <nav className="tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
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
        </div>
      </header>

      <WeChatBanner />

      {hasUpdate && !loading && !loadError && (
        <button
          type="button"
          className="update-banner"
          disabled={syncing}
          onClick={() => refreshFromCloud().catch(() => {})}
        >
          云端有更新，点击同步数据与版本
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
          <button type="button" className="btn primary" onClick={retryLoad}>
            重试
          </button>
        </main>
      )}

      {!loading && !loadError && tab === 'home' && (
        <Home
          recipes={recipes}
          plans={plans}
          pantry={pantry}
          onRefresh={refreshFromCloud}
          onPick={(id) => {
            setTab(id)
            if (id === 'recipes') setView('list')
          }}
        />
      )}

      {!loading && !loadError && tab === 'plan' && planDishCtx && (
        <Suspense fallback={<TabFallback />}>
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
        </Suspense>
      )}

      {!loading && !loadError && tab === 'plan' && !planDishCtx && (
        <Suspense fallback={<TabFallback />}>
          <MealPlan
            plans={plans}
            recipes={recipes}
            onChange={setPlans}
            onOpenDish={openPlanDish}
            onGenerateRecipe={handleGenerate}
            onRecipePhotosChange={(id, photosOrFn) =>
              updateRecipePhotos(id, photosOrFn)
            }
          />
        </Suspense>
      )}

      {!loading && !loadError && tab === 'pantry' && (
        <Suspense fallback={<TabFallback />}>
          <Pantry pantry={pantry} onChange={setPantry} />
        </Suspense>
      )}

      {!loading && !loadError && tab === 'diary' && (
        <Suspense fallback={<TabFallback />}>
          <Diary
            plans={plans}
            recipes={recipes}
            onOpenRecipe={openRecipeFromTab}
          />
        </Suspense>
      )}

      {!loading && !loadError && tab === 'recipes' && view === 'list' && (
        <main className="content">
          <PageHeader
            title="我的菜谱"
            sub="输入菜名，AI 帮你生成新手菜谱。"
          />

          <div className="ai-bar">
            <input
              className="dish-input"
              placeholder="想做什么菜？如 麻婆豆腐…"
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
              type="button"
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
                <Chip
                  active={filterStatus === 'all'}
                  onClick={() => setFilterStatus('all')}
                >
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
              <p>还没有菜谱，在上方输入菜名让 AI 生成第一道吧。</p>
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
          onEdit={() => openEdit(active.id)}
          onPhotosChange={(photos) => updateRecipePhotos(active.id, photos)}
          onAiModify={handleAiModify}
        />
      )}

      {!loading && !loadError && tab === 'recipes' && view === 'form' && (
        <Suspense fallback={<TabFallback />}>
          <RecipeForm
            initial={active || emptyRecipe()}
            onCancel={() => setView(active ? 'detail' : 'list')}
            onSave={handleSave}
          />
        </Suspense>
      )}

      <div className="bottom-nav-area">
        <nav className="bottom-nav" aria-label="主导航">
          <div className="bottom-nav-inner">
            {mobileSaveHint && (
              <span className={'bottom-nav-save save-' + saveState}>
                {mobileSaveHint}
              </span>
            )}
            {[{ id: 'home', short: '首页' }, ...TABS].map((t) => (
              <button
                key={t.id}
                type="button"
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
      </div>

      <footer className="foot">
        {BRAND} · 云端共享数据
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
      type="button"
      className={'chip' + (active ? ' active' : '')}
      onClick={onClick}
      style={active && color ? { borderColor: color, color } : undefined}
    >
      {children}
    </button>
  )
}
