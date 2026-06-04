import { useCallback, useEffect, useRef, useState } from 'react'

const THRESHOLD = 56
const MAX_PULL = 100

export default function PullToRefresh({ className = '', onRefresh, children }) {
  const scrollRef = useRef(null)
  const [pull, setPull] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const pullRef = useRef(0)
  const startY = useRef(0)
  const canPull = useRef(false)
  const pulling = useRef(false)
  const enabled = useRef(true)

  const setPullSafe = useCallback((v) => {
    const n = Math.max(0, Math.min(MAX_PULL, v))
    pullRef.current = n
    setPull(n)
  }, [])

  const runRefresh = useCallback(async () => {
    setDragging(false)
    setRefreshing(true)
    setPullSafe(THRESHOLD)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
      setPullSafe(0)
    }
  }, [onRefresh, setPullSafe])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)')
    const sync = () => {
      enabled.current = mq.matches
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onStart = (e) => {
      if (!enabled.current || refreshing) return
      if (el.scrollTop > 1) return
      canPull.current = true
      pulling.current = false
      startY.current = e.touches[0].clientY
    }

    const onMove = (e) => {
      if (!enabled.current || refreshing || !canPull.current) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) {
        if (!pulling.current) setPullSafe(0)
        return
      }
      if (el.scrollTop > 1) {
        canPull.current = false
        pulling.current = false
        setDragging(false)
        setPullSafe(0)
        return
      }
      pulling.current = true
      setDragging(true)
      e.preventDefault()
      setPullSafe(dy * 0.5)
    }

    const onEnd = () => {
      if (!enabled.current || refreshing) return
      if (!pulling.current) {
        canPull.current = false
        return
      }
      pulling.current = false
      canPull.current = false
      if (pullRef.current >= THRESHOLD) {
        void runRefresh()
      } else {
        setDragging(false)
        setPullSafe(0)
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [refreshing, runRefresh, setPullSafe])

  const ready = pull >= THRESHOLD
  const showHint = pull > 6 || refreshing

  const hostClass = [
    'ptr-host',
    className,
    dragging ? 'ptr-dragging' : '',
    ready && !refreshing ? 'ptr-ready' : '',
    refreshing ? 'ptr-refreshing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <main ref={scrollRef} className={hostClass}>
      <div
        className="ptr-indicator"
        style={{ height: refreshing ? THRESHOLD : pull }}
        aria-hidden={!showHint}
      >
        {showHint && (
          <div className="ptr-indicator-inner">
            {refreshing ? (
              <>
                <span className="ptr-spinner" />
                <span className="ptr-label">正在刷新…</span>
              </>
            ) : ready ? (
              <>
                <span className="ptr-spinner" />
                <span className="ptr-label">松开刷新</span>
              </>
            ) : (
              <>
                <span className="ptr-arrow">↓</span>
                <span className="ptr-label">下拉刷新</span>
              </>
            )}
          </div>
        )}
      </div>
      <div
        className="ptr-inner"
        style={{
          transform: `translateY(${refreshing ? THRESHOLD : pull}px)`,
        }}
      >
        {children}
      </div>
    </main>
  )
}
