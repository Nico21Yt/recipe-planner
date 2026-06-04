import { useEffect, useRef, useState } from 'react'
import { STATUS } from '../storage'

export default function StatusMenu({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = STATUS[value] || STATUS.todo

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div className="status-menu" ref={ref}>
      <button
        type="button"
        className={'status-menu-trigger' + (open ? ' open' : '')}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="status-dot"
          style={{ background: current.color }}
          aria-hidden
        />
        <span className="status-menu-label">{current.label}</span>
        <span className="status-menu-chevron" aria-hidden />
      </button>
      {open && (
        <ul className="status-menu-list" role="listbox">
          {Object.entries(STATUS).map(([key, st]) => (
            <li key={key}>
              <button
                type="button"
                role="option"
                aria-selected={value === key}
                className={'status-menu-item' + (value === key ? ' active' : '')}
                onClick={() => {
                  onChange(key)
                  setOpen(false)
                }}
              >
                <span
                  className="status-dot"
                  style={{ background: st.color }}
                  aria-hidden
                />
                <span>{st.label}</span>
                {value === key && (
                  <span className="status-menu-check" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
