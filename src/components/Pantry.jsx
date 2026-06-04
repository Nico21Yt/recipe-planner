import { useMemo, useState } from 'react'
import { emptyPantryItem, normalizePantryItem } from '../storage'
import PageHeader from './PageHeader'

export default function Pantry({ pantry, onChange }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
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
    return sorted.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.amount.toLowerCase().includes(q) ||
        i.note.toLowerCase().includes(q),
    )
  }, [sorted, search])

  function addItem() {
    const trimmed = name.trim()
    if (!trimmed) return
    const item = emptyPantryItem(trimmed)
    item.amount = amount.trim()
    onChange([...pantry, item])
    setName('')
    setAmount('')
  }

  function updateItem(id, patch) {
    onChange(
      pantry.map((i) =>
        i.id === id ? normalizePantryItem({ ...i, ...patch }) : i,
      ),
    )
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
                <div className="pantry-item-main">
                  <span className="pantry-item-name">{item.name}</span>
                  <input
                    className="pantry-item-amount"
                    placeholder="数量（可选）"
                    value={item.amount}
                    onChange={(e) =>
                      updateItem(item.id, { amount: e.target.value })
                    }
                  />
                </div>
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
            className="dish-input pantry-name-input"
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
          <input
            className="dish-input pantry-amount-input"
            placeholder="数量（可选）"
            value={amount}
            enterKeyHint="done"
            onChange={(e) => setAmount(e.target.value)}
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
