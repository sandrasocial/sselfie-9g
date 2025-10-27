/// <reference lib="webworker" />

const CACHE_NAME = "sselfie-v1"
const STATIC_ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"]

const sw = self as unknown as ServiceWorkerGlobalScope

// Install event - cache static assets
sw.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }),
  )
  sw.skipWaiting()
})

// Activate event - clean up old caches
sw.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    }),
  )
  sw.clients.claim()
})

// Fetch event - serve from cache, fallback to network
sw.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return

  // Skip API requests
  if (event.request.url.includes("/api/")) return

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response
      }

      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response
        }

        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      })
    }),
  )
})

export {}
