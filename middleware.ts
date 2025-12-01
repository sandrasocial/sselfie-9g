import { assertAIEnv } from "@/lib/env"
import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

assertAIEnv()

export async function middleware(request: NextRequest) {
  console.log("[v0] Middleware called for:", request.nextUrl.pathname)

  if (request.nextUrl.pathname.startsWith("/api/webhooks/stripe")) {
    console.log("[v0] Skipping middleware for Stripe webhook")
    return NextResponse.next()
  }

  if (request.nextUrl.pathname.startsWith("/api/freebie/")) {
    console.log("[v0] Skipping auth middleware for public freebie API")
    return NextResponse.next()
  }

  const response = await updateSession(request)

  const referer = request.headers.get("referer")
  if (referer) {
    response.headers.set("x-previous-url", referer)
  }

  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' https://va.vercel-scripts.com https://vercel.live https://js.stripe.com",
    "style-src 'self' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.v0.app https://va.vercel-scripts.com https://vercel.live https://*.pusher.com wss://*.pusher.com https://blob.vercel-storage.com https://*.blob.vercel-storage.com https://ai-gateway.vercel.sh https://*.vercel.sh https://gateway.ai.cloudflare.com https://api.anthropic.com https://api.openai.com https://*.vercel-ai.com https://*.vercel.app https://replicate.com https://*.replicate.com https://replicate.delivery https://api.replicate.com https://*.anthropic.com https://*.supabase.co https://api.stripe.com https://js.stripe.com https://*.stripe.com https://*.upstash.io https://*.neon.tech",
    "frame-src 'self' https://vercel.live https://js.stripe.com https://*.stripe.com",
    "media-src 'self' blob: data:",
    "frame-ancestors 'none'",
  ].join("; ")

  response.headers.set("Content-Security-Policy", cspHeader)

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
