import { DIFFICULTY, STATUS } from '../storage'

export default function RecipeCard({ recipe, onClick, onStatusChange }) {
  const s = STATUS[recipe.status] || STATUS.todo
  const photos = recipe.photos || []
  const cover = photos[photos.length - 1]
  return (
    <article className="card" onClick={onClick}>
      {cover && (
        <div className="card-cover">
          <img src={cover.src} alt={recipe.name} loading="lazy" />
          {photos.length > 1 && (
            <span className="cover-count">📷 {photos.length}</span>
          )}
        </div>
      )}
      <div className="card-top">
        <span className="badge" style={{ background: s.color }}>
          {s.label}
        </span>
        <span className="cat">{recipe.category}</span>
      </div>
      <h3 className="card-title">{recipe.name || '未命名'}</h3>
      <div className="meta">
        <span>⏱ {recipe.time} 分钟</span>
        <span>🍽 {recipe.servings} 人份</span>
        <span>🔥 {DIFFICULTY[recipe.difficulty]}</span>
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
      <div className="card-foot" onClick={(e) => e.stopPropagation()}>
        <select
          className="status-select"
          value={recipe.status}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {Object.entries(STATUS).map(([key, st]) => (
            <option key={key} value={key}>
              {st.label}
            </option>
          ))}
        </select>
      </div>
    </article>
  )
}
