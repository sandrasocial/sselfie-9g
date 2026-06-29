export function normalizeCheckoutEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase()
  if (!email) return null
  // Never trust raw URL input: cap length (RFC 5321 max is 254 chars) before the
  // shape check so an oversized param can never reach Stripe as customer_email.
  if (email.length > 254) return null
  return /^[^\s@/?#]+@[^\s@/?#]+\.[^\s@/?#]+$/.test(email) ? email : null
}
