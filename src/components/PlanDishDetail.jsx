import { formatMD, normalizePrep, relativeDay, weekdayCN } from '../storage'
import BackBar from './BackBar'
import RecipePhotos from './RecipePhotos'

export default function PlanDishDetail({
  date,
  dish,
  recipe,
  onBack,
  onPrepChange,
  onPhotosChange,
}) {
  const prep = normalizePrep(dish.prep)
  const rel = relativeDay(date)
  const ingredients = recipe?.ingredients?.filter((i) => i.name?.trim()) || []
  const checkedSet = new Set(prep.checked)
  const checkedCount = ingredients.filter((_, i) => checkedSet.has(i)).length

  function setPrep(patch) {
    onPrepChange({ ...prep, ...patch })
  }

  function toggleIngredient(idx) {
    const next = new Set(prep.checked)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setPrep({ checked: [...next] })
  }

  return (
    <main className="content detail plan-dish-detail">
      <BackBar label="← 返回吃什么" onBack={onBack} />

      <div className="plan-dish-head">
        <div className="plan-dish-date">
          {rel && <span className="rel-tag">{rel}</span>}
          <span className="md">{formatMD(date)}</span>
          <span className="wd">{weekdayCN(date)}</span>
        </div>
        <h2>{dish.name}</h2>
        <p className="section-sub plan-dish-kicker">
          材料勾选会同步到云端，照片仍挂在菜谱上。
        </p>
      </div>

      {recipe ? (
        <>
          <div className="detail-grid">
            <section className="panel">
              <div className="panel-head-row">
                <h3>材料清单</h3>
                {ingredients.length > 0 && (
                  <span className="prep-count">
                    {checkedCount}/{ingredients.length} 已勾选
                  </span>
                )}
              </div>
              <ul className="ingredients">
                {ingredients.map((ing, i) => (
                  <li
                    key={i}
                    className={checkedSet.has(i) ? 'done' : ''}
                    onClick={() => toggleIngredient(i)}
                  >
                    <span
                      className={'check' + (checkedSet.has(i) ? ' on' : '')}
                    />
                    <span className="ing-name">{ing.name}</span>
                    <span className="ing-amount">{ing.amount}</span>
                  </li>
                ))}
              </ul>
              <p className="hint">勾选会保存，换设备也能看到。</p>
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
        </>
      ) : (
        <section className="panel">
          <p className="hint">
            这道菜还没有关联菜谱。添加时从菜谱选择或生成菜谱后会显示材料和步骤。
          </p>
        </section>
      )}
    </main>
  )
}
