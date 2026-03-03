export type MayaToolMarker =
  | { tool: "show_gallery" }
  | { tool: "save_to_gallery"; imageId?: string; target: "latest" | "explicit" }
  | { tool: "generate_image"; source: "selfies" | "custom_model" | "base_model" | "choose_source" }
  | { tool: "show_upload_zone"; category: "selfies" | "products" | "people" | "vibes" }

const SHOW_GALLERY_REGEX = /\[SHOW_GALLERY\]/gi
const SAVE_TO_GALLERY_REGEX = /\[SAVE_TO_GALLERY(?:\s*:\s*([^\]]+))?\]/gi
const GENERATE_IMAGE_REGEX = /\[GENERATE_IMAGE(?:\s*:\s*([^\]]+))?\]/gi
const SHOW_UPLOAD_ZONE_REGEX = /\[SHOW_UPLOAD_ZONE(?:\s*:\s*([^\]]+))?\]/gi
const SAVE_TARGET_IMAGE_ID_REGEX = /^(?:ai|gen)_\d+$/i
const GENERATE_SOURCE_SET = new Set(["selfies", "custom_model", "base_model", "choose_source"])
const UPLOAD_CATEGORY_SET = new Set(["selfies", "products", "people", "vibes"])

export function parseMayaToolMarkers(text: string): MayaToolMarker[] {
  if (!text) return []

  const markers: MayaToolMarker[] = []

  if (SHOW_GALLERY_REGEX.test(text)) {
    markers.push({ tool: "show_gallery" })
  }
  SHOW_GALLERY_REGEX.lastIndex = 0

  let saveMatch: RegExpExecArray | null = null
  while ((saveMatch = SAVE_TO_GALLERY_REGEX.exec(text)) !== null) {
    const rawTarget = (saveMatch[1] || "").trim()
    if (!rawTarget || rawTarget.toLowerCase() === "latest") {
      markers.push({ tool: "save_to_gallery", target: "latest" })
      continue
    }

    if (SAVE_TARGET_IMAGE_ID_REGEX.test(rawTarget)) {
      markers.push({
        tool: "save_to_gallery",
        target: "explicit",
        imageId: rawTarget.toLowerCase(),
      })
      continue
    }

    // Unknown payload defaults to latest for safety
    markers.push({ tool: "save_to_gallery", target: "latest" })
  }

  SAVE_TO_GALLERY_REGEX.lastIndex = 0

  let generateMatch: RegExpExecArray | null = null
  while ((generateMatch = GENERATE_IMAGE_REGEX.exec(text)) !== null) {
    const rawSource = (generateMatch[1] || "").trim().toLowerCase()
    const source = GENERATE_SOURCE_SET.has(rawSource) ? rawSource : "choose_source"
    markers.push({
      tool: "generate_image",
      source: source as "selfies" | "custom_model" | "base_model" | "choose_source",
    })
  }

  GENERATE_IMAGE_REGEX.lastIndex = 0

  let uploadMatch: RegExpExecArray | null = null
  while ((uploadMatch = SHOW_UPLOAD_ZONE_REGEX.exec(text)) !== null) {
    const rawCategory = (uploadMatch[1] || "").trim().toLowerCase()
    const category = UPLOAD_CATEGORY_SET.has(rawCategory) ? rawCategory : "selfies"
    markers.push({
      tool: "show_upload_zone",
      category: category as "selfies" | "products" | "people" | "vibes",
    })
  }

  SHOW_UPLOAD_ZONE_REGEX.lastIndex = 0
  return markers
}

export function stripMayaToolMarkers(text: string): string {
  if (!text) return ""
  return text
    .replace(SHOW_GALLERY_REGEX, "")
    .replace(SAVE_TO_GALLERY_REGEX, "")
    .replace(GENERATE_IMAGE_REGEX, "")
    .replace(SHOW_UPLOAD_ZONE_REGEX, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim()
}
