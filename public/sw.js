// 极简 Service Worker：缓存 app 静态外壳，让二次打开更快、弱网也能进入。
// 数据接口（/api/*）始终走网络，保证多人共享数据是最新的。
const CACHE = 'recipe-planner-v2'
const SHELL = ['./manifest.webmanifest', './icon-192.png', './icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // 接口与跨域请求不缓存，始终走网络
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return

  // HTML 页面（导航请求）：网络优先，避免部署后引用到旧的资源文件
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')))
    return
  }

  // 其它静态资源：缓存优先，命中后后台更新
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return resp
        })
        .catch(() => cached)
      return cached || fetched
    }),
  )
})
