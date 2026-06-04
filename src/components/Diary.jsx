import { useMemo, useState } from 'react'
import {
  dayOf,
  formatMD,
  photosForPlanDish,
  relativeDay,
  todayStr,
  weekdayCN,
} from '../storage'
import Lightbox from './Lightbox'
import PageHeader from './PageHeader'

export default function Diary({ plans, recipes, onOpenRecipe }) {
  const today = todayStr()
  const [lightbox, setLightbox] = useState(null)

  const entries = useMemo(() => {
    const planByDay = {}
    plans.forEach((p) => {
      planByDay[p.date] = p
    })

    const days = new Set()
    plans.forEach((p) => {
      if (p.date < today || p.diary) days.add(p.date)
    })
    recipes.forEach((r) => {
      ;(r.photos || []).forEach((p) => {
        const day = dayOf(p.date)
        if (day) days.add(day)
      })
    })
    plans.forEach((p) => {
      p.dishes?.forEach((d) => {
        ;(d.photos || []).forEach(() => days.add(p.date))
      })
    })

    return [...days]
      .sort()
      .reverse()
      .map((date) => {
        const dishes = planByDay[date]?.dishes || []
        const dishRows = dishes.map((d) => ({
          dish: d,
          photos: photosForPlanDish(d, date, recipes).map((p) => ({
            ...p,
            dishName: d.name,
            recipeId: d.recipeId || null,
          })),
        }))
        const shownIds = new Set()
        dishRows.forEach((row) =>
          row.photos.forEach((p) => shownIds.add(p.id)),
        )
        const orphanPhotos = []
        recipes.forEach((r) => {
          ;(r.photos || []).forEach((p) => {
            if (dayOf(p.date) !== date || shownIds.has(p.id)) return
            orphanPhotos.push({
              ...p,
              dishName: r.name,
              recipeId: r.id,
            })
          })
        })
        return { date, dishRows, orphanPhotos }
      })
  }, [plans, recipes, today])

  if (entries.length === 0) {
    return (
      <main className="content">
        <PageHeader title="做饭日记" />
        <div className="empty">
          <p>还没有记录。吃过的菜和照片会在这里按日期留存。</p>
          <p className="hint">
            在「吃什么 → 吃过什么」补记菜名并添加照片；有菜谱的菜照片会同步到菜谱。
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="content">
      <PageHeader
        title="做饭日记"
        sub="按日期回顾吃过的菜和照片。"
      />

      <div className="timeline">
        {entries.map((entry) => {
          const rel = relativeDay(entry.date)
          const hasAnyPhoto =
            entry.dishRows.some((r) => r.photos.length > 0) ||
            entry.orphanPhotos.length > 0

          return (
            <section className="diary-day" key={entry.date}>
              <header className="diary-date">
                <span className="diary-md">{formatMD(entry.date)}</span>
                <span className="diary-wd">{weekdayCN(entry.date)}</span>
                {rel && <span className="diary-rel">{rel}</span>}
              </header>

              <div className="diary-body">
                {entry.dishRows.length > 0 ? (
                  <div className="diary-dish-list">
                    {entry.dishRows.map(({ dish, photos }) => (
                      <div key={dish.id} className="diary-dish-row">
                        <div className="diary-dish-name">{dish.name}</div>
                        {photos.length > 0 && (
                          <div className="photo-grid photo-grid-compact">
                            {photos.map((p, i) => (
                              <figure key={p.id} className="photo-item">
                                <img
                                  src={p.src}
                                  alt={p.dishName}
                                  loading="lazy"
                                  onClick={() =>
                                    setLightbox({
                                      photos,
                                      index: i,
                                      date: entry.date,
                                    })
                                  }
                                />
                              </figure>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}

                {entry.orphanPhotos.length > 0 && (
                  <div className="photo-grid">
                    {entry.orphanPhotos.map((p, i) => (
                      <figure key={p.id} className="photo-item">
                        <img
                          src={p.src}
                          alt={p.dishName}
                          loading="lazy"
                          onClick={() =>
                            setLightbox({
                              photos: entry.orphanPhotos,
                              index: i,
                              date: entry.date,
                            })
                          }
                        />
                        <figcaption>{p.dishName}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}

                {!hasAnyPhoto && entry.dishRows.length === 0 && (
                  <p className="hint">这天还没有记录~</p>
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
                <strong>{photo.dishName}</strong>
                {photo.caption && <span>{photo.caption}</span>}
              </div>
              {photo.recipeId && onOpenRecipe && (
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => {
                    setLightbox(null)
                    onOpenRecipe(photo.recipeId)
                  }}
                >
                  查看菜谱
                </button>
              )}
            </div>
          )}
        />
      )}
    </main>
  )
}
