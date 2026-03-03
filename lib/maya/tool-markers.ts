export type MayaToolMarker =
  | { tool: "show_gallery" }
  | { tool: "save_to_gallery"; imageId?: string; target: "latest" | "explicit" }

const SHOW_GALLERY_REGEX = /\[SHOW_GALLERY\]/gi
const SAVE_TO_GALLERY_REGEX = /\[SAVE_TO_GALLERY(?:\s*:\s*([^\]]+))?\]/gi
const SAVE_TARGET_IMAGE_ID_REGEX = /^(?:ai|gen)_\d+$/i

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
  return markers
}

export function stripMayaToolMarkers(text: string): string {
  if (!text) return ""
  return text
    .replace(SHOW_GALLERY_REGEX, "")
    .replace(SAVE_TO_GALLERY_REGEX, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim()
}
