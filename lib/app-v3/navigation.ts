export type AppV3Section = "create" | "photos" | "content" | "calendar" | "library" | "account"

const APP_V3_SECTIONS = new Set<AppV3Section>([
  "create",
  "photos",
  "content",
  "calendar",
  "library",
  "account",
])

export function resolveAppV3InitialSection(view?: string | string[] | null): AppV3Section {
  const value = Array.isArray(view) ? view[0] : view
  if (typeof value !== "string") return "create"
  return APP_V3_SECTIONS.has(value as AppV3Section) ? (value as AppV3Section) : "create"
}

export function resolveAppV3InitialAestheticId(
  aesthetic?: string | string[] | null
): string | null {
  const value = Array.isArray(aesthetic) ? aesthetic[0] : aesthetic
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  return /^[a-z0-9-]{1,80}$/.test(normalized) ? normalized : null
}

export function buildAppV3AestheticHref(aestheticId: string): string {
  const params = new URLSearchParams({ view: "create", aesthetic: aestheticId })
  return `/app?${params.toString()}`
}

export function buildAppV3ReturnTo(section: AppV3Section, aestheticId?: string | null): string {
  if (section === "create" && aestheticId) return buildAppV3AestheticHref(aestheticId)
  return section === "create" ? "/app" : `/app?view=${section}`
}
