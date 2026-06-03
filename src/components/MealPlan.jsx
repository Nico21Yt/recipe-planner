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
  onOpenRecipe,
  onGenerateRecipe,
}) {
  const today = todayStr()
  // 默认记录“明天”；刚过凌晨想记当天就切到“今天”
  const [which, setWhich] = useState('tomorrow')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const comboRef = useRef(null)
  const inputRef = useRef(null)

  // 点击下拉框外面就收起
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

  function ensurePlan(list) {
    if (list.some((p) => p.date === targetDate)) return list
    return [...list, emptyPlan(targetDate)]
  }

  function appendDish(currentPlans, dish) {
    const withPlan = ensurePlan(currentPlans)
    onChange(
      withPlan.map((p) =>
        p.date === targetDate ? { ...p, dishes: [...p.dishes, dish] } : p,
      ),
    )
  }

  const match = recipes.find((r) => r.name === input.trim())
  const isNewDish = input.trim() && !match

  const query = input.trim().toLowerCase()
  const options = recipes.filter(
    (r) => !query || r.name.toLowerCase().includes(query),
  )

  async function addDish(nameArg) {
    const name = (nameArg ?? input).trim()
    if (!name || busy) return

    const m = recipes.find((r) => r.name === name)
    if (m) {
      appendDish(plans, makeDish(name, m.id))
      setInput('')
      setOpen(false)
      return
    }

    // 新菜：用 AI 生成菜谱、加入菜谱库，再把这道菜排进计划
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

  const dishes = plan?.dishes || []

  return (
    <main className="content">
      <div className="section-head">
        <div>
          <h2>{which === 'today' ? '今天吃什么' : '明天吃什么'}</h2>
          <p className="section-sub">
            自动按当前日期记录，挑好菜到点就照着做。
          </p>
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
          <ul className="dish-list">
            {dishes.map((d) => (
              <li key={d.id} className="dish">
                <span
                  className={'dish-name' + (d.recipeId ? ' linked' : '')}
                  onClick={() => d.recipeId && onOpenRecipe(d.recipeId)}
                  title={d.recipeId ? '查看菜谱' : '自定义菜（菜谱里还没有）'}
                >
                  {d.recipeId ? '🍽 ' : '✎ '}
                  {d.name}
                </span>
                <button className="btn icon" onClick={() => removeDish(d.id)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">还没安排，加几道想做的菜吧~</p>
        )}

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
            >
              ▾
            </button>

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
                        🍽 {r.name}
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
                      ✨ 用 AI 生成「{input.trim()}」
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
          <button
            className="btn primary small"
            onClick={() => addDish()}
            disabled={busy || !input.trim()}
          >
            {busy ? 'AI 生成中…' : isNewDish ? '✨ 生成并添加' : '添加'}
          </button>
        </div>
        {isNewDish && !busy && (
          <p className="hint">
            「{input.trim()}」还不在菜谱里，点上面按钮会用 AI 生成菜谱并自动加入。
          </p>
        )}
      </section>
    </main>
  )
}
