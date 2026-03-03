import { formatMayaToolMarker } from "@/lib/maya/tool-registry"

type MayaGenerationSource = "selfies" | "custom_model" | "base_model" | "choose_source"
type MayaUploadCategory = "selfies" | "products" | "people" | "vibes"

export interface MayaToolDispatchIntent {
  tool: "show_gallery" | "save_to_gallery" | "generate_image" | "show_upload_zone"
  responseText: string
  imageId?: string
  source?: MayaGenerationSource
  category?: MayaUploadCategory
}

const SHOW_GALLERY_INTENT_REGEX = /\b(show|open|view|see|browse|pull up)\b[\s\S]{0,24}\b(gallery|photos?|images?)\b/i
const SAVE_TO_GALLERY_INTENT_REGEX = /\b(save|store|keep)\b[\s\S]{0,36}\b(gallery|my gallery)\b/i
const GENERATE_IMAGE_INTENT_REGEX = /\b(create|generate|make|shoot)\b[\s\S]{0,48}\b(photo|image|picture|photoshoot|shot)\b/i
const SHOW_UPLOAD_ZONE_INTENT_REGEX = /\b(upload|drop|add|attach)\b[\s\S]{0,40}\b(selfies?|photos?|images?|references?|products?)\b/i
const IMAGE_ID_REGEX = /\b(?:ai|gen)_\d+\b/i

function detectGenerationSource(userText: string): MayaGenerationSource {
  const normalizedText = userText.toLowerCase()
  if (/\b(selfie|uploaded selfies|uploaded images|reference photos?)\b/i.test(normalizedText)) {
    return "selfies"
  }
  if (/\b(custom model|trained model|my model|lora)\b/i.test(normalizedText)) {
    return "custom_model"
  }
  if (/\b(base model|latest model|default model)\b/i.test(normalizedText)) {
    return "base_model"
  }
  return "choose_source"
}

function detectUploadCategory(userText: string): MayaUploadCategory {
  const normalizedText = userText.toLowerCase()
  if (/\bproduct|item|packaging\b/i.test(normalizedText)) {
    return "products"
  }
  if (/\bpeople|person|guest|friend|team\b/i.test(normalizedText)) {
    return "people"
  }
  if (/\bvibe|mood|style\b/i.test(normalizedText)) {
    return "vibes"
  }
  return "selfies"
}

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

  if (SHOW_UPLOAD_ZONE_INTENT_REGEX.test(userText)) {
    const category = detectUploadCategory(userText)
    return {
      tool: "show_upload_zone",
      category,
      responseText: `Perfect. Drop the images here and I will use them for your next result.\n${formatMayaToolMarker("show_upload_zone", category)}`,
    }
  }

  if (GENERATE_IMAGE_INTENT_REGEX.test(userText)) {
    const source = detectGenerationSource(userText)

    if (source === "selfies") {
      return {
        tool: "generate_image",
        source,
        responseText:
          `Perfect. We will use your uploaded selfies.\n` +
          `${formatMayaToolMarker("generate_image", source)}\n` +
          `${formatMayaToolMarker("show_upload_zone", "selfies")}`,
      }
    }

    if (source === "custom_model") {
      return {
        tool: "generate_image",
        source,
        responseText: `Great. We'll use your trained model flow.\n${formatMayaToolMarker("generate_image", source)}`,
      }
    }

    if (source === "base_model") {
      return {
        tool: "generate_image",
        source,
        responseText: `Great. We'll use the latest base model.\n${formatMayaToolMarker("generate_image", source)}`,
      }
    }

    return {
      tool: "generate_image",
      source: "choose_source",
      responseText:
        `Let's do it. Choose your path and I'll launch it inline.\n` +
        `${formatMayaToolMarker("generate_image", "choose_source")}`,
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
