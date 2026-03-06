export interface MayaVideoCardMarkerPayload {
  videoUrl: string
  motionPrompt?: string
  imageUrl?: string
}

const VIDEO_CARD_REGEX = /\[VIDEO_CARD:([^\]]+)\]/gi

function sanitizeVideoCardPayload(
  payload: Partial<MayaVideoCardMarkerPayload> | null | undefined,
): MayaVideoCardMarkerPayload | null {
  if (!payload || typeof payload.videoUrl !== "string" || payload.videoUrl.trim().length === 0) {
    return null
  }

  const nextPayload: MayaVideoCardMarkerPayload = {
    videoUrl: payload.videoUrl.trim(),
  }

  if (typeof payload.motionPrompt === "string" && payload.motionPrompt.trim().length > 0) {
    nextPayload.motionPrompt = payload.motionPrompt.trim()
  }
  if (typeof payload.imageUrl === "string" && payload.imageUrl.trim().length > 0) {
    nextPayload.imageUrl = payload.imageUrl.trim()
  }

  return nextPayload
}

export function encodeMayaVideoCardMarker(payload: MayaVideoCardMarkerPayload): string {
  const sanitized = sanitizeVideoCardPayload(payload)
  if (!sanitized) {
    return ""
  }

  const encoded = encodeURIComponent(JSON.stringify(sanitized))
  return `[VIDEO_CARD:${encoded}]`
}

export function parseMayaVideoCardMarkerPayload(encodedPayload: string): MayaVideoCardMarkerPayload | null {
  if (!encodedPayload || encodedPayload.trim().length === 0) return null

  try {
    const decoded = decodeURIComponent(encodedPayload.trim())
    const parsed = JSON.parse(decoded) as Partial<MayaVideoCardMarkerPayload>
    return sanitizeVideoCardPayload(parsed)
  } catch {
    return null
  }
}

export function extractMayaVideoCardMarkers(text: string): MayaVideoCardMarkerPayload[] {
  if (!text) return []

  const markers: MayaVideoCardMarkerPayload[] = []
  let match: RegExpExecArray | null = null

  while ((match = VIDEO_CARD_REGEX.exec(text)) !== null) {
    const payload = parseMayaVideoCardMarkerPayload(match[1] || "")
    if (payload) {
      markers.push(payload)
    }
  }

  VIDEO_CARD_REGEX.lastIndex = 0
  return markers
}

export function stripMayaVideoCardMarkers(text: string): string {
  if (!text) return ""
  return text.replace(VIDEO_CARD_REGEX, "").replace(/\n{3,}/g, "\n\n").trim()
}
