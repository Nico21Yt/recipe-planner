// 手机端：键盘浮在页面上方，不压缩整页高度（避免内容被顶上去）
let layoutHeight = Math.round(window.innerHeight)

function isKeyboardOpen() {
  const vv = window.visualViewport
  if (!vv) return false
  return window.innerHeight - vv.height > 72
}

function syncViewportHeight() {
  if (!window.matchMedia('(max-width: 720px)').matches) return

  if (!isKeyboardOpen()) {
    layoutHeight = Math.round(window.innerHeight)
  }
  document.documentElement.style.setProperty('--app-height', `${layoutHeight}px`)
}

function restoreAfterKeyboard() {
  if (!window.matchMedia('(max-width: 720px)').matches) return
  layoutHeight = Math.round(window.innerHeight)
  document.documentElement.style.setProperty('--app-height', `${layoutHeight}px`)
}

syncViewportHeight()
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
      setTimeout(restoreAfterKeyboard, 80)
      setTimeout(restoreAfterKeyboard, 320)
    }
  },
  true,
)
