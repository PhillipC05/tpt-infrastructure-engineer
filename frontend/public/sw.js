const CACHE = 'tpt-v2'
const OFFLINE_PAGE = '/index.html'

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

function tryCacheResponse(request, response) {
  if (!response.ok || response.type === 'opaque') return
  try {
    const clone = response.clone()
    caches.open(CACHE).then(cache => cache.put(request, clone))
  } catch {}
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // API: network-first, fall back to cached response
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          tryCacheResponse(event.request, response)
          return response
        })
        .catch(() =>
          caches.match(event.request).then(
            cached => cached ?? new Response(
              JSON.stringify({ detail: 'You are offline', offline: true }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            )
          )
        )
    )
    return
  }

  // Static assets + navigation: cache-first, network fallback, offline fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request)
        .then(response => {
          tryCacheResponse(event.request, response)
          return response
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_PAGE).then(
              r => r ?? new Response('Offline', { status: 503 })
            )
          }
          return new Response('', { status: 503 })
        })
    })
  )
})
