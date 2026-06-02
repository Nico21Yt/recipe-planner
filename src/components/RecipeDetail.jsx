import { useState } from 'react'
import { DIFFICULTY, STATUS } from '../storage'

export default function RecipeDetail({
  recipe,
  onBack,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  const [checked, setChecked] = useState(() => new Set())

  function toggle(idx) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  return (
    <main className="content detail">
      <div className="detail-bar">
        <button className="btn ghost" onClick={onBack}>
          ← 返回
        </button>
        <div className="detail-bar-actions">
          <button className="btn ghost" onClick={onEdit}>
            编辑
          </button>
          <button className="btn danger" onClick={onDelete}>
            删除
          </button>
        </div>
      </div>

      <div className="detail-head">
        <h2>{recipe.name}</h2>
        <div className="meta big">
          <span className="cat">{recipe.category}</span>
          <span>⏱ {recipe.time} 分钟</span>
          <span>🍽 {recipe.servings} 人份</span>
          <span>🔥 {DIFFICULTY[recipe.difficulty]}</span>
        </div>
        <div className="status-row">
          {Object.entries(STATUS).map(([key, st]) => (
            <button
              key={key}
              className={'status-pill' + (recipe.status === key ? ' on' : '')}
              style={
                recipe.status === key
                  ? { background: st.color, borderColor: st.color }
                  : undefined
              }
              onClick={() => onStatusChange(key)}
            >
              {st.label}
            </button>
          ))}
        </div>
        {recipe.tags?.length > 0 && (
          <div className="tags">
            {recipe.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="detail-grid">
        <section className="panel">
          <h3>🧺 材料清单</h3>
          <ul className="ingredients">
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                className={checked.has(i) ? 'done' : ''}
                onClick={() => toggle(i)}
              >
                <span className="check">{checked.has(i) ? '✓' : ''}</span>
                <span className="ing-name">{ing.name}</span>
                <span className="ing-amount">{ing.amount}</span>
              </li>
            ))}
          </ul>
          <p className="hint">点击可勾选，方便买菜对照。</p>
        </section>

        <section className="panel">
          <h3>👨‍🍳 做法步骤</h3>
          <ol className="steps">
            {recipe.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      {recipe.notes && (
        <section className="panel notes">
          <h3>📝 小贴士 / 心得</h3>
          <p>{recipe.notes}</p>
        </section>
      )}
    </main>
  )
}
