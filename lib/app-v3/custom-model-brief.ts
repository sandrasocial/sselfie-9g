import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

export function buildCustomModelConceptPrompt(brief: CreativeBrief): string {
  return [
    brief.outfit,
    brief.setting,
    brief.mood,
    brief.pose,
    brief.cameraSpec,
    brief.lighting,
  ]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(", ")
}

export function buildVideoMotionPrompt(brief: CreativeBrief): string {
  const plannedMotion =
    brief.graphic?.motionPrompt?.trim() ||
    brief.graphic?.creativePlan?.outputs?.[0]?.videoPromptDirection?.trim()
  if (plannedMotion) return plannedMotion

  return [
    brief.pose,
    "subtle natural breathing and tiny expression shift",
    "gentle camera push-in",
    brief.mood,
    brief.lighting,
    "preserve the same face and body",
    "no subtitles or text overlays",
  ]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(", ")
}
