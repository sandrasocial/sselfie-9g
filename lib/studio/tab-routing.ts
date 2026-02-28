export const STUDIO_TABS = ["maya", "gallery", "feed-planner", "academy", "account"] as const

export type StudioTab = (typeof STUDIO_TABS)[number]

function normalizeTab(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed
}

export function isStudioTab(value: unknown): value is StudioTab {
  return typeof value === "string" && (STUDIO_TABS as readonly string[]).includes(value)
}

export function readStudioTabFromSearchParams(
  searchParams: Pick<URLSearchParams, "get"> | null | undefined,
): StudioTab | null {
  const tab = normalizeTab(searchParams?.get("tab") ?? null)
  return tab && isStudioTab(tab) ? tab : null
}

export function readStudioTabFromHash(hash: string | null | undefined): StudioTab | null {
  const raw = normalizeTab(hash)
  if (!raw) return null
  const normalized = raw.startsWith("#") ? raw.slice(1) : raw
  return isStudioTab(normalized) ? normalized : null
}

export function resolveStudioTab(input: {
  initialTab?: string | null
  searchTab?: string | null
  hashTab?: string | null
  isMembership: boolean
}): StudioTab {
  const fromInitial = normalizeTab(input.initialTab)
  if (fromInitial && isStudioTab(fromInitial)) return fromInitial

  const fromSearch = normalizeTab(input.searchTab)
  if (fromSearch && isStudioTab(fromSearch)) return fromSearch

  const fromHash = normalizeTab(input.hashTab)
  if (fromHash && isStudioTab(fromHash)) return fromHash

  return input.isMembership ? "maya" : "maya"
}
