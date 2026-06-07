const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
  .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
  .replace(/\/+$/, "")

interface RevenueLinkOptions {
  campaign: string
  content?: string
  source?: string
  medium?: string
  emailType?: string
  campaignId?: string
  referralCode?: string
  checkoutEmail?: string | null
}

function normalizeCheckoutEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export function buildRevenueEmailLink(url: string, options: RevenueLinkOptions): string {
  const resolved = new URL(url, SITE_URL)

  resolved.searchParams.set("source", options.source || "email")
  resolved.searchParams.set("utm_source", "email")
  resolved.searchParams.set("utm_medium", options.medium || "lifecycle")
  resolved.searchParams.set("utm_campaign", options.campaign)

  if (options.content) {
    resolved.searchParams.set("utm_content", options.content)
  }

  if (options.emailType) {
    resolved.searchParams.set("email_type", options.emailType)
  }

  if (options.campaignId) {
    resolved.searchParams.set("campaign_id", options.campaignId)
  }

  if (options.referralCode) {
    resolved.searchParams.set("ref", options.referralCode)
  }

  const checkoutEmail = normalizeCheckoutEmail(options.checkoutEmail)
  if (checkoutEmail) {
    resolved.searchParams.set("checkout_email", checkoutEmail)
  }

  return resolved.toString()
}
