export default function BackBar({ label = '← 返回', onBack }) {
  return (
    <div className="detail-bar">
      <button type="button" className="btn ghost" onClick={onBack}>
        {label}
      </button>
    </div>
  )
}
