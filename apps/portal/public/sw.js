const CACHE_NAME = 'kind-v1'
const STATIC_ASSETS = [
  '/dashboard',
  '/login',
  '/offline',
]

// Install — pre-cache shell pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  )
  self.skipWaiting()
})

// Activate — delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch strategy:
// - API calls → network only (never cache auth/data)
// - Navigation → network first, fallback to cache, then /offline
// - Static assets → cache first
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // API routes — network only, no caching
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    return
  }

  // Navigation requests — network first, fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          return res
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline') || new Response('Offline', { status: 503 }))
        )
    )
    return
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(request, clone))
        }
        return res
      })
    })
  )
})

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try { payload = event.data.json() } catch { payload = { title: 'K.I.N.D', body: event.data.text() } }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'K.I.N.D', {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.tag || 'kind-notification',
      data: payload.url ? { url: payload.url } : undefined,
      vibrate: [200, 100, 200],
    })
  )
})

// Notification click — open or focus the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin))
      if (existing) {
        existing.focus()
        existing.navigate(targetUrl)
      } else {
        self.clients.openWindow(targetUrl)
      }
    })
  )
})
