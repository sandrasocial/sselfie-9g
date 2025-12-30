import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { sanitizeRedirect } from "@/lib/security/url-validator"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/studio"

  const safeNext = sanitizeRedirect(next, "/studio")

  console.log("[v0] Auth confirm - Full URL:", request.url)
  console.log("[v0] Auth confirm - token_hash:", token_hash ? "present" : "missing")
  console.log("[v0] Auth confirm - type:", type)
  console.log("[v0] Auth confirm - validated next:", safeNext)

  if (token_hash && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // Ignore - handled by middleware
            }
          },
        },
      },
    )

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      console.log("[v0] Auth verification successful, redirecting to:", safeNext)
      return NextResponse.redirect(new URL(safeNext, request.url))
    }

    console.error("[v0] Auth verification error:", error)
    return NextResponse.redirect(new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, request.url))
  }

  console.error("[v0] Auth confirm - Missing required parameters")
  return NextResponse.redirect(new URL("/auth/error?error=Missing authentication token", request.url))
}
