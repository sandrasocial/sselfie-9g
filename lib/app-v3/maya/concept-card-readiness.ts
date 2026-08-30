type ConceptForReadiness = {
  description?: unknown
  brief?: {
    outfit?: unknown
    setting?: unknown
    mood?: unknown
    pose?: unknown
    cameraSpec?: unknown
    lighting?: unknown
  } | null
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

/**
 * Minimum card payload required before Maya offers a paid Create action.
 * Graphic plans carry their production detail in creativePlan/slides, but every card still
 * needs a human-readable description. Photo directions additionally need the six fields used
 * by the prompt compiler; accepting empty strings here creates a generic, unusable render.
 */
export function validateConceptCardReadiness(input: {
  format: string
  concepts: ConceptForReadiness[]
}): string[] {
  const errors: string[] = []
  const photoFormat = input.format === "photo" || input.format === "photoshoot"

  input.concepts.forEach((concept, index) => {
    if (!hasText(concept.description)) {
      errors.push(`concept ${index + 1} needs a description`)
    }
    if (!photoFormat) return

    const brief = concept.brief
    const requiredFields = ["outfit", "setting", "mood", "pose", "cameraSpec", "lighting"] as const
    for (const field of requiredFields) {
      if (!hasText(brief?.[field])) {
        errors.push(`concept ${index + 1} needs brief.${field}`)
      }
    }
  })

  return errors
}
