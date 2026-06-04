import { useRef, useState } from 'react'
import { readPhoto } from '../storage'
import { uploadPhoto, deletePhotoBlob } from '../cloud'
import { useUI } from '../ui-context'
import Lightbox from './Lightbox'

/** 计划里某道菜的照片：有菜谱则写入菜谱并按计划日期归类；无菜谱则存在 dish.photos */
export default function DishPhotos({
  dishName,
  planDate,
  recipe,
  dishPhotos = [],
  onDishPhotosChange,
  onRecipePhotosChange,
  compact = true,
}) {
  const { toast, confirm } = useUI()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const photos = recipe
    ? (recipe.photos || []).filter((p) => {
        const d = new Date(p.date)
        if (isNaN(d)) return false
        return d.toLocaleDateString('sv-SE') === planDate
      })
    : dishPhotos

  const defaultDateIso = planDate + 'T12:00:00'

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    try {
      const added = []
      for (const file of files) {
        const photo = await readPhoto(file)
        const url = await uploadPhoto(photo.src)
        added.push({ ...photo, src: url, date: defaultDateIso })
      }
      if (recipe && onRecipePhotosChange) {
        onRecipePhotosChange((prev) => [...(prev || []), ...added])
      } else if (onDishPhotosChange) {
        onDishPhotosChange([...dishPhotos, ...added])
      }
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
    const target = photos.find((p) => p.id === id)
    if (recipe && onRecipePhotosChange) {
      onRecipePhotosChange((prev) => (prev || []).filter((p) => p.id !== id))
    } else if (onDishPhotosChange) {
      onDishPhotosChange(dishPhotos.filter((p) => p.id !== id))
    }
    setLightboxIndex(null)
    if (target?.src) deletePhotoBlob(target.src)
  }

  const lightboxPhotos = photos.map((p) => ({
    ...p,
    recipeName: dishName,
    caption: p.caption || dishName,
  }))

  return (
    <div className={'dish-photos' + (compact ? ' dish-photos-compact' : '')}>
      <div className="dish-photos-row">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className="dish-photo-thumb"
            onClick={() => setLightboxIndex(i)}
          >
            <img src={p.src} alt={dishName} loading="lazy" />
          </button>
        ))}
        <button
          type="button"
          className="btn ghost small dish-photo-add"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? '…' : photos.length > 0 ? '+ 照片' : '添加照片'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleFiles}
        />
      </div>
      {recipe && (
        <p className="hint dish-photos-hint">已关联菜谱，照片会同步到菜谱里。</p>
      )}

      {lightboxIndex != null && (
        <Lightbox
          photos={lightboxPhotos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          renderBar={() => (
            <div className="lightbox-bar">
              <strong>{dishName}</strong>
              <button
                type="button"
                className="btn danger small"
                onClick={() => deletePhoto(lightboxPhotos[lightboxIndex].id)}
              >
                删除
              </button>
            </div>
          )}
        />
      )}
    </div>
  )
}
