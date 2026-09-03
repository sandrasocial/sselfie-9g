import { DEBUG_LOGS } from "@/lib/debug"
import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const PUBLIC_MIDDLEWARE_BYPASSES = [
  {
    prefix: "/api/webhooks/stripe",
    reason: "Stripe verifies the raw request body in the route handler.",
  },
  {
    prefix: "/api/webhooks/resend",
    reason: "Resend verifies Svix headers and the raw request body in the route handler.",
  },
  {
    prefix: "/api/cron/",
    reason: "Cron routes keep route-level CRON_SECRET checks.",
  },
  {
    prefix: "/.well-known/",
    reason:
      "Domain verification files (Apple Pay merchant validation for Stripe embedded checkout) must be served raw, with no session work or CSP headers.",
  },
] as const

function getPublicBypass(pathname: string) {
  return PUBLIC_MIDDLEWARE_BYPASSES.find(bypass => pathname.startsWith(bypass.prefix))
}

// Multipart upload handlers that must receive an untouched request body. This was a
// substring test for "/upload" anywhere in the path, which silently exempted any current
// or future route whose URL happened to contain that word. Each entry below is an actual
// upload handler under /api; every one of them authenticates in its own route handler.
const RAW_BODY_UPLOAD_PATHS: readonly RegExp[] = [
  /^\/api\/upload$/,
  /^\/api\/upload-image$/,
  /^\/api\/upload-highlight-overlay$/,
  /^\/api\/app-v3\/upload-selfie$/,
  /^\/api\/brand-assets\/upload$/,
  /^\/api\/blueprint\/upload-selfies$/,
  /^\/api\/admin\/content-kit\/assets\/upload$/,
  /^\/api\/admin\/content-kit\/shoots\/upload(-token)?$/,
  /^\/api\/feed\/[^/]+\/upload-profile-image$/,
] as const

function isRawBodyUploadRoute(pathname: string, method: string): boolean {
  // Training uploads post multipart ZIPs and image batches across several routes.
  if (pathname.startsWith("/api/training/")) {
    return method === "POST"
  }
  return RAW_BODY_UPLOAD_PATHS.some(pattern => pattern.test(pathname))
}

export async function middleware(request: NextRequest) {
  if (DEBUG_LOGS) {
    console.log("[v0] middleware:", request.nextUrl.pathname)
  }

  if (isRawBodyUploadRoute(request.nextUrl.pathname, request.method)) {
    if (DEBUG_LOGS) {
      console.log(
        "[v0] Upload route detected - completely bypassing all middleware to preserve request body"
      )
    }
    return NextResponse.next()
  }

  const publicBypass = getPublicBypass(request.nextUrl.pathname)
  if (publicBypass) {
    if (DEBUG_LOGS) {
      console.log("[v0] Skipping middleware for public route:", publicBypass.prefix)
    }
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
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live https://js.stripe.com https://www.googletagmanager.com https://eu-assets.i.posthog.com",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.v0.app https://va.vercel-scripts.com https://vercel.live https://vercel.com https://*.pusher.com wss://*.pusher.com https://blob.vercel-storage.com https://*.blob.vercel-storage.com https://ai-gateway.vercel.sh https://*.vercel.sh https://gateway.ai.cloudflare.com https://openrouter.ai https://*.openrouter.ai https://api.anthropic.com https://api.openai.com https://*.vercel-ai.com https://*.vercel.app https://replicate.com https://*.replicate.com https://replicate.delivery https://api.replicate.com https://*.anthropic.com https://*.supabase.co https://api.stripe.com https://js.stripe.com https://*.stripe.com https://*.upstash.io https://*.neon.tech https://*.sentry.io https://o4510612788346880.ingest.us.sentry.io https://*.postimg.cc https://i.postimg.cc https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com https://fonts.googleapis.com https://fonts.gstatic.com https://eu.i.posthog.com",
    "frame-src 'self' https://vercel.live https://js.stripe.com https://*.stripe.com https://player.vimeo.com https://*.vimeo.com https://www.youtube.com https://*.youtube.com",
    "media-src 'self' blob: data: https://blob.vercel-storage.com https://*.blob.vercel-storage.com https://replicate.delivery https:",
  ].join("; ")

  response.headers.set("Content-Security-Policy", cspHeader)

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
