import { useState } from 'react'
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

  async function addDish() {
    const name = input.trim()
    if (!name || busy) return

    if (match) {
      appendDish(plans, makeDish(name, match.id))
      setInput('')
      return
    }

    // 新菜：用 AI 生成菜谱、加入菜谱库，再把这道菜排进计划
    setBusy(true)
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
          <input
            list="recipe-options"
            className="dish-input"
            placeholder="从菜谱选，或输入新菜名…"
            value={input}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addDish()
              }
            }}
          />
          <datalist id="recipe-options">
            {recipes.map((r) => (
              <option key={r.id} value={r.name} />
            ))}
          </datalist>
          <button
            className="btn primary small"
            onClick={addDish}
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
