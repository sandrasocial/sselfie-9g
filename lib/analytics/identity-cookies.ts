import type { NextResponse } from "next/server"

const ANALYTICS_GENERATION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function analyticsAnonCookieName(generation?: string | null): string {
  return generation && ANALYTICS_GENERATION_PATTERN.test(generation)
    ? `sselfie_anon_id_${generation.replaceAll("-", "").toLowerCase()}`
    : "sselfie_anon_id"
}

export function rotateAnonymousAnalyticsIdentity(
  response: NextResponse,
  generation?: string | null
) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  }

  response.cookies.set(analyticsAnonCookieName(generation), globalThis.crypto.randomUUID(), {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 365,
  })
  response.cookies.set("sselfie_posthog_reset", "1", {
    ...cookieOptions,
    // Keep the isolation signal as long as the anonymous identity itself. The
    // analytics endpoint clears it only after the loaded SDK applies reset().
    maxAge: 60 * 60 * 24 * 365,
  })
}
