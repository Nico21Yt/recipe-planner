// 手机端：键盘弹出时不压缩外壳、不让中间 .content 被顶上去
function isMobile() {
  return window.matchMedia('(max-width: 720px)').matches
}

function pinWindowScroll() {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

const lockTop = new WeakMap()
const lockTimer = new WeakMap()

function startContentScrollLock(scrollEl) {
  const top = scrollEl.scrollTop
  lockTop.set(scrollEl, top)
  const fix = () => {
    scrollEl.scrollTop = lockTop.get(scrollEl)
    pinWindowScroll()
  }
  fix()
  if (lockTimer.has(scrollEl)) clearInterval(lockTimer.get(scrollEl))
  lockTimer.set(scrollEl, setInterval(fix, 40))
}

function stopContentScrollLock(scrollEl) {
  const id = lockTimer.get(scrollEl)
  if (id) clearInterval(id)
  lockTimer.delete(scrollEl)
  lockTop.delete(scrollEl)
}

function onFocusIn(e) {
  if (!isMobile()) return
  const t = e.target
  if (!t?.matches?.('input, textarea, select')) return
  pinWindowScroll()
  const scrollEl = t.closest('.content')
  if (scrollEl) startContentScrollLock(scrollEl)
}

function onFocusOut(e) {
  if (!isMobile()) return
  const t = e.target
  if (!t?.matches?.('input, textarea, select')) return
  const scrollEl = t.closest('.content')
  setTimeout(() => {
    if (scrollEl) stopContentScrollLock(scrollEl)
    pinWindowScroll()
  }, 120)
  setTimeout(pinWindowScroll, 360)
}

pinWindowScroll()
document.addEventListener('focusin', onFocusIn, true)
document.addEventListener('focusout', onFocusOut, true)

window.visualViewport?.addEventListener('scroll', () => {
  if (!isMobile()) return
  pinWindowScroll()
  document.querySelectorAll('.content').forEach((el) => {
    if (lockTimer.has(el) && lockTop.has(el)) {
      el.scrollTop = lockTop.get(el)
    }
  })
})

window.addEventListener('orientationchange', () => {
  setTimeout(pinWindowScroll, 100)
  setTimeout(pinWindowScroll, 400)
})
