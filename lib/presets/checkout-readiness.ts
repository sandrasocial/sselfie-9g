export function isPresetsCheckoutAvailable(
  tier: "single" | "bundle",
  publishedCollectionCount: number,
  hasSelectedCollection: boolean,
): boolean {
  if (publishedCollectionCount < 1) return false
  return tier === "bundle" || hasSelectedCollection
}
