export const SELFIE_GUIDE_TAGS = ["freebie-subscriber", "sselfie-guide", "freebie-selfie-guide"] as const

export function normalizeFreebieEmailTags(existingTags?: string[] | null): string[] {
  const set = new Set<string>((existingTags || []).filter(Boolean))
  for (const tag of SELFIE_GUIDE_TAGS) {
    set.add(tag)
  }
  return Array.from(set)
}

export function resolveAccessToken(
  existingAccessToken: string | null | undefined,
  generateToken: () => string = () => crypto.randomUUID(),
): { accessToken: string; wasGenerated: boolean } {
  const token = typeof existingAccessToken === "string" ? existingAccessToken.trim() : ""
  if (token.length > 0) {
    return { accessToken: token, wasGenerated: false }
  }
  return { accessToken: generateToken(), wasGenerated: true }
}
