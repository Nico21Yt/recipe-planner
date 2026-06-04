import { useState } from 'react'
import StatusMenu from './StatusMenu'
import { useUI } from '../ui-context'

export default function RecipeForm({ initial, onCancel, onSave }) {
  const { toast } = useUI()
  const [r, setR] = useState(() => structuredClone(initial))

  function set(field, value) {
    setR((prev) => ({ ...prev, [field]: value }))
  }

  function setIngredient(i, key, value) {
    setR((prev) => {
      const ingredients = prev.ingredients.map((ing, idx) =>
        idx === i ? { ...ing, [key]: value } : ing,
      )
      return { ...prev, ingredients }
    })
  }
  function addIngredient() {
    setR((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: '' }],
    }))
  }
  function removeIngredient(i) {
    setR((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, idx) => idx !== i),
    }))
  }

  function setStep(i, value) {
    setR((prev) => ({
      ...prev,
      steps: prev.steps.map((s, idx) => (idx === i ? value : s)),
    }))
  }
  function addStep() {
    setR((prev) => ({ ...prev, steps: [...prev.steps, ''] }))
  }
  function removeStep(i) {
    setR((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, idx) => idx !== i),
    }))
  }

  function submit(e) {
    e.preventDefault()
    if (!r.name.trim()) {
      toast('请填写菜名', 'error')
      return
    }
    const cleaned = {
      ...r,
      name: r.name.trim(),
      ingredients: r.ingredients.filter((i) => i.name.trim()),
      steps: r.steps.map((s) => s.trim()).filter(Boolean),
    }
    delete cleaned.time
    delete cleaned.servings
    delete cleaned.difficulty
    delete cleaned.category
    delete cleaned.tags
    onSave(cleaned)
  }

  return (
    <main className="content">
      <form className="form" onSubmit={submit}>
        <div className="form-head">
          <h2>{initial.name ? '编辑菜谱' : '新建菜谱'}</h2>
          <div className="form-head-actions">
            <button type="button" className="btn ghost" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="btn primary">
              保存
            </button>
          </div>
        </div>

        <label className="field">
          <span>菜名</span>
          <input
            value={r.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="例如：番茄炒蛋"
            autoFocus
          />
        </label>

        <label className="field">
          <span>状态</span>
          <StatusMenu value={r.status} onChange={(status) => set('status', status)} />
        </label>

        <div className="field">
          <span>材料</span>
          <div className="rows">
            {r.ingredients.map((ing, i) => (
              <div className="ing-row" key={i}>
                <input
                  placeholder="食材"
                  value={ing.name}
                  onChange={(e) => setIngredient(i, 'name', e.target.value)}
                />
                <input
                  placeholder="用量，如 2个 / 适量"
                  value={ing.amount}
                  onChange={(e) => setIngredient(i, 'amount', e.target.value)}
                />
                <button
                  type="button"
                  className="btn icon"
                  aria-label="删除材料"
                  onClick={() => removeIngredient(i)}
                />
              </div>
            ))}
          </div>
          <button type="button" className="btn ghost small" onClick={addIngredient}>
            添加材料
          </button>
        </div>

        <div className="field">
          <span>步骤</span>
          <div className="rows">
            {r.steps.map((step, i) => (
              <div className="step-row" key={i}>
                <span className="step-num">{i + 1}</span>
                <textarea
                  rows={2}
                  placeholder={`第 ${i + 1} 步`}
                  value={step}
                  onChange={(e) => setStep(i, e.target.value)}
                />
                <button
                  type="button"
                  className="btn icon"
                  aria-label="删除步骤"
                  onClick={() => removeStep(i)}
                />
              </div>
            ))}
          </div>
          <button type="button" className="btn ghost small" onClick={addStep}>
            添加步骤
          </button>
        </div>

        <label className="field">
          <span>小贴士 / 心得</span>
          <textarea
            rows={3}
            value={r.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="记录注意事项、失败教训、口味调整…"
          />
        </label>
      </form>
    </main>
  )
}
