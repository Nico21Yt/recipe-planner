import { useMemo, useState } from 'react'
import { emptyPantryItem } from '../storage'
import PageHeader from './PageHeader'

export default function Pantry({ pantry, onChange }) {
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')

  const sorted = useMemo(
    () =>
      [...pantry].sort((a, b) =>
        a.name.localeCompare(b.name, 'zh-CN'),
      ),
    [pantry],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((i) => i.name.toLowerCase().includes(q))
  }, [sorted, search])

  function addItem() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (
      pantry.some((i) => i.name.trim().toLowerCase() === trimmed.toLowerCase())
    ) {
      return
    }
    onChange([...pantry, emptyPantryItem(trimmed)])
    setName('')
  }

  function removeItem(id) {
    onChange(pantry.filter((i) => i.id !== id))
  }

  return (
    <main className="content">
      <PageHeader
        title="有什么"
        sub="记下家里常备的食材，换设备也会同步。"
      />

      <div className="toolbar pantry-toolbar">
        <input
          className="search"
          placeholder="搜索食材…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <section className="plan-card single pantry-card">
        {filtered.length > 0 ? (
          <ul className="pantry-list">
            {filtered.map((item) => (
              <li key={item.id} className="pantry-item">
                <span className="pantry-item-name">{item.name}</span>
                <button
                  type="button"
                  className="dish-menu-dismiss"
                  aria-label={'去掉「' + item.name + '」'}
                  onClick={() => removeItem(item.id)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint plan-empty-hint">
            {pantry.length === 0
              ? '还没有记录，在下方加上家里有的食材吧。'
              : '没有匹配的食材。'}
          </p>
        )}

        <div className="pantry-add">
          <input
            className="dish-input"
            placeholder="食材名称，如 鸡蛋、牛奶"
            value={name}
            enterKeyHint="done"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addItem()
              }
            }}
          />
          <button
            type="button"
            className="btn primary small"
            disabled={!name.trim()}
            onClick={addItem}
          >
            添加
          </button>
        </div>
      </section>
    </main>
  )
}
