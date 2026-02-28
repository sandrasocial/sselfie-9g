import type { AcademyView } from "@/components/sselfie/types"

const ACADEMY_VIEW_ALIASES: Record<string, AcademyView> = {
  overview: "overview",
  membership: "membership",
  courses: "courses",
  templates: "templates",
  "monthly-drops": "monthly-drops",
  monthly_drops: "monthly-drops",
  "flatlay-images": "flatlay-images",
  flatlay_images: "flatlay-images",
}

export function parseAcademyViewParam(value: string | null | undefined): AcademyView | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  return ACADEMY_VIEW_ALIASES[normalized] ?? null
}
