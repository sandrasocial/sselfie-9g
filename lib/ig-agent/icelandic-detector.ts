const ICELANDIC_SUFFIX_RE = /(?:dottir|dóttir|son)\b/i

export function normalizeIcelandicName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ð/g, "d")
    .replace(/Ð/g, "D")
    .replace(/þ/g, "th")
    .replace(/Þ/g, "Th")
    .toLowerCase()
}

export function isLikelyIcelandic(username?: string | null, fullName?: string | null): boolean {
  const candidates = [username, fullName]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .flatMap((value) => [value, normalizeIcelandicName(value)])

  return candidates.some((value) => ICELANDIC_SUFFIX_RE.test(value))
}

export function mergeIcelandicTag(tags: string[] | null | undefined, isIcelandic: boolean): string[] {
  const normalized = new Set((tags || []).filter(Boolean))
  if (isIcelandic) normalized.add("icelandic")
  return Array.from(normalized)
}

