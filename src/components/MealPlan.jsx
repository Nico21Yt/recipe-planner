import { useEffect, useRef, useState } from 'react'
import {
  addDays,
  emptyPlan,
  formatMD,
  makeDish,
  todayStr,
  weekdayCN,
} from '../storage'

export default function MealPlan({
  plans,
  recipes,
  onChange,
  onOpenDish,
  onGenerateRecipe,
}) {
  const today = todayStr()
  const [which, setWhich] = useState('tomorrow')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const comboRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (comboRef.current && !comboRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const targetDate = which === 'today' ? today : addDays(today, 1)
  const plan = plans.find((p) => p.date === targetDate) || null
  const chefNote = plan?.chefNote ?? ''

  function ensurePlan(list) {
    if (list.some((p) => p.date === targetDate)) return list
    return [...list, emptyPlan(targetDate)]
  }

  function updatePlan(patch) {
    onChange(
      ensurePlan(plans).map((p) =>
        p.date === targetDate ? { ...p, ...patch } : p,
      ),
    )
  }

  function appendDish(currentPlans, dish) {
    const withPlan = ensurePlan(currentPlans)
    onChange(
      withPlan.map((p) =>
        p.date === targetDate ? { ...p, dishes: [...p.dishes, dish] } : p,
      ),
    )
  }

  const dishes = plan?.dishes || []
  const selectedRecipeIds = new Set(
    dishes.map((d) => d.recipeId).filter(Boolean),
  )
  const selectedNames = new Set(
    dishes.map((d) => d.name.trim().toLowerCase()),
  )

  function isAlreadySelected(nameOrRecipe) {
    const recipe =
      typeof nameOrRecipe === 'string'
        ? recipes.find((r) => r.name.trim() === nameOrRecipe.trim())
        : nameOrRecipe
    const nameKey = (
      typeof nameOrRecipe === 'string' ? nameOrRecipe : nameOrRecipe.name
    )
      .trim()
      .toLowerCase()
    if (selectedNames.has(nameKey)) return true
    if (recipe?.id && selectedRecipeIds.has(recipe.id)) return true
    return false
  }

  const match = recipes.find((r) => r.name === input.trim())
  const isNewDish = input.trim() && !match
  const alreadySelected = input.trim() && isAlreadySelected(input.trim())

  const query = input.trim().toLowerCase()
  const options = recipes.filter(
    (r) =>
      !isAlreadySelected(r) &&
      (!query || r.name.toLowerCase().includes(query)),
  )

  async function addDish(nameArg) {
    const name = (nameArg ?? input).trim()
    if (!name || busy || isAlreadySelected(name)) return

    const m = recipes.find((r) => r.name === name)
    if (m) {
      appendDish(plans, makeDish(name, m.id))
      setInput('')
      setOpen(false)
      return
    }

    setBusy(true)
    setOpen(false)
    try {
      const recipe = await onGenerateRecipe(name)
      appendDish(plans, makeDish(name, recipe ? recipe.id : null))
      setInput('')
    } finally {
      setBusy(false)
    }
  }

  function removeDish(dishId) {
    onChange(
      plans.map((p) =>
        p.date === targetDate
          ? { ...p, dishes: p.dishes.filter((d) => d.id !== dishId) }
          : p,
      ),
    )
  }

  return (
    <main className="content">
      <div className="section-head">
        <div>
          <h2>{which === 'today' ? '今天吃什么' : '明天吃什么'}</h2>
          <p className="section-sub">挑好菜，备注留给做菜的人。</p>
        </div>
      </div>

      <div className="day-switch">
        <button
          className={'day-tab' + (which === 'today' ? ' active' : '')}
          onClick={() => setWhich('today')}
        >
          今天吃什么
        </button>
        <button
          className={'day-tab' + (which === 'tomorrow' ? ' active' : '')}
          onClick={() => setWhich('tomorrow')}
        >
          明天吃什么
        </button>
      </div>

      <section className="plan-card single">
        <div className="plan-card-head">
          <div className="plan-date">
            <span className="rel">{which === 'today' ? '今天' : '明天'}</span>
            <span className="md">{formatMD(targetDate)}</span>
            <span className="wd">{weekdayCN(targetDate)}</span>
          </div>
        </div>

        {dishes.length > 0 ? (
          <ol className="dish-menu">
            {dishes.map((d, i) => (
              <li key={d.id} className="dish-menu-item">
                <span className="dish-menu-no" aria-hidden>
                  {i + 1}
                </span>
                <button
                  type="button"
                  className="dish-menu-name linked"
                  onClick={() => onOpenDish({ date: targetDate, dishId: d.id })}
                >
                  {d.name}
                </button>
                <button
                  type="button"
                  className="dish-menu-dismiss"
                  aria-label={'去掉「' + d.name + '」'}
                  onClick={() => removeDish(d.id)}
                />
              </li>
            ))}
          </ol>
        ) : (
          <p className="hint plan-empty-hint">还没安排，加几道想做的菜吧。</p>
        )}

        <label className="chef-note">
          <span className="chef-note-label">给厨师的备注</span>
          <textarea
            className="chef-note-input"
            rows={3}
            placeholder="口味偏好、忌口、少油少盐、多准备一份…"
            value={chefNote}
            onChange={(e) => updatePlan({ chefNote: e.target.value })}
          />
        </label>

        <div className="dish-add">
          <div className="combo" ref={comboRef}>
            <input
              ref={inputRef}
              className="dish-input"
              placeholder="从菜谱选，或输入新菜名…"
              value={input}
              disabled={busy}
              onChange={(e) => {
                setInput(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addDish()
                } else if (e.key === 'Escape') {
                  setOpen(false)
                }
              }}
            />
            <button
              type="button"
              className={'combo-arrow' + (open ? ' open' : '')}
              disabled={busy}
              aria-label="展开菜谱列表"
              onClick={() => {
                setOpen((v) => !v)
                inputRef.current?.focus()
              }}
            />

            {open && (
              <ul className="combo-menu">
                {options.length > 0 ? (
                  options.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="combo-item"
                        onClick={() => addDish(r.name)}
                      >
                        {r.name}
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="combo-empty">菜谱里没有匹配的菜</li>
                )}
                {isNewDish && (
                  <li>
                    <button
                      type="button"
                      className="combo-item new"
                      onClick={() => addDish()}
                    >
                      用 AI 生成「{input.trim()}」
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
          <button
            className={'btn small ' + (isNewDish ? 'accent' : 'primary')}
            onClick={() => addDish()}
            disabled={busy || !input.trim() || alreadySelected}
          >
            {busy ? 'AI 生成中…' : isNewDish ? '生成并添加' : '添加'}
          </button>
        </div>
        {alreadySelected && !busy && (
          <p className="hint">这道菜已经在计划里了。</p>
        )}
        {isNewDish && !busy && !alreadySelected && (
          <p className="hint">
            「{input.trim()}」还不在菜谱里，点上面按钮会用 AI 生成菜谱并自动加入。
          </p>
        )}
      </section>
    </main>
  )
}
