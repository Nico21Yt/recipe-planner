import { useRef, useState } from 'react'
import { STATUS, dayOf, readPhoto } from '../storage'
import { uploadPhoto, deletePhotoBlob } from '../cloud'
import { useUI } from '../ui-context'
import Lightbox from './Lightbox'

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
  onToggleFavorite,
}) {
  const { toast, confirm } = useUI()
  const [checked, setChecked] = useState(() => new Set())
  const [lightboxIndex, setLightboxIndex] = useState(null)
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
        const photo = await readPhoto(file) // 压缩成 dataURL
        const url = await uploadPhoto(photo.src) // 上传到云端，换成 URL
        added.push({ ...photo, src: url })
      }
      onPhotosChange([...(recipe.photos || []), ...added])
      toast('照片已上传', 'success')
    } catch (err) {
      toast('照片上传失败：' + err.message, 'error', 4000)
    } finally {
      setBusy(false)
    }
  }

  async function deletePhoto(id) {
    const ok = await confirm('删除这张照片？', { danger: true, confirmText: '删除' })
    if (!ok) return
    const target = (recipe.photos || []).find((p) => p.id === id)
    onPhotosChange((recipe.photos || []).filter((p) => p.id !== id))
    setLightboxIndex(null)
    if (target?.src) deletePhotoBlob(target.src)
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
        <div className="detail-title">
          <h2>{recipe.name}</h2>
          <button
            type="button"
            className={'star big' + (recipe.favorite ? ' on' : '')}
            title={recipe.favorite ? '取消收藏' : '收藏'}
            aria-label={recipe.favorite ? '取消收藏' : '收藏'}
            onClick={onToggleFavorite}
          />
        </div>
        <div className="meta big">
          <span className="cat">{recipe.category}</span>
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
          <p className="hint">点击可勾选，方便买菜对照。</p>
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

      <section className="panel photos-panel">
        <div className="photos-head">
          <h3>成品记录</h3>
          <button
            className="btn primary small"
            onClick={() => photoRef.current?.click()}
            disabled={busy}
          >
            {busy ? '处理中…' : '上传照片'}
          </button>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
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
            {photos.map((p, i) => (
              <figure key={p.id} className="photo-item">
                <img
                  src={p.src}
                  alt={p.caption || recipe.name}
                  loading="lazy"
                  onClick={() => setLightboxIndex(i)}
                />
                <figcaption>{formatDate(p.date)}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      {lightboxIndex != null && (
        <Lightbox
          photos={photos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          renderBar={(photo) => (
            <div className="lightbox-bar">
              <input
                className="caption-input"
                placeholder="加一句话，比如「第一次做，有点咸」"
                value={photo.caption || ''}
                onChange={(e) => updateCaption(photo.id, e.target.value)}
              />
              <label className="lightbox-date-edit" title="拍摄/做菜日期，日记按它归类">
                <span className="date-label">日期</span>
                <input
                  type="date"
                  value={dayOf(photo.date)}
                  onChange={(e) => updateDate(photo.id, e.target.value)}
                />
              </label>
              <button
                className="btn danger small"
                onClick={() => deletePhoto(photo.id)}
              >
                删除
              </button>
            </div>
          )}
        />
      )}
    </main>
  )
}
