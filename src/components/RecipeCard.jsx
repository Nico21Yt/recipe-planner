import { STATUS } from '../storage'
import StatusMenu from './StatusMenu'

export default function RecipeCard({
  recipe,
  onClick,
  onStatusChange,
  onToggleFavorite,
}) {
  const s = STATUS[recipe.status] || STATUS.todo
  const photos = recipe.photos || []
  const cover = photos[photos.length - 1]
  return (
    <article className="card" onClick={onClick}>
      {cover && (
        <div className="card-cover">
          <img src={cover.src} alt={recipe.name} loading="lazy" />
          {photos.length > 1 && (
            <span className="cover-count">{photos.length} 张</span>
          )}
        </div>
      )}
      <div className="card-top">
        <span className="badge" style={{ background: s.color }}>
          {s.label}
        </span>
        <button
          type="button"
          className={'star' + (recipe.favorite ? ' on' : '')}
          title={recipe.favorite ? '取消收藏' : '收藏'}
          aria-label={recipe.favorite ? '取消收藏' : '收藏'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite?.()
          }}
        />
      </div>
      <h3 className="card-title">{recipe.name || '未命名'}</h3>
      <div className="card-foot" onClick={(e) => e.stopPropagation()}>
        <StatusMenu value={recipe.status} onChange={onStatusChange} />
        <span className="card-enter" aria-hidden>
          查看 →
        </span>
      </div>
    </article>
  )
}
