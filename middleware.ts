import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  console.log("[v0] Middleware called for:", request.nextUrl.pathname)

  const isUploadRoute =
    request.nextUrl.pathname.includes("/upload") ||
    (request.nextUrl.pathname.includes("/training") && request.method === "POST")

  if (isUploadRoute) {
    console.log("[v0] Upload route detected - completely bypassing all middleware to preserve request body")
    return NextResponse.next()
  }

  if (request.nextUrl.pathname.startsWith("/api/webhooks/stripe")) {
    console.log("[v0] Skipping middleware for Stripe webhook")
    return NextResponse.next()
  }

  if (request.nextUrl.pathname.startsWith("/api/cron/")) {
    console.log("[v0] Skipping middleware for cron routes")
    return NextResponse.next()
  }

  if (request.nextUrl.pathname.startsWith("/api/freebie/")) {
    console.log("[v0] Skipping auth middleware for public freebie API")
    return NextResponse.next()
  }

  // Skip middleware for Sentry monitoring tunnel route
  if (request.nextUrl.pathname === "/monitoring") {
    return NextResponse.next()
  }

  const response = await updateSession(request)

  const referer = request.headers.get("referer")
  if (referer) {
    response.headers.set("x-previous-url", referer)
  }

  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live https://js.stripe.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.v0.app https://va.vercel-scripts.com https://vercel.live https://*.pusher.com wss://*.pusher.com https://blob.vercel-storage.com https://*.blob.vercel-storage.com https://ai-gateway.vercel.sh https://*.vercel.sh https://gateway.ai.cloudflare.com https://api.anthropic.com https://api.openai.com https://*.vercel-ai.com https://*.vercel.app https://replicate.com https://*.replicate.com https://replicate.delivery https://api.replicate.com https://*.anthropic.com https://*.supabase.co https://api.stripe.com https://js.stripe.com https://*.stripe.com https://*.upstash.io https://*.neon.tech https://*.sentry.io https://o4510612788346880.ingest.us.sentry.io https://*.postimg.cc https://i.postimg.cc",
    "frame-src 'self' https://vercel.live https://js.stripe.com https://*.stripe.com https://player.vimeo.com https://*.vimeo.com https://www.youtube.com https://*.youtube.com",
    "media-src 'self' blob: data: https://blob.vercel-storage.com https://*.blob.vercel-storage.com https://replicate.delivery https:",
  ].join("; ")

  response.headers.set("Content-Security-Policy", cspHeader)

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
