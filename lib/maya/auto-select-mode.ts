export type MayaUnifiedMode = "pro" | "maya" | "feed-planner"

export interface AutoSelectMayaModeParams {
  hasReferenceImage: boolean
  hasTrainedLoraModel: boolean
  isContentPlanning: boolean
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
  return "pro"
}

export function isContentPlanningIntent(text: string): boolean {
  const normalized = text.toLowerCase()
  return /(content plan|content calendar|feed plan|instagram plan|posting plan|caption plan|reels plan|strategy|weekly plan|monthly plan)/.test(
    normalized,
  )
}
