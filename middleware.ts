import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  console.log("[v0] Middleware called for:", request.nextUrl.pathname)

  if (request.nextUrl.pathname === "/sw.js") {
    console.log("[v0] Serving service worker from middleware")

    const serviceWorkerCode = `
// Service Worker for SSelfie PWA
const CACHE_NAME = 'sselfie-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
`

    return new NextResponse(serviceWorkerCode, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Service-Worker-Allowed": "/",
      },
    })
  }

  if (request.nextUrl.pathname.startsWith("/api/webhooks/stripe")) {
    console.log("[v0] Skipping middleware for Stripe webhook")
    return NextResponse.next()
  }

  if (request.nextUrl.pathname.startsWith("/api/freebie/")) {
    console.log("[v0] Skipping auth middleware for public freebie API")
    return NextResponse.next()
  }

  const response = await updateSession(request)

  // Preserve the previous URL in a custom header for navigation context
  const referer = request.headers.get("referer")
  if (referer) {
    response.headers.set("x-previous-url", referer)
  }

  return response
}

export const config = {
  matcher: ["/sw.js", "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
