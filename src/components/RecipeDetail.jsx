import { useState } from 'react'
import { useUI } from '../ui-context'
import BackBar from './BackBar'
import RecipePhotos from './RecipePhotos'

export default function RecipeDetail({
  recipe,
  onBack,
  onEdit,
  onPhotosChange,
  onAiModify,
}) {
  const { toast } = useUI()
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

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
      <BackBar onBack={onBack} />
      <div className="detail-head detail-head-row">
        <h2>{recipe.name}</h2>
        {onEdit && (
          <button type="button" className="btn ghost small" onClick={onEdit}>
            编辑
          </button>
        )}
      </div>

      {onAiModify && (
        <section className="panel ai-modify-panel">
          <h3 className="ai-modify-title">AI 改菜谱</h3>
          <p className="hint ai-modify-hint">
            例：两人份、少放盐。换食材或做法时，简要说明即可。
          </p>
          <textarea
            className="ai-modify-input"
            rows={2}
            placeholder="写下修改要求…"
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
          <ul className="ingredients ingredients-readonly">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}>
                <span className="ing-name">{ing.name}</span>
                <span className="ing-amount">{ing.amount}</span>
              </li>
            ))}
          </ul>
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
