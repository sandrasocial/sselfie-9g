import { NextResponse } from "next/server"

export const dynamic = "force-static"

export async function GET() {
  const swCode = `
// SSELFIE Service Worker - v2
const CACHE_VERSION = "sselfie-v2"
const STATIC_CACHE = CACHE_VERSION + "-static"
const DYNAMIC_CACHE = CACHE_VERSION + "-dynamic"
const MAX_DYNAMIC_CACHE_SIZE = 50

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.png"
]

const limitCacheSize = (cacheName, maxSize) => {
  caches.open(cacheName).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > maxSize) {
        cache.delete(keys[0]).then(() => limitCacheSize(cacheName, maxSize))
      }
    })
  })
}

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker v2...")
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Caching static assets")
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error("[SW] Failed to cache assets:", err)
      })
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker v2...")
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
  
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'SW_UPDATED',
        version: CACHE_VERSION
      })
    })
  })
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") return

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith("http")) return

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Don't cache API responses
          return response
        })
        .catch(err => {
          console.error("[SW] API fetch failed:", err)
          // Return a custom offline response for API failures
          return new Response(
            JSON.stringify({ error: "Offline", message: "No internet connection" }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" }
            }
          )
        })
    )
    return
  }

  if (
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style" ||
    request.destination === "script"
  ) {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(fetchResponse => {
          return caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, fetchResponse.clone())
            limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE)
            return fetchResponse
          })
        })
      }).catch(() => {
        // Return a fallback for images if offline
        if (request.destination === "image") {
          return caches.match("/icon-192.png")
        }
      })
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // Only cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone()
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseToCache)
            limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(request).then(response => {
          if (response) {
            return response
          }
          // Return offline page for navigation requests
          if (request.mode === "navigate") {
            return caches.match("/")
          }
        })
      })
  )
})

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
      }).then(() => {
        return self.registration.unregister()
      })
    )
  }
})

console.log("[SW] Service worker v2 script loaded")
`

  return new NextResponse(swCode, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  })
}
