export function resolveSameOriginAcademyPurchaseUrl(
  purchaseUrl: unknown,
  currentOrigin: string
): string | null {
  if (typeof purchaseUrl !== "string" || purchaseUrl.length === 0) return null

  try {
    const origin = new URL(currentOrigin)
    const resolved = new URL(purchaseUrl, origin)
    if (resolved.origin !== origin.origin || resolved.username || resolved.password) return null

    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return null
  }
}
