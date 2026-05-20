import { isOpenAIDefaultForUntrainedEnabled } from "@/lib/feature-flags"
import { getRecommendedSource } from "@/lib/maya/model-choice-policy"

export type MayaUnifiedMode = "pro" | "maya" | "feed-planner" | "openai_quick"

const STRUCTURED_CALENDAR_TARGET_REGEX = /\b(content calendar|calendar)\b/i
const STRUCTURED_CALENDAR_CREATE_REGEX =
  /\b(create|build|generate|make|draft|design|write|need|want|show me|give me|can you|could you|help me)\b/i

export interface AutoSelectMayaModeParams {
  hasReferenceImage: boolean
  hasTrainedLoraModel: boolean
  isContentPlanning: boolean
  isImageGeneration?: boolean
  prefersTrainedModel?: boolean
  /** When set, used with hasTrainedLoraModel to resolve recommended source via policy (my model vs selfie). */
  canUseSelfies?: boolean
}

export function isUnifiedMayaUiEnabled(envValue?: string | null): boolean {
  if (!envValue) return true
  const normalized = envValue.trim().toLowerCase()
  return normalized !== "false" && normalized !== "0" && normalized !== "off"
}

/**
 * True when the user is asking Maya to generate photos/images/concepts in this turn.
 * When true, we must NOT route the chat into feed-planner-only prompting (which forbids [GENERATE_CONCEPTS]).
 */
export function isMayaImageGenerationIntent(text: string): boolean {
  const n = text.toLowerCase().trim()
  if (n.length === 0) return false

  const isFullFeedOrGridCreation =
    /\b(create|build|generate|design|draft|plan)\s+(a\s+|my\s+|an\s+|the\s+)?(full\s+)?(new\s+)?(instagram\s+)?(feed|grid|layout)\b/i.test(
      n,
    ) ||
    /\b(9|6|12)[\s-]*(post|posts|grid|slot)|nine[\s-]*post|twelve[\s-]*post\b/i.test(n) ||
    (/\bcontent\s+calendar\b/i.test(n) && /\b(create|build|generate|make|draft)\b/i.test(n))

  if (isFullFeedOrGridCreation) return false

  return (
    /\b(generate|create|make|show\s+me|give\s+me|i\s+need|can\s+you)\b[\s\S]{0,140}\b(photo|photos|image|images|picture|pictures|visuals?|shot|shots|portrait|portraits|headshot|headshots)\b/i.test(
      n,
    ) ||
    /\b(concept cards?|brand photos?|generate\s+concepts?|make\s+concepts?)\b/i.test(n) ||
    /\b(paint|shoot|capture)\b[\s\S]{0,40}\b(me\s+)?(a\s+)?(photo|image|portrait)\b/i.test(n)
  )
}

export function isExplicitTrainedModelIntent(text: string): boolean {
  const n = text.toLowerCase().trim()
  if (!n) return false

  return (
    /\b(use|with|using|generate|create|make|switch to|try)\b[\s\S]{0,80}\b(my\s+)?(trained model|custom model|saved model|trained look|custom look|my model)\b/i.test(
      n,
    ) ||
    /\b(my model|trained model|custom model|trained look|custom look)\b[\s\S]{0,80}\b(use|please|now|instead)\b/i.test(
      n,
    )
  )
}

export function autoSelectMayaMode(params: AutoSelectMayaModeParams): MayaUnifiedMode {
  if (params.isContentPlanning) return "feed-planner"
  if (params.isImageGeneration && params.hasTrainedLoraModel && params.prefersTrainedModel) return "maya"
  // OpenAI is the default visible Maya image path. Trained looks stay available only when requested.
  if (params.isImageGeneration && isOpenAIDefaultForUntrainedEnabled()) return "openai_quick"
  if (params.hasTrainedLoraModel) return "maya"
  if (params.hasReferenceImage) return "pro"
  if (params.canUseSelfies !== undefined) {
    const recommended = getRecommendedSource({
      hasTrainedModel: params.hasTrainedLoraModel,
      canUseSelfies: params.canUseSelfies,
    })
    return recommended === "custom_model" ? "maya" : "pro"
  }
  return "pro"
}

export function isContentPlanningIntent(text: string): boolean {
  const normalized = text.toLowerCase()

  if (isMayaImageGenerationIntent(text)) {
    return false
  }

  if (
    STRUCTURED_CALENDAR_TARGET_REGEX.test(normalized) &&
    STRUCTURED_CALENDAR_CREATE_REGEX.test(normalized)
  ) {
    return false
  }

  // Avoid bare "strategy" — it matched follow-ups like "now generate photos from this strategy"
  // and kept the thread in feed-planner mode (which tells Maya NOT to use [GENERATE_CONCEPTS]).
  return /(content plan|feed plan|instagram plan|posting plan|caption plan|reels plan|weekly plan|monthly plan|content calendar|feed strategy|content strategy|instagram strategy|brand strategy|posting strategy|marketing strategy|strategy for my feed|strategy for my instagram)/.test(
    normalized,
  )
}
