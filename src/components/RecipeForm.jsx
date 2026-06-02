import { useState } from 'react'
import { CATEGORIES, DIFFICULTY, STATUS } from '../storage'

export default function RecipeForm({ initial, onCancel, onSave }) {
  const [r, setR] = useState(() => structuredClone(initial))
  const [tagInput, setTagInput] = useState('')

  function set(field, value) {
    setR((prev) => ({ ...prev, [field]: value }))
  }

  // ---- 材料 ----
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

  // ---- 步骤 ----
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

  // ---- 标签 ----
  function addTag() {
    const t = tagInput.trim()
    if (!t || r.tags.includes(t)) return
    setR((prev) => ({ ...prev, tags: [...prev.tags, t] }))
    setTagInput('')
  }
  function removeTag(t) {
    setR((prev) => ({ ...prev, tags: prev.tags.filter((x) => x !== t) }))
  }

  function submit(e) {
    e.preventDefault()
    if (!r.name.trim()) {
      alert('请填写菜名')
      return
    }
    const cleaned = {
      ...r,
      name: r.name.trim(),
      ingredients: r.ingredients.filter((i) => i.name.trim()),
      steps: r.steps.map((s) => s.trim()).filter(Boolean),
    }
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

        <div className="field-row">
          <label className="field">
            <span>分类</span>
            <select value={r.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>难度</span>
            <select
              value={r.difficulty}
              onChange={(e) => set('difficulty', Number(e.target.value))}
            >
              {Object.entries(DIFFICULTY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>耗时(分钟)</span>
            <input
              type="number"
              min="1"
              value={r.time}
              onChange={(e) => set('time', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>份数</span>
            <input
              type="number"
              min="1"
              value={r.servings}
              onChange={(e) => set('servings', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>状态</span>
            <select value={r.status} onChange={(e) => set('status', e.target.value)}>
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <span>标签</span>
          <div className="tag-editor">
            {r.tags.map((t) => (
              <span key={t} className="tag removable" onClick={() => removeTag(t)}>
                {t} ✕
              </span>
            ))}
            <input
              className="tag-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="输入后回车，如 快手"
            />
          </div>
        </div>

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
                  onClick={() => removeIngredient(i)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn ghost small" onClick={addIngredient}>
            ＋ 添加材料
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
                  onClick={() => removeStep(i)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn ghost small" onClick={addStep}>
            ＋ 添加步骤
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
