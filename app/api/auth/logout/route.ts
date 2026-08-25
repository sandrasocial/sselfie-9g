import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createServerClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createServerClient()

    console.log("[v0] Logging out user...")

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("[v0] Logout error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] User logged out successfully")

    const response = NextResponse.json({ success: true })
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    }
    // Rotate the server-owned anonymous identity and leave a short-lived,
    // HTTP-only reset signal. The next provider bootstrap clears the persisted
    // PostHog SDK identity before anonymous activity can be captured.
    response.cookies.set("sselfie_anon_id", randomUUID(), {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 365,
    })
    response.cookies.set("sselfie_posthog_reset", "1", {
      ...cookieOptions,
      maxAge: 60 * 5,
    })
    return response
  } catch (error) {
    console.error("[v0] Error during logout:", error)
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 })
  }
}
