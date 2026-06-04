// 仅同步可见区域高度（不位移整页），配合 viewport interactive-widget=resizes-content
function syncViewportHeight() {
  const h = window.visualViewport?.height ?? window.innerHeight
  document.documentElement.style.setProperty('--app-height', `${Math.round(h)}px`)
}

syncViewportHeight()
window.visualViewport?.addEventListener('resize', syncViewportHeight)
window.addEventListener('resize', syncViewportHeight)
window.addEventListener('orientationchange', () => {
  setTimeout(syncViewportHeight, 80)
  setTimeout(syncViewportHeight, 320)
})
