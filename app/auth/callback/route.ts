import { createClient } from "@/lib/supabase/server"
import { syncUserWithNeon } from "@/lib/user-sync"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  console.log("[v0] ===== AUTH CALLBACK ROUTE HIT =====")
  console.log("[v0] Full URL:", requestUrl.toString())
  console.log("[v0] All query params:", Object.fromEntries(requestUrl.searchParams))
  console.log("[v0] Code present:", !!code)
  console.log("[v0] Origin:", origin)

  if (code) {
    const supabase = await createClient()
    console.log("[v0] Attempting to exchange code for session...")

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      console.log("[v0] ✅ Session established for user:", data.user.email)
      console.log("[v0] User metadata:", data.user.user_metadata)
      console.log("[v0] Recovery sent at:", data.user.recovery_sent_at)

      const isPasswordRecovery =
        data.user.recovery_sent_at !== null || requestUrl.searchParams.get("type") === "recovery"

      if (isPasswordRecovery) {
        console.log("[v0] 🔐 Password recovery detected, redirecting to setup-password")
        return NextResponse.redirect(`${origin}/auth/setup-password`)
      }

      console.log("[v0] 👤 Regular auth, syncing user with Neon")
      await syncUserWithNeon(data.user.id, data.user.email!, data.user.user_metadata?.name)

      return NextResponse.redirect(`${origin}/studio`)
    } else {
      console.error("[v0] ❌ Error exchanging code:", error)
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent(error?.message || "Authentication failed")}`,
      )
    }
  }

  console.log("[v0] ⚠️ No code provided in callback, redirecting to home")
  return NextResponse.redirect(`${origin}/`)
}
