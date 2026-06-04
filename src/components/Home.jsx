import { dayOf, todayStr } from '../storage'

export default function Home({ recipes, plans, onPick }) {
  const today = todayStr()

  const recipeCount = recipes.length
  const upcomingCount = plans.filter((p) => p.date >= today).length

  const diaryDays = new Set()
  plans.forEach((p) => {
    if (p.date < today) diaryDays.add(p.date)
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
      title: '明天吃什么',
      desc: '提前安排哪天做什么，从菜谱选或新增要做的菜',
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
    <main className="content home">
      <div className="home-hero">
        <span className="home-kicker">Nico · 小厨房</span>
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
            <span className="home-no">0{i + 1}</span>
            <h3>{o.title}</h3>
            <p className="home-desc">{o.desc}</p>
            <span className="home-stat">{o.stat}</span>
          </button>
        ))}
      </div>
    </main>
  )
}
