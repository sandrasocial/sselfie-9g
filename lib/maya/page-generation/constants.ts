const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || ""

export const STUDIO_CHECKOUT_URL =
  process.env.NEXT_PUBLIC_STUDIO_CHECKOUT_URL ||
  (APP_BASE_URL ? `${APP_BASE_URL.replace(/\/$/, "")}/checkout/membership` : "") ||
  "https://sselfie.ai/checkout/membership"

export function isMayaPageRendererV2Enabled(envValue?: string | null): boolean {
  if (!envValue) return process.env.NODE_ENV === "development"
  const normalized = envValue.trim().toLowerCase()
  return normalized === "true" || normalized === "1"
}
