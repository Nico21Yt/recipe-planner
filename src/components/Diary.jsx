import { useMemo, useState } from 'react'
import { dayOf, formatMD, relativeDay, todayStr, weekdayCN } from '../storage'
import Lightbox from './Lightbox'

export default function Diary({ plans, recipes, onOpenPlanDish, onOpenRecipe }) {
  const today = todayStr()
  const [lightbox, setLightbox] = useState(null) // { photos, index }

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
      if (p.date < today || p.diary) days.add(p.date) // 过期计划 +「吃过什么」补记
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
            提示：在「吃什么」里用「吃过什么」补记，或安排过的菜过了当天也会出现在这里；
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
              <header className="diary-date">
                <span className="diary-md">{formatMD(entry.date)}</span>
                <span className="diary-wd">{weekdayCN(entry.date)}</span>
                {rel && <span className="diary-rel">{rel}</span>}
              </header>

              <div className="diary-body">
                {entry.dishes.length > 0 && (
                  <ul className="diary-dish-list">
                    {entry.dishes.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          className="diary-dish-name"
                          onClick={() =>
                            onOpenPlanDish({
                              date: entry.date,
                              dishId: d.id,
                            })
                          }
                        >
                          {d.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {entry.photos.length > 0 ? (
                  <div className="photo-grid">
                    {entry.photos.map((p, i) => (
                      <figure key={p.id} className="photo-item">
                        <img
                          src={p.src}
                          alt={p.recipeName}
                          loading="lazy"
                          onClick={() =>
                            setLightbox({ photos: entry.photos, index: i })
                          }
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
        <Lightbox
          photos={lightbox.photos}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          renderBar={(photo) => (
            <div className="lightbox-bar">
              <div className="lightbox-info">
                <strong>{photo.recipeName}</strong>
                {photo.caption && <span>{photo.caption}</span>}
              </div>
              <span className="lightbox-date">{formatMD(dayOf(photo.date))}</span>
              <button
                className="btn ghost small"
                onClick={() => {
                  setLightbox(null)
                  onOpenRecipe(photo.recipeId)
                }}
              >
                查看菜谱
              </button>
            </div>
          )}
        />
      )}
    </main>
  )
}
