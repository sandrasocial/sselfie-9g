import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { LIVE_MEMBER_APP_PATH, normalizeLegacyStudioRedirect, sanitizeRedirect } from "@/lib/security/url-validator"
import { syncUserWithNeon } from "@/lib/user-sync"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash") ?? searchParams.get("token")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? searchParams.get("redirect_to") ?? LIVE_MEMBER_APP_PATH

  const safeNext = normalizeLegacyStudioRedirect(sanitizeRedirect(next, LIVE_MEMBER_APP_PATH))

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

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      const confirmedUser = data.user
      if (confirmedUser?.id && confirmedUser.email) {
        const displayName =
          confirmedUser.user_metadata?.name ||
          confirmedUser.user_metadata?.display_name ||
          confirmedUser.user_metadata?.first_name ||
          confirmedUser.email.split("@")[0]
        const neonUser = await syncUserWithNeon(confirmedUser.id, confirmedUser.email, displayName)
        if (!neonUser) {
          console.error("[v0] Auth verification succeeded, but application user sync failed")
        }
      }
      console.log("[v0] Auth verification successful, redirecting to:", safeNext)
      return NextResponse.redirect(new URL(safeNext, request.url))
    }

    console.error("[v0] Auth verification error:", error)
    return NextResponse.redirect(new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, request.url))
  }

  console.error("[v0] Auth confirm - Missing required parameters")
  return NextResponse.redirect(new URL("/auth/error?error=Missing authentication token", request.url))
}
