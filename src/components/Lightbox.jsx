import { useEffect, useRef, useState } from 'react'

// 可复用的大图查看器：支持左右箭头、键盘方向键、手机左右滑动切换。
// renderBar(photo, index) 用来自定义底部信息栏（标题/备注/删除等）。
export default function Lightbox({ photos, startIndex = 0, onClose, renderBar }) {
  const [i, setI] = useState(startIndex)
  const touchX = useRef(null)
  const count = photos.length
  const idx = count ? Math.min(i, count - 1) : 0
  const photo = photos[idx]

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') setI((v) => (v - 1 + count) % count)
      else if (e.key === 'ArrowRight') setI((v) => (v + 1) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, onClose])

  if (!photo) return null

  function prev() {
    setI((v) => (v - 1 + count) % count)
  }
  function next() {
    setI((v) => (v + 1) % count)
  }

  function onTouchStart(e) {
    touchX.current = e.touches[0].clientX
  }
  function onTouchEnd(e) {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 50 && count > 1) {
      dx > 0 ? prev() : next()
    }
    touchX.current = null
  }

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>
          ✕
        </button>

        <div
          className="lightbox-img"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {count > 1 && (
            <button className="lb-nav prev" onClick={prev} aria-label="上一张">
              ‹
            </button>
          )}
          <img src={photo.src} alt={photo.caption || ''} />
          {count > 1 && (
            <button className="lb-nav next" onClick={next} aria-label="下一张">
              ›
            </button>
          )}
        </div>

        {count > 1 && (
          <div className="lb-count">
            {idx + 1} / {count}
          </div>
        )}

        {renderBar && renderBar(photo, idx)}
      </div>
    </div>
  )
}
