export interface FluxPromptComponents {
  trigger: string
  gender: string
  quality: string[]
  styleDescription: string
  handGuidance: string
}

export interface FluxPromptOptions {
  userTriggerToken: string
  userGender?: string | null
  includeQualityHints?: boolean
  includeHandGuidance?: boolean
}

export interface GeneratedFluxPrompt {
  prompt: string
  components: FluxPromptComponents
  wordCount: number
  characterCount: number
}

export class FluxPromptBuilder {
  /**
   * Generate FLUX prompt from concept card
   * Now uses Maya's creative description directly without template overrides
   */
  static generateFluxPrompt(
    conceptTitle: string,
    conceptDescription: string,
    category: string,
    options: FluxPromptOptions,
    referenceImageUrl?: string,
  ): GeneratedFluxPrompt {
    const { userTriggerToken, userGender, includeQualityHints = true, includeHandGuidance = true } = options

    console.log("[v0] Generating FLUX prompt with brand-aware styling enforcement")
    console.log("[v0] Using Maya's creative description with brand styling priority:", {
      hasReferenceImage: !!referenceImageUrl,
      category,
      descriptionLength: conceptDescription.length,
      gender: userGender,
    })

    const components: FluxPromptComponents = {
      trigger: userTriggerToken,
      gender: this.getGenderToken(userGender),
      quality: includeQualityHints ? ["professional photography", "sharp focus", "high resolution"] : [],
      styleDescription: conceptDescription,
      handGuidance: includeHandGuidance
        ? "perfect hands with five fingers, well-formed hands, anatomically correct hands"
        : "",
    }

    const promptParts = [
      components.trigger,
      components.gender,
      components.styleDescription,
      ...components.quality,
      components.handGuidance,
    ].filter(Boolean)

    const prompt = promptParts.join(", ")

    console.log("[v0] Brand-aware prompt structure (no negative prompts - Flux doesn't support them):", {
      wordCount: prompt.split(/\s+/).length,
      characterCount: prompt.length,
      hasReferenceImage: !!referenceImageUrl,
      category,
      prioritizesBrandStyling: true,
    })

    return {
      prompt,
      components,
      wordCount: prompt.split(/\s+/).length,
      characterCount: prompt.length,
    }
  }

  private static getGenderToken(userGender?: string | null): string {
    switch (userGender?.toLowerCase()) {
      case "woman":
      case "female":
        return "woman"
      case "man":
      case "male":
        return "man"
      case "non-binary":
        return "non-binary person"
      default:
        return "person"
    }
  }
}
