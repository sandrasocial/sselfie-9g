"use client"

/**
 * Starts an embedded checkout session for the given product ID.
 * Returns the client secret or throws on error.
 */
export async function startEmbeddedCheckout(productId: string): Promise<string> {
  const response = await fetch("/api/landing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
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
): Promise<string> {
  const clientSecret = await startEmbeddedCheckout(productId)
  navigate(buildEmbeddedCheckoutUrl(clientSecret))
  return clientSecret
}
