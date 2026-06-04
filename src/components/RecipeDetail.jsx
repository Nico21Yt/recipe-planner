import { useState } from 'react'
import RecipePhotos from './RecipePhotos'

export default function RecipeDetail({
  recipe,
  onBack,
  onPhotosChange,
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
      </div>

      <div className="detail-head">
        <h2>{recipe.name}</h2>
      </div>

      <div className="detail-grid">
        <section className="panel">
          <h3>材料清单</h3>
          <ul className="ingredients">
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                className={checked.has(i) ? 'done' : ''}
                onClick={() => toggle(i)}
              >
                <span className={'check' + (checked.has(i) ? ' on' : '')} />
                <span className="ing-name">{ing.name}</span>
                <span className="ing-amount">{ing.amount}</span>
              </li>
            ))}
          </ul>
          <p className="hint">点击可勾选，方便买菜对照（仅本机）。</p>
        </section>

        <section className="panel">
          <h3>做法步骤</h3>
          <ol className="steps">
            {recipe.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      {recipe.notes && (
        <section className="panel notes">
          <h3>小贴士 / 心得</h3>
          <p>{recipe.notes}</p>
        </section>
      )}

      <RecipePhotos recipe={recipe} onPhotosChange={onPhotosChange} />
    </main>
  )
}
