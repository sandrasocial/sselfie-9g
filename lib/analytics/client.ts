"use client"

export type BrowserAnalyticsIdentity = {
  distinctId: string | null
  resetPostHog: boolean
}

let identityRequest: Promise<BrowserAnalyticsIdentity> | null = null
const ANALYTICS_GENERATION_COOKIE = "sselfie_analytics_generation"

function writeAnalyticsGeneration(generation: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${ANALYTICS_GENERATION_COOKIE}=${generation}; Path=/; SameSite=Lax; Max-Age=31536000${secure}`
}

export function rotateAnalyticsBrowserGeneration(): string | null {
  if (typeof window === "undefined") return null
  const generation = window.crypto.randomUUID()
  writeAnalyticsGeneration(generation)
  return generation
}

function analyticsBrowserGeneration(): string | null {
  if (typeof window === "undefined") return null
  const existing = document.cookie
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith(`${ANALYTICS_GENERATION_COOKIE}=`))
    ?.slice(ANALYTICS_GENERATION_COOKIE.length + 1)
  if (existing) return existing
  return rotateAnalyticsBrowserGeneration()
}

export function invalidateAnalyticsBrowserIdentity(): void {
  identityRequest = null
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
    if (!response.ok) return { distinctId: null, resetPostHog: false }
    const data = await response.json()
    return {
      distinctId: typeof data?.distinctId === "string" ? data.distinctId : null,
      resetPostHog: data?.resetPostHog === true,
    }
  } catch {
    return { distinctId: null, resetPostHog: false }
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
      .catch(() => ({ distinctId: null, resetPostHog: false }))
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

export async function acknowledgePostHogReset(): Promise<boolean> {
  try {
    const response = await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "x-sselfie-posthog-reset-ack": "1" },
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
    })
    return response.ok
  } catch {
    return false
  }
}

export async function trackAnalyticsEvent(input: {
  event: string
  properties?: Record<string, unknown>
}) {
  try {
    // Establish the HTTP-only anonymous identity before POSTing. The provider
    // shares this in-flight request, preventing concurrent GET/POST requests
    // from minting different first-visit identities.
    await ensureAnalyticsBrowserIdentity()

    const payload = {
      event: input.event,
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
