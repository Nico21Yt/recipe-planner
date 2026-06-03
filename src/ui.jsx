import { useCallback, useRef, useState } from 'react'
import { UIContext } from './ui-context'

let seq = 0

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const resolver = useRef(null)

  const toast = useCallback((message, type = 'info', duration = 2600) => {
    const id = ++seq
    setToasts((list) => [...list, { id, message, type }])
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve
      setDialog({
        message,
        confirmText: opts.confirmText || '确定',
        cancelText: opts.cancelText || '取消',
        danger: opts.danger || false,
      })
    })
  }, [])

  function closeDialog(result) {
    setDialog(null)
    if (resolver.current) {
      resolver.current(result)
      resolver.current = null
    }
  }

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={'toast ' + t.type}>
            {t.message}
          </div>
        ))}
      </div>

      {dialog && (
        <div className="dialog-overlay" onClick={() => closeDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <p className="dialog-msg">{dialog.message}</p>
            <div className="dialog-actions">
              <button className="btn ghost" onClick={() => closeDialog(false)}>
                {dialog.cancelText}
              </button>
              <button
                className={'btn ' + (dialog.danger ? 'danger-solid' : 'primary')}
                onClick={() => closeDialog(true)}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  )
}
