import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import {
  analyticsGenerationFromRequest,
  rotateAnonymousAnalyticsIdentity,
} from "@/lib/analytics/identity-cookies"
import {
  clearSupabaseSessionCookies,
  markSupabaseSessionGeneration,
} from "@/lib/supabase/session-cookies"

function failedLogoutResponse(req?: NextRequest, message = "Failed to logout") {
  const response = NextResponse.json({ error: message }, { status: 500 })
  const generation = analyticsGenerationFromRequest(req)
  // The user explicitly requested logout. If the provider call failed before
  // clearing its SSR cookies, expire the local session so analytics cannot
  // reset and immediately re-identify the same authenticated user.
  clearSupabaseSessionCookies(response, req)
  markSupabaseSessionGeneration(response, generation)
  rotateAnonymousAnalyticsIdentity(response, generation, req)
  return response
}

export async function POST(req?: NextRequest) {
  try {
    const supabase = await createServerClient()

    console.log("[v0] Logging out user...")

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("[v0] Logout error:", error)
      return failedLogoutResponse(req, error.message)
    }

    console.log("[v0] User logged out successfully")

    const response = NextResponse.json({ success: true })
    const generation = analyticsGenerationFromRequest(req)
    // Rotate the server-owned anonymous identity and leave a short-lived,
    // HTTP-only reset signal. The next provider bootstrap clears the persisted
    // PostHog SDK identity before anonymous activity can be captured.
    markSupabaseSessionGeneration(response, generation)
    rotateAnonymousAnalyticsIdentity(response, generation, req)
    return response
  } catch (error) {
    console.error("[v0] Error during logout:", error)
    return failedLogoutResponse(req)
  }
}
