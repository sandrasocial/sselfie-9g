import { readCheckoutEmailToken } from "@/lib/revenue-engine/checkout-email-token"

export function normalizeCheckoutEmail(value?: string | null): string | null {
  const raw = value?.trim()
  if (!raw) return null

  // New email links hand checkout an opaque encrypted token instead of putting the
  // recipient address in browser history/referrers. Old raw-email links remain valid
  // for backward compatibility with messages that were already sent.
  if (raw.startsWith("v1.")) {
    return readCheckoutEmailToken(raw)
  }

  const email = raw.toLowerCase()
  // Never trust raw URL input: cap length (RFC 5321 max is 254 chars) before the
  // shape check so an oversized param can never reach Stripe as customer_email.
  if (email.length > 254) return null
  return /^[^\s@/?#]+@[^\s@/?#]+\.[^\s@/?#]+$/.test(email) ? email : null
}
