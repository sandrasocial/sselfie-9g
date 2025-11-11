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
    // Return immediately without any processing to avoid consuming the body
    return NextResponse.next()
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
