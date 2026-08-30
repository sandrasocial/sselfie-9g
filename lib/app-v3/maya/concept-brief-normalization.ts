import type { CreativePlan } from "@/lib/app-v3/maya/creative-plan"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

/**
 * Tool-stream payloads can contain an empty Creative Plan output array alongside complete
 * legacy slides. Treat that zero-length array as absent so every downstream fallback reaches
 * the supplied slides, including paid multi-image recovery.
 */
export function normalizeConceptBriefPlanOutputs(brief: CreativeBrief): CreativeBrief {
  const graphic = brief.graphic
  const creativePlan = graphic?.creativePlan
  if (
    !creativePlan ||
    (creativePlan.outputs?.length ?? 0) > 0 ||
    !graphic.slides ||
    graphic.slides.length === 0
  ) {
    return brief
  }

  const planWithoutEmptyOutputs = { ...creativePlan } as Partial<CreativePlan>
  delete planWithoutEmptyOutputs.outputs

  return {
    ...brief,
    graphic: {
      ...graphic,
      // The compiler already accepts a missing output list and rebuilds it from graphic.slides.
      creativePlan: planWithoutEmptyOutputs as CreativePlan,
    },
  }
}
