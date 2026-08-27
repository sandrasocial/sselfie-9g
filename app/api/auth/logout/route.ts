import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { rotateAnonymousAnalyticsIdentity } from "@/lib/analytics/identity-cookies"

export async function POST() {
  try {
    const supabase = await createServerClient()

    console.log("[v0] Logging out user...")

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("[v0] Logout error:", error)
      const response = NextResponse.json({ error: error.message }, { status: 500 })
      rotateAnonymousAnalyticsIdentity(response)
      return response
    }

    console.log("[v0] User logged out successfully")

    const response = NextResponse.json({ success: true })
    // Rotate the server-owned anonymous identity and leave a short-lived,
    // HTTP-only reset signal. The next provider bootstrap clears the persisted
    // PostHog SDK identity before anonymous activity can be captured.
    rotateAnonymousAnalyticsIdentity(response)
    return response
  } catch (error) {
    console.error("[v0] Error during logout:", error)
    const response = NextResponse.json({ error: "Failed to logout" }, { status: 500 })
    rotateAnonymousAnalyticsIdentity(response)
    return response
  }
}
