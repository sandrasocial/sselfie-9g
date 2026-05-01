import { formatMayaToolMarker } from "@/lib/maya/tool-registry"

import type { ModelChoiceSource } from "@/lib/maya/model-choice-policy"
import { resolveModelChoice } from "@/lib/maya/model-choice-policy"

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
const GENERATE_VIDEO_INTENT_REGEX = /\b(create|generate|make|animate|turn)\b[\s\S]{0,60}\b(video|reel|b-?roll|animation|animate)\b/i
const SHOW_UPLOAD_ZONE_INTENT_REGEX = /\b(upload|drop|add|attach)\b[\s\S]{0,40}\b(selfies?|photos?|images?|references?|products?)\b/i
const IMAGE_ID_REGEX = /\b(?:ai|gen)_\d+\b/i

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
      responseText: `Saved. This one is officially in your gallery now ✨\n${formatMayaToolMarker("save_to_gallery", markerPayload)}`,
    }
  }

  if (SHOW_UPLOAD_ZONE_INTENT_REGEX.test(userText)) {
    const category = detectUploadCategory(userText)
    return {
      tool: "show_upload_zone",
      category,
      responseText:
        `Perfect. Let’s use your own ${category} so this feels more like you.\n` +
        `${formatMayaToolMarker("show_upload_zone", category)}`,
    }
  }

  // Photo creation prompts fall through to Maya (Claude) which responds with [GENERATE_CONCEPTS].
  // Do NOT dispatch generate_image here — that caused a dead-end card loop with no actual generation.

  if (GENERATE_VIDEO_INTENT_REGEX.test(userText)) {
    return {
      tool: "generate_video",
      responseText:
        `Yes. Let’s turn one of your strongest photos into motion.\n` +
        `${formatMayaToolMarker("generate_video")}`,
    }
  }

  if (SHOW_GALLERY_INTENT_REGEX.test(userText) || /\bmy gallery\b/i.test(userText)) {
    return {
      tool: "show_gallery",
      responseText: `Of course. Let’s reuse something beautiful before we spend credits on a new image.\n${formatMayaToolMarker("show_gallery")}`,
    }
  }

  if (SHOW_STUDIO_HUB_INTENT_REGEX.test(userText)) {
    return {
      tool: "show_studio_hub",
      responseText:
        `Absolutely. I’m pulling your Studio Hub so you can see what we’ve already made and choose the next move.\n` +
        `${formatMayaToolMarker("show_studio_hub")}`,
    }
  }

  if (SHOW_CAPABILITIES_INTENT_REGEX.test(userText)) {
    return {
      tool: "show_capabilities",
      responseText:
        `You’ve got options here. I’ll keep it simple and show you what I can run right now.\n` +
        `${formatMayaToolMarker("show_capabilities")}`,
    }
  }

  return null
}

export function hydrateMayaToolDispatchIntent(
  intent: MayaToolDispatchIntent,
  snapshot: MayaHydrationSnapshot | null,
): MayaToolDispatchIntent {
  if (!snapshot) return intent

  if (intent.tool === "show_capabilities") {
    const statusLine = snapshot.offerBrief.hasCoreFields
      ? "I already have your core brand context, so we can move straight into making something useful."
      : "I can start with what I know, then ask only for what’s missing. No overwhelm."

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
        ? "Your workspace is active. I’ll load your latest assets and drafts so we can keep building."
        : "I’ll open your Studio Hub now. Once we create assets, they’ll live here automatically."

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
    const requestedSource = (intent.source || "choose_source") as ModelChoiceSource
    const policy = resolveModelChoice({
      readiness: {
        hasTrainedModel: snapshot.generation.canUseCustomModel,
        canUseSelfies: snapshot.generation.canUseSelfies,
      },
      selectedSource: requestedSource,
    })

    if (policy.fallbackReason === "training_required") {
      if (snapshot.generation.canUseSelfies) {
        return {
          ...intent,
          source: "selfies",
          responseText:
            `Your trained model isn’t ready yet, so we’ll use Selfie mode and keep your momentum going.\n` +
            `${formatMayaToolMarker("generate_image", "selfies")}`,
        }
      }

      return {
        ...intent,
        source: "choose_source",
        responseText:
          `Your trained model isn’t ready yet. You can upload selfies now, or train My Model when you want that consistent look.\n` +
          `${formatMayaToolMarker("show_upload_zone", "selfies")}\n` +
          `${formatMayaToolMarker("generate_image", "choose_source")}`,
      }
    }

    if (policy.fallbackReason === "no_selfies") {
      return {
        ...intent,
        responseText:
          `I don’t see selfies uploaded yet. Drop 6-12 good ones and I’ll help you create from there.\n` +
          `${formatMayaToolMarker("show_upload_zone", "selfies")}`,
      }
    }

    if (requestedSource === "choose_source") {
      return {
        ...intent,
        source: "choose_source",
        responseText:
          `Choose the source you want me to use first, then confirm. We’ll keep the credit spend intentional.\n` +
          `${formatMayaToolMarker("generate_image", "choose_source")}`,
      }
    }

    return {
      ...intent,
      source: policy.effectiveSource,
      responseText:
        `I found the right source for this. Review it, then confirm before I spend credits.\n` +
        `${formatMayaToolMarker("generate_image", policy.effectiveSource)}`,
    }
  }

  if (intent.tool === "generate_video") {
    const readinessLine = snapshot.uploads.hasAny
      ? "I’ll use your existing visuals and move straight into animation."
      : "I’ll check your latest gallery first, then we’ll make the motion feel intentional."

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
