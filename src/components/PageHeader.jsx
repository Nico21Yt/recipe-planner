export default function PageHeader({ title, sub, children }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      {children}
    </div>
  )
}
