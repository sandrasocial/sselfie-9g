import { getRecommendedSource } from "@/lib/maya/model-choice-policy"

export type MayaUnifiedMode = "pro" | "maya" | "feed-planner"

const STRUCTURED_CALENDAR_TARGET_REGEX = /\b(content calendar|calendar)\b/i
const STRUCTURED_CALENDAR_CREATE_REGEX =
  /\b(create|build|generate|make|draft|design|write|need|want|show me|give me|can you|could you|help me)\b/i

export interface AutoSelectMayaModeParams {
  hasReferenceImage: boolean
  hasTrainedLoraModel: boolean
  isContentPlanning: boolean
  /** When set, used with hasTrainedLoraModel to resolve recommended source via policy (my model vs selfie). */
  canUseSelfies?: boolean
}

export function isUnifiedMayaUiEnabled(envValue?: string | null): boolean {
  if (!envValue) return false
  const normalized = envValue.trim().toLowerCase()
  return normalized === "true" || normalized === "1"
}

export function autoSelectMayaMode(params: AutoSelectMayaModeParams): MayaUnifiedMode {
  if (params.isContentPlanning) return "feed-planner"
  if (params.hasReferenceImage) return "pro"
  if (params.hasTrainedLoraModel) return "maya"
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

  if (
    STRUCTURED_CALENDAR_TARGET_REGEX.test(normalized) &&
    STRUCTURED_CALENDAR_CREATE_REGEX.test(normalized)
  ) {
    return false
  }

  return /(content plan|content calendar|feed plan|instagram plan|posting plan|caption plan|reels plan|strategy|weekly plan|monthly plan)/.test(
    normalized,
  )
}
