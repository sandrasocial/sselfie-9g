type PhotoshootBriefForValidation = {
  shotRole?: string | null
}

type EmittedConcept = {
  brief: PhotoshootBriefForValidation & {
    graphic?: {
      creativePlan?: {
        outputCount: number
      }
    }
  }
}

export type EmittedConceptPlan = {
  format: string
  concepts: EmittedConcept[]
}

/**
 * One shared copy of the full-shoot rules used at concept emission and generation time.
 * These rules moved verbatim from the generate route. Keep the render route backstop.
 */
export function validatePhotoshootBriefs(briefs: PhotoshootBriefForValidation[]): string[] {
  const errors: string[] = []
  if (briefs.length < 6) errors.push(`photoshoot needs at least 6 shots, got ${briefs.length}`)
  const roles = briefs.map(brief => brief.shotRole).filter(Boolean)
  if (roles.length !== briefs.length) errors.push("every photoshoot shot needs a shotRole")
  if (new Set(roles).size < Math.min(4, briefs.length)) {
    errors.push("photoshoot needs at least 4 distinct shot roles")
  }
  const detailCount = roles.filter(role => role === "true-detail").length
  if (detailCount < 1 || detailCount > 2) {
    errors.push(`photoshoot needs 1-2 true-detail shots, got ${detailCount}`)
  }
  return errors
}

/** One shared copy of the accepted story-sequence counts. */
export function validateStorySequenceOutputCount(plan: { outputCount: number }): string[] {
  return [3, 5, 7].includes(plan.outputCount)
    ? []
    : [`story_sequence outputCount must be 3, 5, or 7, got ${plan.outputCount}`]
}

/** Semantic checks that must pass before an emit_concepts card reaches the member. */
export function validateEmittedConceptPlan(plan: EmittedConceptPlan): string[] {
  if (plan.format === "photoshoot") {
    return validatePhotoshootBriefs(plan.concepts.map(concept => concept.brief))
  }

  if (plan.format === "story-sequence") {
    return plan.concepts.flatMap((concept, index) => {
      const creativePlan = concept.brief.graphic?.creativePlan
      if (!creativePlan) return [`story_sequence concept ${index + 1} needs a creativePlan`]
      return validateStorySequenceOutputCount(creativePlan)
    })
  }

  return []
}
