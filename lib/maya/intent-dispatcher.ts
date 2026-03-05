import { formatMayaToolMarker } from "@/lib/maya/tool-registry"

type MayaGenerationSource = "selfies" | "custom_model" | "base_model" | "choose_source"
type MayaUploadCategory = "selfies" | "products" | "people" | "vibes"

export interface MayaHydrationSnapshot {
  generation: {
    hasTrainedModel: boolean
    canUseCustomModel: boolean
    canUseSelfies: boolean
    recommendedSource: "selfies" | "custom_model" | "base_model"
  }
  uploads: {
    selfies: number
    products: number
    people: number
    vibes: number
    total: number
    hasAny: boolean
  }
  offerBrief: {
    hasCoreFields: boolean
  }
}

export interface MayaToolDispatchIntent {
  tool:
    | "show_capabilities"
    | "show_studio_hub"
    | "show_gallery"
    | "save_to_gallery"
    | "generate_image"
    | "generate_video"
    | "show_upload_zone"
  responseText: string
  imageId?: string
  source?: MayaGenerationSource
  category?: MayaUploadCategory
}

const SHOW_CAPABILITIES_INTENT_REGEX =
  /\b(what can you do|help me understand|how does this work|where do i start|what do i do now|what are you capable of|show capabilities|show me what you can do|get started)\b/i
const SHOW_STUDIO_HUB_INTENT_REGEX =
  /\b(show|open|view|check)\b[\s\S]{0,30}\b(studio hub|my assets|everything you created|what you created|created assets|my drafts)\b/i
const SHOW_GALLERY_INTENT_REGEX = /\b(show|open|view|see|browse|pull up)\b[\s\S]{0,24}\b(gallery|photos?|images?)\b/i
const SAVE_TO_GALLERY_INTENT_REGEX = /\b(save|store|keep)\b[\s\S]{0,36}\b(gallery|my gallery)\b/i
const GENERATE_IMAGE_INTENT_REGEX = /\b(create|generate|make|shoot)\b[\s\S]{0,48}\b(photo|image|picture|photoshoot|shot)\b/i
const GENERATE_VIDEO_INTENT_REGEX = /\b(create|generate|make|animate|turn)\b[\s\S]{0,60}\b(video|reel|b-?roll|animation|animate)\b/i
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
      responseText: `Done. I saved it to your gallery.\n${formatMayaToolMarker("save_to_gallery", markerPayload)}`,
    }
  }

  if (SHOW_UPLOAD_ZONE_INTENT_REGEX.test(userText)) {
    const category = detectUploadCategory(userText)
    return {
      tool: "show_upload_zone",
      category,
      responseText:
        `Perfect. I’m opening your ${category} upload area so we can build this with your own assets.\n` +
        `${formatMayaToolMarker("show_upload_zone", category)}`,
    }
  }

  if (GENERATE_IMAGE_INTENT_REGEX.test(userText)) {
    const source = detectGenerationSource(userText)

    if (source === "selfies") {
      return {
        tool: "generate_image",
        source,
        responseText:
          `Perfect. We’ll use your selfies so it still looks and feels like you.\n` +
          `${formatMayaToolMarker("generate_image", source)}`,
      }
    }

    if (source === "custom_model") {
      return {
        tool: "generate_image",
        source,
        responseText:
          `Perfect. I’ll use your trained model for stronger identity match.\n` +
          `${formatMayaToolMarker("generate_image", source)}`,
      }
    }

    if (source === "base_model") {
      return {
        tool: "generate_image",
        source,
        responseText:
          `Got it. I’ll use the latest base model and optimize the prompt for it.\n` +
          `${formatMayaToolMarker("generate_image", source)}`,
      }
    }

    return {
      tool: "generate_image",
      source: "choose_source",
      responseText:
        `Let's make this easy. Choose your generation path and I’ll run it inline.\n` +
        `${formatMayaToolMarker("generate_image", "choose_source")}`,
    }
  }

  if (GENERATE_VIDEO_INTENT_REGEX.test(userText)) {
    return {
      tool: "generate_video",
      responseText:
        `Perfect. I’ll pull your recent images and start an inline video workflow right here.\n` +
        `${formatMayaToolMarker("generate_video")}`,
    }
  }

  if (SHOW_GALLERY_INTENT_REGEX.test(userText) || /\bmy gallery\b/i.test(userText)) {
    return {
      tool: "show_gallery",
      responseText: `Of course. Here are your latest gallery images.\n${formatMayaToolMarker("show_gallery")}`,
    }
  }

  if (SHOW_STUDIO_HUB_INTENT_REGEX.test(userText)) {
    return {
      tool: "show_studio_hub",
      responseText:
        `Absolutely. I’m pulling your Studio Hub so you can open pages, feeds, photos, and videos from here.\n` +
        `${formatMayaToolMarker("show_studio_hub")}`,
    }
  }

  if (SHOW_CAPABILITIES_INTENT_REGEX.test(userText)) {
    return {
      tool: "show_capabilities",
      responseText:
        `Here’s what I can run for you right now.\n` +
        `${formatMayaToolMarker("show_capabilities")}`,
    }
  }

  return null
}

function getGenerateImageResponse(source: MayaGenerationSource): string {
  if (source === "selfies") {
    return (
      `Perfect. We’ll use your selfies so it still looks and feels like you.\n` +
      `${formatMayaToolMarker("generate_image", source)}`
    )
  }

  if (source === "custom_model") {
    return (
      `Perfect. I’ll use your trained model for stronger identity match.\n` +
      `${formatMayaToolMarker("generate_image", source)}`
    )
  }

  if (source === "base_model") {
    return (
      `Got it. I’ll use the latest base model and optimize the prompt for it.\n` +
      `${formatMayaToolMarker("generate_image", source)}`
    )
  }

  return (
    `Let's make this easy. Choose your generation path and I’ll run it inline.\n` +
    `${formatMayaToolMarker("generate_image", "choose_source")}`
  )
}

export function hydrateMayaToolDispatchIntent(
  intent: MayaToolDispatchIntent,
  snapshot: MayaHydrationSnapshot | null,
): MayaToolDispatchIntent {
  if (!snapshot) return intent

  if (intent.tool === "show_capabilities") {
    const statusLine = snapshot.offerBrief.hasCoreFields
      ? "I already have your core brand context, so we can move straight into execution."
      : "I can pull what I already know from your profile, then ask only what’s missing."

    return {
      ...intent,
      responseText:
        `${statusLine}\n` +
        `${formatMayaToolMarker("show_capabilities")}`,
    }
  }

  if (intent.tool === "show_studio_hub") {
    const statusLine =
      snapshot.uploads.total > 0
        ? "Your workspace is active, so I’ll load your latest assets and drafts now."
        : "I’ll open your Studio Hub now. Once you create assets, they’ll appear here automatically."

    return {
      ...intent,
      responseText:
        `${statusLine}\n` +
        `${formatMayaToolMarker("show_studio_hub")}`,
    }
  }

  if (intent.tool === "show_upload_zone") {
    const category = intent.category || "selfies"
    const currentCount = Number(snapshot.uploads[category] || 0)
    const countLine =
      currentCount > 0
        ? `You already have ${currentCount} ${category} asset${currentCount === 1 ? "" : "s"} here.`
        : `No ${category} assets saved yet.`

    return {
      ...intent,
      responseText:
        `${countLine} I’m opening your upload area now.\n` +
        `${formatMayaToolMarker("show_upload_zone", category)}`,
    }
  }

  if (intent.tool === "generate_image") {
    const requestedSource = intent.source || "choose_source"

    if (requestedSource === "custom_model" && !snapshot.generation.canUseCustomModel) {
      if (snapshot.generation.canUseSelfies) {
        return {
          ...intent,
          source: "selfies",
          responseText:
            `Your trained model is not ready yet, so I switched this to selfies to keep momentum.\n` +
            `${formatMayaToolMarker("generate_image", "selfies")}`,
        }
      }

      return {
        ...intent,
        source: "choose_source",
        responseText:
          `Your trained model is not ready yet. Drop selfies first or run this on the base model.\n` +
          `${formatMayaToolMarker("show_upload_zone", "selfies")}\n` +
          `${formatMayaToolMarker("generate_image", "choose_source")}`,
      }
    }

    if (requestedSource === "selfies" && !snapshot.generation.canUseSelfies) {
      return {
        ...intent,
        responseText:
          `I don't see selfies uploaded yet. Drop 6-12 selfies and I’ll run this right after.\n` +
          `${formatMayaToolMarker("show_upload_zone", "selfies")}`,
      }
    }

    if (requestedSource === "choose_source") {
      const hydratedSource = snapshot.generation.recommendedSource
      if (hydratedSource !== "base_model") {
        return {
          ...intent,
          source: hydratedSource,
          responseText:
            `I already checked your profile and assets, so I preselected the best path.\n` +
            getGenerateImageResponse(hydratedSource),
        }
      }
    }

    return {
      ...intent,
      responseText: getGenerateImageResponse(requestedSource),
    }
  }

  if (intent.tool === "generate_video") {
    const readinessLine = snapshot.uploads.hasAny
      ? "I’ll use your existing visuals and move straight into animation."
      : "I’ll check your latest gallery first and then animate from there."

    return {
      ...intent,
      responseText:
        `${readinessLine}\n` +
        `${formatMayaToolMarker("generate_video")}`,
    }
  }

  return intent
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
