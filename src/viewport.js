// 同步可见区域高度；键盘收起后恢复，避免页面像被放大/卡住
function syncViewportHeight() {
  const vv = window.visualViewport
  const h = Math.round(vv?.height ?? window.innerHeight)
  document.documentElement.style.setProperty('--app-height', `${h}px`)
}

function scrollLayoutToTop() {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

function restoreAfterKeyboard() {
  syncViewportHeight()
  scrollLayoutToTop()
  requestAnimationFrame(() => {
    syncViewportHeight()
    scrollLayoutToTop()
  })
  ;[50, 180, 400].forEach((ms) => {
    setTimeout(() => {
      syncViewportHeight()
      scrollLayoutToTop()
    }, ms)
  })
}

syncViewportHeight()
window.visualViewport?.addEventListener('resize', syncViewportHeight)
window.visualViewport?.addEventListener('scroll', syncViewportHeight)
window.addEventListener('resize', syncViewportHeight)
window.addEventListener('orientationchange', () => {
  setTimeout(restoreAfterKeyboard, 80)
  setTimeout(restoreAfterKeyboard, 320)
})

document.addEventListener(
  'focusout',
  (e) => {
    const t = e.target
    if (
      t &&
      (t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.tagName === 'SELECT')
    ) {
      restoreAfterKeyboard()
    }
  },
  true,
)
