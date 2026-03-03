import { formatMayaToolMarker } from "@/lib/maya/tool-registry"

export interface MayaToolDispatchIntent {
  tool: "show_gallery" | "save_to_gallery"
  responseText: string
  imageId?: string
}

const SHOW_GALLERY_INTENT_REGEX = /\b(show|open|view|see|browse|pull up)\b[\s\S]{0,24}\b(gallery|photos?|images?)\b/i
const SAVE_TO_GALLERY_INTENT_REGEX = /\b(save|store|keep)\b[\s\S]{0,36}\b(gallery|my gallery)\b/i
const IMAGE_ID_REGEX = /\b(?:ai|gen)_\d+\b/i

export function detectMayaToolDispatchIntent(userText: string): MayaToolDispatchIntent | null {
  if (!userText || userText.trim().length === 0) return null

  if (SAVE_TO_GALLERY_INTENT_REGEX.test(userText)) {
    const imageIdMatch = userText.match(IMAGE_ID_REGEX)
    const imageId = imageIdMatch?.[0]?.toLowerCase()
    const markerPayload = imageId || "latest"
    return {
      tool: "save_to_gallery",
      imageId,
      responseText: `Perfect, saving that to your gallery now.\n${formatMayaToolMarker("save_to_gallery", markerPayload)}`,
    }
  }

  if (SHOW_GALLERY_INTENT_REGEX.test(userText) || /\bmy gallery\b/i.test(userText)) {
    return {
      tool: "show_gallery",
      responseText: `Absolutely. Pulling up your latest gallery images now.\n${formatMayaToolMarker("show_gallery")}`,
    }
  }

  return null
}

export function extractLatestUserText(messages: Array<{ role?: string; parts?: any[]; content?: any }>): string {
  const latestUserMessage = [...messages].reverse().find((m) => m?.role === "user")
  if (!latestUserMessage) return ""

  if (Array.isArray(latestUserMessage.parts)) {
    return latestUserMessage.parts
      .filter((part: any) => part?.type === "text" && typeof part?.text === "string")
      .map((part: any) => part.text)
      .join(" ")
      .trim()
  }

  if (typeof latestUserMessage.content === "string") {
    return latestUserMessage.content.trim()
  }

  if (Array.isArray(latestUserMessage.content)) {
    return latestUserMessage.content
      .filter((part: any) => part?.type === "text" && typeof part?.text === "string")
      .map((part: any) => part.text)
      .join(" ")
      .trim()
  }

  return ""
}
