import { useRef, useState } from 'react'
import { DIFFICULTY, STATUS, dayOf, readPhoto } from '../storage'

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function RecipeDetail({
  recipe,
  onBack,
  onEdit,
  onDelete,
  onStatusChange,
  onPhotosChange,
}) {
  const [checked, setChecked] = useState(() => new Set())
  const [lightbox, setLightbox] = useState(null) // 放大查看的照片
  const [busy, setBusy] = useState(false)
  const photoRef = useRef(null)
  const photos = recipe.photos || []

  function toggle(idx) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  async function handleAddPhotos(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    try {
      const added = []
      for (const file of files) {
        added.push(await readPhoto(file))
      }
      onPhotosChange([...(recipe.photos || []), ...added])
    } catch (err) {
      alert('照片处理失败：' + err.message)
    } finally {
      setBusy(false)
    }
  }

  function deletePhoto(id) {
    if (!confirm('删除这张照片？')) return
    onPhotosChange((recipe.photos || []).filter((p) => p.id !== id))
    setLightbox(null)
  }

  function updateCaption(id, caption) {
    onPhotosChange(
      (recipe.photos || []).map((p) => (p.id === id ? { ...p, caption } : p)),
    )
  }

  function updateDate(id, day) {
    const iso = day ? day + 'T12:00:00' : new Date().toISOString()
    onPhotosChange(
      (recipe.photos || []).map((p) => (p.id === id ? { ...p, date: iso } : p)),
    )
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

      <section className="panel photos-panel">
        <div className="photos-head">
          <h3>📸 成品记录</h3>
          <button
            className="btn primary small"
            onClick={() => photoRef.current?.click()}
            disabled={busy}
          >
            {busy ? '处理中…' : '＋ 上传照片'}
          </button>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            hidden
            onChange={handleAddPhotos}
          />
        </div>

        {photos.length === 0 ? (
          <p className="hint">
            做过这道菜后，拍张成品照传上来，记录你的进步吧！
          </p>
        ) : (
          <div className="photo-grid">
            {photos.map((p) => (
              <figure key={p.id} className="photo-item">
                <img
                  src={p.src}
                  alt={p.caption || recipe.name}
                  loading="lazy"
                  onClick={() => setLightbox(p)}
                />
                <figcaption>{formatDate(p.date)}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightbox(null)}>
              ✕
            </button>
            <img src={lightbox.src} alt={lightbox.caption || recipe.name} />
            <div className="lightbox-bar">
              <input
                className="caption-input"
                placeholder="加一句话，比如「第一次做，有点咸」"
                value={lightbox.caption}
                onChange={(e) => {
                  const v = e.target.value
                  setLightbox((lb) => ({ ...lb, caption: v }))
                  updateCaption(lightbox.id, v)
                }}
              />
              <label className="lightbox-date-edit" title="拍摄/做菜日期，日记按它归类">
                📅
                <input
                  type="date"
                  value={dayOf(lightbox.date)}
                  onChange={(e) => {
                    const day = e.target.value
                    setLightbox((lb) => ({ ...lb, date: day + 'T12:00:00' }))
                    updateDate(lightbox.id, day)
                  }}
                />
              </label>
              <button
                className="btn danger small"
                onClick={() => deletePhoto(lightbox.id)}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
