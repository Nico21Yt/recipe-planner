// iOS 内置浏览器（Safari / Chrome / 微信等）会把地址栏算在视口外，
// 仅用 100vh/100dvh 容易和自带顶栏、底栏叠成「双下巴」。用 visualViewport 对齐可见区域。
function syncViewportVars() {
  const vv = window.visualViewport
  if (vv) {
    document.documentElement.style.setProperty('--app-height', `${Math.round(vv.height)}px`)
    document.documentElement.style.setProperty('--app-offset-top', `${Math.round(vv.offsetTop)}px`)
  } else {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
    document.documentElement.style.setProperty('--app-offset-top', '0px')
  }
}

syncViewportVars()
window.visualViewport?.addEventListener('resize', syncViewportVars)
window.visualViewport?.addEventListener('scroll', syncViewportVars)
window.addEventListener('resize', syncViewportVars)
window.addEventListener('orientationchange', () => {
  setTimeout(syncViewportVars, 80)
  setTimeout(syncViewportVars, 320)
})
