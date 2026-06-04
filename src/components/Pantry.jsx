import { useMemo, useState } from 'react'
import { emptyPantryItem } from '../storage'
import PageHeader from './PageHeader'

const QUICK_SUGGESTIONS = ['鸡蛋', '牛奶', '番茄', '青菜', '大米', '酱油']

function PantryAddBar({ name, setName, onAdd, prominent }) {
  const canAdd = !!name.trim()
  return (
    <div className={'pantry-add' + (prominent ? ' pantry-add-prominent' : '')}>
      <input
        className="dish-input"
        placeholder="输入食材名称"
        value={name}
        enterKeyHint="done"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canAdd) {
            e.preventDefault()
            onAdd()
          }
        }}
      />
      <button
        type="button"
        className={'btn pantry-add-btn' + (canAdd ? ' ready' : '')}
        disabled={!canAdd}
        onClick={onAdd}
      >
        添加
      </button>
    </div>
  )
}

export default function Pantry({ pantry, onChange }) {
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const isEmpty = pantry.length === 0

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

  function addByName(raw) {
    const trimmed = raw.trim()
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
        sub="记录家里常备食材，随时查看和同步。"
      />

      {isEmpty ? (
        <section className="plan-card single pantry-card pantry-card-prominent">
          <div className="pantry-empty-head">
            <h3 className="pantry-empty-title">还没有食材</h3>
            <p className="pantry-empty-desc">
              先添加几个常备食材，买菜前翻一眼很方便。
            </p>
          </div>

          <div className="pantry-quick">
            <span className="pantry-quick-label">一键添加</span>
            <div className="pantry-quick-chips">
              {QUICK_SUGGESTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="pantry-quick-chip"
                  onClick={() => addByName(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <PantryAddBar
            name={name}
            setName={setName}
            onAdd={() => addByName(name)}
            prominent
          />
        </section>
      ) : (
        <>
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
              <p className="hint plan-empty-hint">没有匹配的食材。</p>
            )}

            <PantryAddBar
              name={name}
              setName={setName}
              onAdd={() => addByName(name)}
            />
          </section>
        </>
      )}
    </main>
  )
}
