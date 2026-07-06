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

export function buildAppV3ReturnTo(section: AppV3Section): string {
  return section === "create" ? "/app" : `/app?view=${section}`
}
