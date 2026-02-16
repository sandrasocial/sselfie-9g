type ResolvedCategory = "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"

const VISUAL_AESTHETIC_TO_CATEGORY: Record<string, ResolvedCategory> = {
  luxury: "luxury",
  "dark & moody": "luxury",
  "dark moody": "luxury",
  dark_moody: "luxury",
  minimal: "minimal",
  "light & minimalistic": "minimal",
  "light minimalistic": "minimal",
  light_minimalistic: "minimal",
  beige: "beige",
  "beige aesthetic": "beige",
  beige_aesthetic: "beige",
  warm: "warm",
  "warm lifestyle": "warm",
  edgy: "edgy",
  "editorial edgy": "edgy",
  professional: "professional",
  "professional brand": "professional",
}

export function mapVisualAestheticToCategory(input?: string | null): ResolvedCategory | null {
  if (!input) return null
  const normalized = input.toLowerCase().trim()
  if (VISUAL_AESTHETIC_TO_CATEGORY[normalized]) {
    return VISUAL_AESTHETIC_TO_CATEGORY[normalized]
  }

  if (normalized.includes("lux")) return "luxury"
  if (normalized.includes("dark") || normalized.includes("moody")) return "luxury"
  if (normalized.includes("minimal")) return "minimal"
  if (normalized.includes("beige")) return "beige"
  if (normalized.includes("warm")) return "warm"
  if (normalized.includes("edgy")) return "edgy"
  if (normalized.includes("pro")) return "professional"
  return null
}
