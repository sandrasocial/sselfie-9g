import type { NextRequest, NextResponse } from "next/server"

const ANALYTICS_GENERATION_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VERSIONED_ANON_COOKIE_PATTERN = /^sselfie_anon_id_[0-9a-f]{32}$/i
const ANALYTICS_ROTATION_COOKIE = "sselfie_analytics_rotation"

const analyticsCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
}

const analyticsGenerationCookieOptions = {
  httpOnly: false,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
}

export function analyticsGenerationFromRequest(
  req?: NextRequest,
  explicitGeneration?: string | null
): string | null {
  const generation =
    explicitGeneration ||
    req?.headers.get("x-sselfie-analytics-generation") ||
    req?.cookies.get("sselfie_analytics_generation")?.value ||
    null

  return generation && ANALYTICS_GENERATION_PATTERN.test(generation) ? generation : null
}

export function analyticsAnonCookieName(generation?: string | null): string {
  return generation && ANALYTICS_GENERATION_PATTERN.test(generation)
    ? `sselfie_anon_id_${generation.replaceAll("-", "").toLowerCase()}`
    : "sselfie_anon_id"
}

export function clearStaleAnonymousAnalyticsCookies(
  response: NextResponse,
  req?: NextRequest,
  generation?: string | null
) {
  const activeCookieName = analyticsAnonCookieName(generation)

  if (generation && req?.cookies.get("sselfie_anon_id")) {
    response.cookies.set("sselfie_anon_id", "", {
      ...analyticsCookieOptions,
      maxAge: 0,
    })
  }

  for (const cookie of req?.cookies.getAll() ?? []) {
    if (VERSIONED_ANON_COOKIE_PATTERN.test(cookie.name) && cookie.name !== activeCookieName) {
      response.cookies.set(cookie.name, "", {
        ...analyticsCookieOptions,
        maxAge: 0,
      })
    }
  }
}

export function rotateAnalyticsGenerationCookie(response: NextResponse): string {
  const generation = globalThis.crypto.randomUUID()
  const rotation = globalThis.crypto.randomUUID()
  response.cookies.set("sselfie_analytics_generation", generation, {
    ...analyticsGenerationCookieOptions,
  })
  response.cookies.set(ANALYTICS_ROTATION_COOKIE, rotation, {
    ...analyticsGenerationCookieOptions,
  })
  return generation
}

export function rotateAnonymousAnalyticsIdentity(
  response: NextResponse,
  generation?: string | null,
  req?: NextRequest
) {
  clearStaleAnonymousAnalyticsCookies(response, req, generation)
  const postHogResetNonce = globalThis.crypto.randomUUID()

  response.cookies.set(analyticsAnonCookieName(generation), globalThis.crypto.randomUUID(), {
    ...analyticsCookieOptions,
    maxAge: 60 * 60 * 24 * 365,
  })
  response.cookies.set("sselfie_posthog_reset", postHogResetNonce, {
    ...analyticsCookieOptions,
    // Keep the isolation signal as long as the anonymous identity itself. The
    // analytics endpoint clears it only after the loaded SDK applies reset().
    maxAge: 60 * 60 * 24 * 365,
  })
}
