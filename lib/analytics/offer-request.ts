import "server-only"

import { logAnalyticsEvent } from "@/lib/analytics/events"

type OfferSearchParams = Record<string, string | string[] | undefined>

type RequestSignals = {
  userAgent: string | null
  purpose: string | null
  nextRouterPrefetch: string | null
}

const KNOWN_AUTOMATION_PATTERN =
  /bot|crawler|spider|scanner|preview|headless|facebookexternalhit|linkedinbot|slackbot|discordbot|whatsapp|curl|wget/i

function firstValue(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value
  const trimmed = candidate?.trim()
  return trimmed || null
}

export function classifyOfferRequest(signals: RequestSignals): {
  suspectedAutomation: boolean
  automationReason: "prefetch_header" | "known_crawler" | null
} {
  const purpose = signals.purpose?.toLowerCase() || ""
  if (purpose.includes("prefetch") || signals.nextRouterPrefetch === "1") {
    return { suspectedAutomation: true, automationReason: "prefetch_header" }
  }

  if (KNOWN_AUTOMATION_PATTERN.test(signals.userAgent || "")) {
    return { suspectedAutomation: true, automationReason: "known_crawler" }
  }

  return { suspectedAutomation: false, automationReason: null }
}

function pathWithSearch(path: string, params: OfferSearchParams): string {
  const search = new URLSearchParams()
  for (const [key, raw] of Object.entries(params)) {
    const value = firstValue(raw)
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export async function trackOfferLandingRequest(input: {
  anonId?: string | null
  ctaKeyword?: string | null
  headers: Headers
  offerSlug: string
  params: OfferSearchParams
  path: string
  productId?: string | null
  source?: string | null
}) {
  const signals = {
    userAgent: input.headers.get("user-agent"),
    purpose:
      input.headers.get("purpose") ||
      input.headers.get("sec-purpose") ||
      input.headers.get("x-purpose"),
    nextRouterPrefetch: input.headers.get("next-router-prefetch"),
  }
  const classification = classifyOfferRequest(signals)

  return logAnalyticsEvent({
    eventName: "offer_landing_request",
    anonId: input.anonId || null,
    path: pathWithSearch(input.path, input.params),
    referrer: input.headers.get("referer"),
    utm: {
      source: firstValue(input.params.utm_source),
      medium: firstValue(input.params.utm_medium),
      campaign: firstValue(input.params.utm_campaign),
      content: firstValue(input.params.utm_content),
      term: firstValue(input.params.utm_term),
    },
    properties: {
      measurement: "server_request",
      offer_slug: input.offerSlug,
      product_id: input.productId || null,
      cta_keyword: input.ctaKeyword || null,
      source: input.source || "public_offer",
      suspected_automation: classification.suspectedAutomation,
      automation_reason: classification.automationReason,
      user_agent: signals.userAgent,
    },
  })
}
