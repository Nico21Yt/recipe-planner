import { useRef, useState } from 'react'
import { dayOf, readPhoto } from '../storage'
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

export default function RecipePhotos({ recipe, onPhotosChange }) {
  const { toast, confirm } = useUI()
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [busy, setBusy] = useState(false)
  const photoRef = useRef(null)
  const photos = recipe.photos || []

  async function handleAddPhotos(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    try {
      const added = []
      for (const file of files) {
        const photo = await readPhoto(file)
        const url = await uploadPhoto(photo.src)
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
    const ok = await confirm('删除这张照片？', {
      danger: true,
      confirmText: '删除',
    })
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
      <p className="hint photos-hint">
        照片跟这道菜绑定，从计划或菜谱上传都会出现在这里。
      </p>

      {photos.length === 0 ? (
        <p className="hint">还没有照片，做过之后拍一张留念吧。</p>
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
    </section>
  )
}
