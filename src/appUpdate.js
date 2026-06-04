/** 从 index.html 里解析当前构建的 JS 资源 id（Vite 带 hash 的文件名） */
function parseMainScriptId(html) {
  const m = html.match(/assets\/index-([\w-]+)\.js/)
  return m?.[1] || null
}

function currentMainScriptId() {
  const el = document.querySelector('script[type="module"]')
  if (!el?.src) return null
  const m = el.src.match(/assets\/index-([\w-]+)\.js/)
  return m?.[1] || null
}

async function fetchLatestIndexHtml() {
  const url = new URL('index.html', window.location.href)
  url.searchParams.set('_', String(Date.now()))
  const res = await fetch(url.href, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  })
  if (!res.ok) throw new Error('无法检查应用版本')
  return res.text()
}

async function clearAppCaches() {
  if (!('caches' in window)) return
  const keys = await caches.keys()
  await Promise.all(keys.map((k) => caches.delete(k)))
}

async function activateWaitingServiceWorker(registration) {
  const waiting = registration.waiting
  if (!waiting) return false

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('SW 激活超时')), 8000)
    const onChange = () => {
      clearTimeout(t)
      navigator.serviceWorker.removeEventListener('controllerchange', onChange)
      resolve()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onChange)
    waiting.postMessage({ type: 'SKIP_WAITING' })
  })
  return true
}

/**
 * 检查线上是否有新构建；有则清缓存并整页重载（类似浏览器刷新）。
 * @returns {Promise<boolean>} 是否即将重载页面
 */
export async function applyAppUpdateIfNeeded() {
  if (import.meta.env.DEV) return false

  let needsReload = false

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.update()
        if (reg.waiting) {
          await activateWaitingServiceWorker(reg)
          needsReload = true
        }
      }
    } catch {
      /* 忽略 SW 异常，仍尝试比对 index.html */
    }
  }

  try {
    const html = await fetchLatestIndexHtml()
    const remoteId = parseMainScriptId(html)
    const localId = currentMainScriptId()
    if (remoteId && localId && remoteId !== localId) {
      needsReload = true
    }
  } catch {
    /* 离线或检查失败时不阻断数据刷新 */
  }

  if (!needsReload) return false

  await clearAppCaches()
  window.location.reload()
  return true
}
