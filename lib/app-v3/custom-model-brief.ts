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
