import { dayOf, todayStr } from '../storage'
import PullToRefresh from './PullToRefresh'

export default function Home({ recipes, plans, onPick, onRefresh }) {
  const today = todayStr()

  const recipeCount = recipes.length
  const upcomingCount = plans.filter((p) => p.date >= today).length

  const diaryDays = new Set()
  plans.forEach((p) => {
    if (p.date < today || p.diary) diaryDays.add(p.date)
  })
  recipes.forEach((r) => {
    ;(r.photos || []).forEach((p) => {
      const d = dayOf(p.date)
      if (d) diaryDays.add(d)
    })
  })

  const options = [
    {
      id: 'recipes',
      title: '菜谱',
      desc: '收藏想试的菜，记录材料、步骤和成品照',
      stat: `${recipeCount} 道菜`,
    },
    {
      id: 'plan',
      title: '吃什么',
      desc: '安排今天/明天，或用「吃过什么」补记外卖外食',
      stat: upcomingCount > 0 ? `${upcomingCount} 天已安排` : '还没安排',
    },
    {
      id: 'diary',
      title: '做饭日记',
      desc: '按日期回顾做过的菜，贴上当天拍的照片',
      stat: diaryDays.size > 0 ? `${diaryDays.size} 天记录` : '暂无记录',
    },
  ]

  return (
    <PullToRefresh className="content home" onRefresh={onRefresh}>
      <div className="home-hero">
        <span className="home-kicker">灶感 · 新手厨房手记</span>
        <h2>
          今天想做点<em>什么</em>？
        </h2>
        <p>选一个开始吧</p>
      </div>
      <div className="home-grid">
        {options.map((o, i) => (
          <button
            key={o.id}
            className="home-card"
            style={{ '--i': i }}
            onClick={() => onPick(o.id)}
          >
            <span className="home-no" aria-hidden>
              0{i + 1}
            </span>
            <div className="home-card-body">
              <h3>{o.title}</h3>
              <p className="home-desc">{o.desc}</p>
              <div className="home-card-foot">
                <span className="home-stat">{o.stat}</span>
                <span className="home-enter" aria-hidden>
                  进入 →
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </PullToRefresh>
  )
}
