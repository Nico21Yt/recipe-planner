import { useState } from 'react'
import { useUI } from '../ui-context'
import RecipePhotos from './RecipePhotos'

export default function RecipeDetail({
  recipe,
  onBack,
  onPhotosChange,
  onAiModify,
}) {
  const { toast } = useUI()
  const [checked, setChecked] = useState(() => new Set())
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  function toggle(idx) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  async function runAiModify() {
    const text = aiPrompt.trim()
    if (!text || aiBusy || !onAiModify) return
    setAiBusy(true)
    try {
      await onAiModify(text)
      setAiPrompt('')
      toast('菜谱已按你的描述更新', 'success')
    } catch (e) {
      toast('AI 修改失败：' + e.message, 'error', 4000)
    } finally {
      setAiBusy(false)
    }
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

      {onAiModify && (
        <section className="panel ai-modify-panel">
          <h3 className="ai-modify-title">AI 改菜谱</h3>
          <p className="hint ai-modify-hint">
            小改动可直接说，如「两人份」「少放盐」。若换成预制菜、换空气炸锅等，请写清楚，例如「我用的是冷冻预制小鱿鱼，400°F 空气炸锅 8 分钟，请按这个重写整份菜谱（材料、步骤、贴士）」。
          </p>
          <textarea
            className="ai-modify-input"
            rows={2}
            placeholder="输入修改要求…"
            value={aiPrompt}
            disabled={aiBusy}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                runAiModify()
              }
            }}
          />
          <button
            type="button"
            className="btn accent small ai-modify-btn"
            disabled={aiBusy || !aiPrompt.trim()}
            onClick={runAiModify}
          >
            {aiBusy ? 'AI 修改中…' : '按描述修改'}
          </button>
        </section>
      )}

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
