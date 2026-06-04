import { useEffect, useRef, useState } from 'react'
import {
  addDays,
  emptyPlan,
  formatMD,
  makeDish,
  relativeDay,
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
  const [ateDate, setAteDate] = useState(today)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const comboRef = useRef(null)
  const inputRef = useRef(null)

  const isAte = which === 'ate'
  const targetDate = isAte
    ? ateDate
    : which === 'today'
      ? today
      : addDays(today, 1)

  function closeList() {
    setListOpen(false)
  }

  function toggleList() {
    const next = !listOpen
    setListOpen(next)
    if (next) inputRef.current?.blur()
  }

  useEffect(() => {
    setListOpen(false)
    setInput('')
  }, [which, targetDate])

  useEffect(() => {
    function onDocClick(e) {
      if (comboRef.current && !comboRef.current.contains(e.target)) {
        closeList()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const plan = plans.find((p) => p.date === targetDate) || null
  const chefNote = plan?.chefNote ?? ''

  function ensurePlan(list) {
    if (list.some((p) => p.date === targetDate)) return list
    return [...list, emptyPlan(targetDate, { diary: isAte })]
  }

  function markDiary(patch) {
    return isAte ? { ...patch, diary: true } : patch
  }

  function updatePlan(patch) {
    onChange(
      ensurePlan(plans).map((p) =>
        p.date === targetDate ? { ...p, ...markDiary(patch) } : p,
      ),
    )
  }

  function appendDish(currentPlans, dish) {
    const withPlan = ensurePlan(currentPlans)
    onChange(
      withPlan.map((p) =>
        p.date === targetDate
          ? { ...p, diary: isAte || !!p.diary, dishes: [...p.dishes, dish] }
          : p,
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
  const hasInput = !!input.trim()

  const available = recipes.filter((r) => !isAlreadySelected(r))
  const query = input.trim().toLowerCase()
  const listOptions = query
    ? available.filter((r) => r.name.toLowerCase().includes(query))
    : available

  async function addDish(nameArg) {
    const name = (nameArg ?? input).trim()
    if (!name || busy || isAlreadySelected(name)) return

    const m = recipes.find((r) => r.name === name)
    if (m) {
      appendDish(plans, makeDish(name, m.id))
      setInput('')
      closeList()
      return
    }

    if (isAte) {
      appendDish(plans, makeDish(name, null))
      setInput('')
      closeList()
      return
    }

    setBusy(true)
    closeList()
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

  const sectionTitle =
    which === 'today'
      ? '今天吃什么'
      : which === 'tomorrow'
        ? '明天吃什么'
        : '吃过什么'

  const sectionSub = isAte
    ? '只记菜名即可，外卖外食不用建菜谱，会出现在做饭日记。'
    : '挑好菜，备注留给做菜的人。'

  const dateRel = isAte
    ? relativeDay(targetDate) || '补记'
    : which === 'today'
      ? '今天'
      : '明天'

  const emptyHint = isAte
    ? '还没记录，加几道吃过的菜吧。'
    : '还没安排，加几道想做的菜吧。'

  return (
    <main className="content">
      <div className="section-head">
        <div>
          <h2>{sectionTitle}</h2>
          <p className="section-sub">{sectionSub}</p>
        </div>
      </div>

      <div className="day-switch">
        <button
          type="button"
          className={'day-tab' + (which === 'today' ? ' active' : '')}
          onClick={() => setWhich('today')}
        >
          今天吃什么
        </button>
        <button
          type="button"
          className={'day-tab' + (which === 'tomorrow' ? ' active' : '')}
          onClick={() => setWhich('tomorrow')}
        >
          明天吃什么
        </button>
        <button
          type="button"
          className={'day-tab' + (isAte ? ' active' : '')}
          onClick={() => setWhich('ate')}
        >
          吃过什么
        </button>
      </div>

      <section className="plan-card single">
        <div className="plan-card-head">
          <div className="plan-date">
            {isAte ? (
              <label className="ate-date-pick">
                <span className="sr-only">选择日期</span>
                <input
                  type="date"
                  className="date-input ate-date-input"
                  value={ateDate}
                  max={today}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v && v <= today) setAteDate(v)
                  }}
                />
              </label>
            ) : (
              <span className="rel">{dateRel}</span>
            )}
            <span className="md">{formatMD(targetDate)}</span>
            <span className="wd">{weekdayCN(targetDate)}</span>
            {isAte && relativeDay(targetDate) && (
              <span className="rel rel-muted">{relativeDay(targetDate)}</span>
            )}
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
          <p className="hint plan-empty-hint">{emptyHint}</p>
        )}

        <div className="dish-add">
          <div className="combo" ref={comboRef}>
            <input
              ref={inputRef}
              className="dish-input"
              placeholder={
                isAte ? '输入吃过的菜名，或从菜谱选' : '选菜谱或输入新菜名'
              }
              value={input}
              disabled={busy}
              enterKeyHint="done"
              onChange={(e) => {
                setInput(e.target.value)
                closeList()
              }}
              onFocus={closeList}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && hasInput) {
                  e.preventDefault()
                  addDish()
                }
              }}
            />
            <button
              type="button"
              className={'combo-arrow' + (listOpen ? ' open' : '')}
              disabled={busy}
              aria-label={listOpen ? '收起菜谱' : '展开菜谱'}
              onClick={toggleList}
            />
            {listOpen && (
              <ul className="combo-menu" role="listbox">
                {listOptions.length > 0 ? (
                  listOptions.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="combo-item"
                        role="option"
                        onClick={() => addDish(r.name)}
                      >
                        {r.name}
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="combo-empty">
                    {recipes.length === 0
                      ? '菜谱为空'
                      : query
                        ? '没有匹配的菜'
                        : '可选的菜都已在记录里'}
                  </li>
                )}
              </ul>
            )}
          </div>
          {hasInput && (
            <button
              type="button"
              className={
                'btn small ' + (isNewDish && !isAte ? 'accent' : 'primary')
              }
              onClick={() => addDish()}
              disabled={busy || alreadySelected}
            >
              {busy ? '…' : isNewDish && !isAte ? '生成' : '添加'}
            </button>
          )}
        </div>
        {hasInput && alreadySelected && !busy && (
          <p className="hint">已在{isAte ? '记录' : '计划'}里。</p>
        )}
        {hasInput && isNewDish && !isAte && !busy && !alreadySelected && (
          <p className="hint">新菜名将用 AI 生成菜谱并加入。</p>
        )}

        {!isAte && (
          <label className="chef-note">
            <span className="chef-note-label">
              {which === 'today' ? '今天的菜谱备注' : '明天的菜谱备注'}
            </span>
            <textarea
              className="chef-note-input"
              rows={3}
              placeholder="口味偏好、忌口、少油少盐、多准备一份…"
              value={chefNote}
              onChange={(e) => updatePlan({ chefNote: e.target.value })}
            />
          </label>
        )}
      </section>
    </main>
  )
}
