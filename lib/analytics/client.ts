"use client"

export async function trackAnalyticsEvent(input: {
  event: string
  properties?: Record<string, any>
}) {
  try {
    const payload = {
      event: input.event,
      properties: input.properties || {},
      path: typeof window !== "undefined" ? window.location.pathname + window.location.search : null,
      utm_source: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("utm_source") : null,
      utm_medium: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("utm_medium") : null,
      utm_campaign:
        typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("utm_campaign") : null,
      utm_content:
        typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("utm_content") : null,
      utm_term: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("utm_term") : null,
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

