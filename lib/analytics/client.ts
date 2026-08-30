"use client"

export type BrowserAnalyticsIdentity = {
  distinctId: string | null
  resetPostHog: boolean
  resetPostHogNonce: string | null
}

let identityRequest: Promise<BrowserAnalyticsIdentity> | null = null
const ANALYTICS_GENERATION_COOKIE = "sselfie_analytics_generation"
const TAB_GENERATION_SESSION_KEY = "sselfie_analytics_tab_generation"
const POSTHOG_RESET_ACK_TIMEOUT_MS = 2_000
const ANALYTICS_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function writeAnalyticsGeneration(generation: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${ANALYTICS_GENERATION_COOKIE}=${generation}; Path=/; SameSite=Lax; Max-Age=31536000${secure}`
}

function writeAnalyticsTabGeneration(generation: string): void {
  try {
    window.sessionStorage?.setItem(TAB_GENERATION_SESSION_KEY, generation)
  } catch {
    // The shared cookie remains the fallback when storage is unavailable.
  }
}

function analyticsTabGeneration(): string | null {
  try {
    const generation = window.sessionStorage?.getItem(TAB_GENERATION_SESSION_KEY)
    return generation && ANALYTICS_UUID_PATTERN.test(generation) ? generation : null
  } catch {
    return null
  }
}

export function clearAnalyticsTabGeneration(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage?.removeItem(TAB_GENERATION_SESSION_KEY)
  } catch {
    // A restricted storage implementation has no tab generation to clear.
  }
}

export function rotateAnalyticsBrowserGeneration(): string | null {
  if (typeof window === "undefined") return null
  const generation = window.crypto.randomUUID()
  writeAnalyticsGeneration(generation)
  writeAnalyticsTabGeneration(generation)
  return generation
}

export function analyticsBrowserGeneration(): string | null {
  if (typeof window === "undefined") return null
  const tabGeneration = analyticsTabGeneration()
  if (tabGeneration) {
    // Another tab may replace the shared cookie; same-tab events continue to
    // carry this generation explicitly until logout/account deletion clears it.
    writeAnalyticsGeneration(tabGeneration)
    return tabGeneration
  }
  const existing = document.cookie
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith(`${ANALYTICS_GENERATION_COOKIE}=`))
    ?.slice(ANALYTICS_GENERATION_COOKIE.length + 1)
  if (existing && ANALYTICS_UUID_PATTERN.test(existing)) {
    writeAnalyticsGeneration(existing)
    writeAnalyticsTabGeneration(existing)
    return existing
  }
  return rotateAnalyticsBrowserGeneration()
}

export function invalidateAnalyticsBrowserIdentity(): void {
  identityRequest = null
  // Logout and account-deletion broadcasts call this in every listening tab.
  // No pre-rotation tab identity may survive into anonymous post-logout use.
  clearAnalyticsTabGeneration()
}

async function requestAnalyticsIdentity(
  rotateAnonymous: boolean
): Promise<BrowserAnalyticsIdentity> {
  try {
    const generation = analyticsBrowserGeneration()
    const response = await fetch(
      `/api/analytics/event${rotateAnonymous ? "?rotate_anonymous=1" : ""}`,
      {
        credentials: "same-origin",
        headers: generation ? { "x-sselfie-analytics-generation": generation } : undefined,
        cache: "no-store",
        keepalive: true,
      }
    )
    if (!response.ok) {
      return { distinctId: null, resetPostHog: false, resetPostHogNonce: null }
    }
    const data = await response.json()
    const resetPostHogNonce =
      typeof data?.resetPostHogNonce === "string" &&
      ANALYTICS_UUID_PATTERN.test(data.resetPostHogNonce)
        ? data.resetPostHogNonce
        : null
    return {
      distinctId: typeof data?.distinctId === "string" ? data.distinctId : null,
      resetPostHog: data?.resetPostHog === true && resetPostHogNonce !== null,
      resetPostHogNonce,
    }
  } catch {
    return { distinctId: null, resetPostHog: false, resetPostHogNonce: null }
  }
}

export function ensureAnalyticsBrowserIdentity(
  options: Readonly<{ refresh?: boolean; rotateAnonymous?: boolean }> = {}
): Promise<BrowserAnalyticsIdentity> {
  const shouldRefresh = options.refresh === true || options.rotateAnonymous === true
  if (!identityRequest) {
    identityRequest = requestAnalyticsIdentity(options.rotateAnonymous === true)
  } else if (shouldRefresh) {
    identityRequest = identityRequest
      .catch(() => ({ distinctId: null, resetPostHog: false, resetPostHogNonce: null }))
      .then(() => requestAnalyticsIdentity(options.rotateAnonymous === true))
  }
  const request = identityRequest
  return request.then(identity => {
    // Do not pin a transient auth/mapping outage for the whole browser session.
    // Capture remains disabled, while a later bounded bootstrap attempt can retry.
    if (!identity.distinctId && identityRequest === request) identityRequest = null
    return identity
  })
}

export async function acknowledgePostHogReset(resetNonce: string | null): Promise<boolean> {
  if (!resetNonce || !ANALYTICS_UUID_PATTERN.test(resetNonce)) return false
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), POSTHOG_RESET_ACK_TIMEOUT_MS)
  try {
    const response = await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "x-sselfie-posthog-reset-ack": resetNonce },
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

export async function trackAnalyticsEvent(input: {
  event: string
  properties?: Record<string, unknown>
  navigationSafe?: boolean
}) {
  try {
    const browserGeneration = analyticsBrowserGeneration()
    const payload = {
      event: input.event,
      ...(browserGeneration ? { analytics_generation: browserGeneration } : {}),
      properties: input.properties || {},
      path:
        typeof window !== "undefined" ? window.location.pathname + window.location.search : null,
      utm_source:
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("utm_source")
          : null,
      utm_medium:
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("utm_medium")
          : null,
      utm_campaign:
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("utm_campaign")
          : null,
      utm_content:
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("utm_content")
          : null,
      utm_term:
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("utm_term")
          : null,
    }

    // Navigation clicks cannot wait for a cold identity bootstrap: the page may
    // unload before the beacon is created. The event endpoint resolves and sets
    // the same server-side identity, so send these explicitly marked events now.
    if (
      input.navigationSafe === true &&
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      // Install the browser generation synchronously so the beacon and the
      // destination page's identity GET derive the same first-visit anon ID.
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
      navigator.sendBeacon("/api/analytics/event", blob)
      return
    }

    // Establish the HTTP-only anonymous identity before POSTing. The provider
    // shares this in-flight request, preventing concurrent GET/POST requests
    // from minting different first-visit identities.
    await ensureAnalyticsBrowserIdentity()

    // Prefer sendBeacon when available (non-blocking, survives navigation).
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
      navigator.sendBeacon("/api/analytics/event", blob)
      return
    }

    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // Tracking is best-effort only.
  }
}
