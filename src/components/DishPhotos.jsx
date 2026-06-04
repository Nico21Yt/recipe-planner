import { useRef, useState } from 'react'
import { readPhoto } from '../storage'
import { uploadPhoto, deletePhotoBlob } from '../cloud'
import { useUI } from '../ui-context'
import Lightbox from './Lightbox'

function CameraIcon() {
  return (
    <svg
      className="dish-photo-icon-svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

/** 计划里某道菜的照片：有菜谱则写入菜谱并按计划日期归类；无菜谱则存在 dish.photos */
export default function DishPhotos({
  dishName,
  planDate,
  recipe,
  dishPhotos = [],
  onDishPhotosChange,
  onRecipePhotosChange,
  variant = 'block',
  index,
  onDismiss,
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
  const menuLayout = variant === 'menu'

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

  const addIconBtn = (
    <button
      type="button"
      className={
        'dish-photo-icon-btn' +
        (photos.length > 0 ? ' has-photos' : '') +
        (busy ? ' busy' : '')
      }
      disabled={busy}
      aria-label={photos.length > 0 ? '继续添加照片' : '添加照片'}
      onClick={() => inputRef.current?.click()}
    >
      {busy ? <span className="dish-photo-icon-busy">…</span> : <CameraIcon />}
      {photos.length > 0 && (
        <span className="dish-photo-count" aria-hidden>
          {photos.length}
        </span>
      )}
    </button>
  )

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      hidden
      onChange={handleFiles}
    />
  )

  const thumbStrip =
    photos.length > 0 ? (
      <div className="dish-photos-strip">
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
      </div>
    ) : null

  const lightbox =
    lightboxIndex != null ? (
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
    ) : null

  if (menuLayout) {
    return (
      <div className="dish-photos-menu">
        <div className="dish-menu-row dish-menu-row-ate">
          <span className="dish-menu-no" aria-hidden>
            {index}
          </span>
          <span className="dish-menu-name">{dishName}</span>
          <div className="dish-menu-actions">
            {addIconBtn}
            {fileInput}
            <button
              type="button"
              className="dish-menu-dismiss"
              aria-label={'去掉「' + dishName + '」'}
              onClick={onDismiss}
            />
          </div>
        </div>
        {thumbStrip}
        {lightbox}
      </div>
    )
  }

  return (
    <div className="dish-photos dish-photos-block">
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
        {fileInput}
      </div>
      {lightbox}
    </div>
  )
}
