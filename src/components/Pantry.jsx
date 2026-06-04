import { useMemo, useRef, useState } from 'react'
import { recognizePantryFromPhoto, suggestDishesFromIngredients } from '../ai'
import { emptyPantryItem, readPhoto } from '../storage'
import { useUI } from '../ui-context'
import PageHeader from './PageHeader'

const QUICK_SUGGESTIONS = ['鸡蛋', '牛奶', '番茄', '青菜', '大米', '酱油']

function nameKey(s) {
  return s.trim().toLowerCase()
}

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

export default function Pantry({
  pantry,
  onChange,
  recipes = [],
  onGenerateRecipe,
  genBusy = false,
}) {
  const { toast } = useUI()
  const photoRef = useRef(null)
  const [name, setName] = useState('')
  const [scanBusy, setScanBusy] = useState(false)
  const [confirmQueue, setConfirmQueue] = useState([])
  const [suggestBusy, setSuggestBusy] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [generatingDish, setGeneratingDish] = useState(null)

  const isEmpty = pantry.length === 0
  const pantryKeys = useMemo(
    () => new Set(pantry.map((i) => nameKey(i.name))),
    [pantry],
  )
  const recipeNames = useMemo(
    () => new Set(recipes.map((r) => nameKey(r.name))),
    [recipes],
  )

  const sorted = useMemo(
    () => [...pantry].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
    [pantry],
  )

  const currentConfirm = confirmQueue[0] ?? null
  const confirmTotal = confirmQueue.length

  function addByName(raw) {
    const trimmed = raw.trim()
    if (!trimmed) return false
    if (pantryKeys.has(nameKey(trimmed))) return false
    onChange([...pantry, emptyPantryItem(trimmed)])
    setName('')
    return true
  }

  function removeItem(id) {
    onChange(pantry.filter((i) => i.id !== id))
  }

  function filterNewNames(names) {
    const seen = new Set(pantryKeys)
    const out = []
    for (const raw of names) {
      const n = raw.trim()
      if (!n) continue
      const k = nameKey(n)
      if (seen.has(k)) continue
      seen.add(k)
      out.push(n)
    }
    return out
  }

  async function handlePhotoPick(e) {
    const file = (e.target.files || [])[0]
    e.target.value = ''
    if (!file) return
    setScanBusy(true)
    setConfirmQueue([])
    setSuggestions([])
    try {
      const photo = await readPhoto(file, 1280, 0.82)
      const names = await recognizePantryFromPhoto(photo.src)
      const fresh = filterNewNames(names)
      if (fresh.length === 0) {
        if (names.length > 0) {
          toast('识别到的食材都已经在清单里了', 'info', 2800)
        } else {
          toast('没认出食材，换一张更清晰的照片试试', 'info', 3200)
        }
        return
      }
      setConfirmQueue(fresh)
    } catch (err) {
      toast('识别失败：' + err.message, 'error', 4000)
    } finally {
      setScanBusy(false)
    }
  }

  function skipConfirm() {
    setConfirmQueue((q) => q.slice(1))
  }

  function acceptConfirm() {
    if (!currentConfirm) return
    addByName(currentConfirm)
    setConfirmQueue((q) => q.slice(1))
    toast('已添加「' + currentConfirm + '」', 'success', 1800)
  }

  async function loadDishSuggestions() {
    if (pantry.length === 0) {
      toast('先添加一些食材', 'info')
      return
    }
    setSuggestBusy(true)
    setSuggestions([])
    try {
      const names = pantry.map((i) => i.name.trim()).filter(Boolean)
      const dishes = await suggestDishesFromIngredients(names)
      if (dishes.length === 0) {
        toast('暂时没有合适的推荐，稍后再试', 'info', 2800)
        return
      }
      setSuggestions(dishes)
    } catch (err) {
      toast('推荐失败：' + err.message, 'error', 4000)
    } finally {
      setSuggestBusy(false)
    }
  }

  async function acceptDish(dishName) {
    if (!onGenerateRecipe || genBusy || generatingDish) return
    const trimmed = dishName.trim()
    if (!trimmed) return

    if (recipeNames.has(nameKey(trimmed))) {
      toast('菜谱里已有「' + trimmed + '」', 'info', 2800)
      setSuggestions((prev) => prev.filter((d) => d !== dishName))
      return
    }

    setGeneratingDish(trimmed)
    try {
      const recipe = await onGenerateRecipe(trimmed)
      if (recipe) {
        setSuggestions((prev) => prev.filter((d) => d !== dishName))
      }
    } finally {
      setGeneratingDish(null)
    }
  }

  const actionRow = (
    <div className="pantry-actions">
      <button
        type="button"
        className="btn pantry-action-btn"
        disabled={scanBusy || !!currentConfirm}
        onClick={() => photoRef.current?.click()}
      >
        {scanBusy ? '识别中…' : '拍照识别'}
      </button>
      <button
        type="button"
        className="btn pantry-action-btn pantry-action-secondary"
        disabled={pantry.length === 0 || suggestBusy || scanBusy}
        onClick={loadDishSuggestions}
      >
        {suggestBusy ? '推荐中…' : '能做什么菜'}
      </button>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handlePhotoPick}
      />
    </div>
  )

  return (
    <main className="content">
      <PageHeader
        title="有什么"
        sub="记录家里常备食材，拍照识别或看看能做什么菜。"
      />

      {currentConfirm && (
        <section className="plan-card single pantry-card pantry-confirm-card">
          <p className="pantry-confirm-label">
            识别到新食材（{confirmTotal} 个待确认）
          </p>
          <p className="pantry-confirm-name">{currentConfirm}</p>
          <div className="pantry-confirm-actions">
            <button
              type="button"
              className="btn pantry-confirm-skip"
              onClick={skipConfirm}
            >
              跳过
            </button>
            <button
              type="button"
              className="btn pantry-confirm-add ready"
              onClick={acceptConfirm}
            >
              添加
            </button>
          </div>
        </section>
      )}

      {suggestions.length > 0 && (
        <section className="plan-card single pantry-card pantry-suggest-card">
          <h3 className="pantry-suggest-title">可以试试这些菜</h3>
          <p className="pantry-suggest-hint">认可哪道就点「做这个」，会自动生成菜谱</p>
          <ul className="pantry-suggest-list">
            {suggestions.map((dish) => {
              const hasRecipe = recipeNames.has(nameKey(dish))
              const busyThis = generatingDish === dish
              return (
                <li key={dish} className="pantry-suggest-item">
                  <span className="pantry-suggest-dish">{dish}</span>
                  {hasRecipe ? (
                    <span className="pantry-suggest-done">已有菜谱</span>
                  ) : (
                    <button
                      type="button"
                      className="btn pantry-suggest-make"
                      disabled={genBusy || !!generatingDish || suggestBusy}
                      onClick={() => acceptDish(dish)}
                    >
                      {busyThis ? '生成中…' : '做这个'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {isEmpty ? (
        <section className="plan-card single pantry-card pantry-card-prominent">
          <div className="pantry-empty-head">
            <h3 className="pantry-empty-title">还没有食材</h3>
            <p className="pantry-empty-desc">
              手动添加，或拍一张冰箱照片自动识别。
            </p>
          </div>

          {actionRow}

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
        <section className="plan-card single pantry-card">
          {actionRow}

          <ul className="pantry-list">
            {sorted.map((item) => (
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

          <PantryAddBar
            name={name}
            setName={setName}
            onAdd={() => addByName(name)}
          />
        </section>
      )}
    </main>
  )
}
