"use client"

import { trackEvent } from "@/lib/analytics"

type CheckoutFailureParams = {
  error: unknown
  source: string
  productId?: string
  fallbackPath: string
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message
  }
  if (typeof error === "string") return error
  return "unknown_error"
}

export function handleCheckoutFailure({ error, source, productId, fallbackPath }: CheckoutFailureParams) {
  const reason = extractErrorMessage(error)

  trackEvent("checkout_start_failed", {
    source,
    product_id: productId || "unknown",
    reason,
  })

  if (typeof window !== "undefined") {
    const fallbackUrl = new URL(fallbackPath, window.location.origin)
    fallbackUrl.searchParams.set("fallback", "embedded_failed")
    fallbackUrl.searchParams.set("source", source)
    if (productId) fallbackUrl.searchParams.set("product", productId)
    fallbackUrl.searchParams.set("reason", "start_failed")
    window.location.href = `${fallbackUrl.pathname}${fallbackUrl.search}`
  }
}
