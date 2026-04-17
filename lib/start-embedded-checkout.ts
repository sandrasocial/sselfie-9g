"use client"

type EmbeddedCheckoutOptions = {
  offerSlug?: string
  source?: string
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  campaignId?: number | string | null
  referralCode?: string | null
  returnTo?: string | null
  entryPath?: string | null
}

function readQueryValue(name: string): string | null {
  if (typeof window === "undefined") return null
  return new URLSearchParams(window.location.search).get(name)
}

function normalizeClientReferralCode(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toUpperCase()
  return /^[A-Z0-9]{3,32}$/.test(normalized) ? normalized : null
}

function buildCheckoutPayload(productId: string, options?: EmbeddedCheckoutOptions) {
  const entryPath =
    options?.entryPath ||
    (typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : null)

  return {
    productId,
    offerSlug: options?.offerSlug || null,
    source: options?.source || "embedded_checkout",
    utmSource: options?.utmSource ?? readQueryValue("utm_source"),
    utmMedium: options?.utmMedium ?? readQueryValue("utm_medium"),
    utmCampaign: options?.utmCampaign ?? readQueryValue("utm_campaign"),
    utmContent: options?.utmContent ?? readQueryValue("utm_content"),
    campaignId: options?.campaignId ?? readQueryValue("campaign_id"),
    referralCode: normalizeClientReferralCode(options?.referralCode ?? readQueryValue("ref")),
    returnTo: options?.returnTo || null,
    entryPath,
  }
}

/**
 * Starts an embedded checkout session for the given product ID.
 * Returns the client secret or throws on error.
 */
export async function startEmbeddedCheckout(productId: string, options?: EmbeddedCheckoutOptions): Promise<string> {
  const response = await fetch("/api/landing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildCheckoutPayload(productId, options)),
  })

  const data = await response.json()
  if (response.ok && data?.clientSecret) {
    return data.clientSecret as string
  }

  throw new Error(data?.error || "Failed to start checkout")
}

export function buildEmbeddedCheckoutUrl(clientSecret: string): string {
  return `/checkout?client_secret=${encodeURIComponent(clientSecret)}`
}

export async function openEmbeddedCheckout(
  productId: string,
  navigate: (url: string) => void = (url) => {
    if (typeof window !== "undefined") {
      window.location.href = url
    }
  },
  options?: EmbeddedCheckoutOptions,
): Promise<string> {
  const clientSecret = await startEmbeddedCheckout(productId, options)
  navigate(buildEmbeddedCheckoutUrl(clientSecret))
  return clientSecret
}
