import { randomUUID } from "node:crypto"
import type { NextResponse } from "next/server"

export function rotateAnonymousAnalyticsIdentity(response: NextResponse) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  }

  response.cookies.set("sselfie_anon_id", randomUUID(), {
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
