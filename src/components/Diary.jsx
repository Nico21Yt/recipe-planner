import { useMemo, useState } from 'react'
import { dayOf, formatMD, relativeDay, todayStr, weekdayCN } from '../storage'

export default function Diary({ plans, recipes, onOpenRecipe }) {
  const today = todayStr()
  const [lightbox, setLightbox] = useState(null)

  const entries = useMemo(() => {
    // 所有照片按“天”归类，并记下属于哪道菜
    const photosByDay = {}
    recipes.forEach((r) => {
      ;(r.photos || []).forEach((p) => {
        const day = dayOf(p.date)
        if (!day) return
        ;(photosByDay[day] ||= []).push({
          ...p,
          recipeName: r.name,
          recipeId: r.id,
        })
      })
    })

    const planByDay = {}
    plans.forEach((p) => {
      planByDay[p.date] = p
    })

    const days = new Set()
    plans.forEach((p) => {
      if (p.date < today) days.add(p.date) // 过期的计划进日记
    })
    Object.keys(photosByDay).forEach((d) => days.add(d)) // 有照片的日子也算

    return [...days]
      .sort()
      .reverse()
      .map((date) => ({
        date,
        dishes: planByDay[date]?.dishes || [],
        photos: photosByDay[date] || [],
      }))
  }, [plans, recipes, today])

  if (entries.length === 0) {
    return (
      <main className="content">
        <div className="section-head">
          <h2>做饭日记</h2>
        </div>
        <div className="empty">
          <p>还没有记录。做过的菜会在这里按日期留存。</p>
          <p className="hint">
            提示：在「明天吃什么」安排菜，到日子后就会出现在这里；
            在菜谱里上传成品照，也会按拍摄日期出现。
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="content">
      <div className="section-head">
        <div>
          <h2>做饭日记</h2>
          <p className="section-sub">按日期回顾做过的菜和拍下的照片。</p>
        </div>
      </div>

      <div className="timeline">
        {entries.map((entry) => {
          const rel = relativeDay(entry.date)
          return (
            <section className="diary-day" key={entry.date}>
              <div className="diary-date">
                <span className="diary-md">{formatMD(entry.date)}</span>
                <span className="diary-wd">{weekdayCN(entry.date)}</span>
                {rel && <span className="diary-rel">{rel}</span>}
              </div>

              <div className="diary-body">
                {entry.dishes.length > 0 && (
                  <div className="diary-dishes">
                    {entry.dishes.map((d) => (
                      <span
                        key={d.id}
                        className={'dish-chip' + (d.recipeId ? ' linked' : '')}
                        onClick={() => d.recipeId && onOpenRecipe(d.recipeId)}
                      >
                        {d.name}
                      </span>
                    ))}
                  </div>
                )}

                {entry.photos.length > 0 ? (
                  <div className="photo-grid">
                    {entry.photos.map((p) => (
                      <figure key={p.id} className="photo-item">
                        <img
                          src={p.src}
                          alt={p.recipeName}
                          loading="lazy"
                          onClick={() => setLightbox(p)}
                        />
                        <figcaption>{p.caption || p.recipeName}</figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p className="hint">这天还没拍照记录~</p>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightbox(null)}>
              ✕
            </button>
            <img src={lightbox.src} alt={lightbox.recipeName} />
            <div className="lightbox-bar">
              <div className="lightbox-info">
                <strong>{lightbox.recipeName}</strong>
                {lightbox.caption && <span>{lightbox.caption}</span>}
              </div>
              <span className="lightbox-date">{formatMD(dayOf(lightbox.date))}</span>
              <button
                className="btn ghost small"
                onClick={() => {
                  onOpenRecipe(lightbox.recipeId)
                  setLightbox(null)
                }}
              >
                查看菜谱
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
