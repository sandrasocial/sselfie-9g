import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
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
