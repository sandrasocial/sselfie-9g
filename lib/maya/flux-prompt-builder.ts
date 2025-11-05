export interface FluxPromptComponents {
  trigger: string
  gender: string
  quality: string[]
  styleDescription: string
  negatives: string
}

export interface FluxPromptOptions {
  userTriggerToken: string
  userGender?: string | null
  includeQualityHints?: boolean
  includeNegativePrompts?: boolean
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
    const { userTriggerToken, userGender, includeQualityHints = true, includeNegativePrompts = true } = options

    console.log("[v0] Generating FLUX prompt without template overrides")
    console.log("[v0] Using Maya's creative description directly:", {
      hasReferenceImage: !!referenceImageUrl,
      category,
      descriptionLength: conceptDescription.length,
    })

    const categoryNegatives = this.getCategoryNegatives(category)

    const components: FluxPromptComponents = {
      trigger: userTriggerToken,
      gender: this.getGenderToken(userGender),
      quality: includeQualityHints
        ? ["raw photo", "editorial quality", "professional photography", "sharp focus", "high resolution"]
        : [],
      styleDescription: conceptDescription, // Maya's full creative vision - no template overrides
      negatives: includeNegativePrompts
        ? `${categoryNegatives}, blurry, low quality, distorted, deformed, ugly, bad anatomy, disfigured hands, extra fingers, missing fingers, fused fingers, too many fingers, extra limbs, missing limbs, extra arms, extra legs, malformed limbs, mutated hands, poorly drawn hands, poorly drawn face, mutation, watermark, signature, text, logo`
        : "",
    }

    // Simple, clean prompt structure - let Maya's creativity shine
    const promptParts = [
      components.trigger,
      components.gender,
      ...components.quality,
      components.styleDescription, // This is Maya's analyzed style - trust her expertise
    ].filter(Boolean)

    let prompt = promptParts.join(", ")

    if (components.negatives && includeNegativePrompts) {
      prompt += ` --no ${components.negatives}`
    }

    console.log("[v0] Final prompt structure:", {
      wordCount: prompt.split(/\s+/).length,
      characterCount: prompt.length,
      hasReferenceImage: !!referenceImageUrl,
      category,
      categoryNegatives,
    })

    return {
      prompt,
      components,
      wordCount: prompt.split(/\s+/).length,
      characterCount: prompt.length,
    }
  }

  private static getCategoryNegatives(category: string): string {
    switch (category) {
      case "Close-Up":
        return "full body, legs, feet, shoes, boots, waist, hips, walking, standing, full figure, distant shot, wide shot"
      case "Half Body":
        return "full body, legs visible, feet, shoes, boots, pants, jeans, walking, stride, full figure, distant shot, wide shot"
      case "Lifestyle":
        // Allow full body but prevent distant framing
        return "distant figure, shot from far away, wide shot, small in frame, tiny person, far distance, blurry face, disfigured face"
      case "Action":
        // Allow movement and full body but prevent distant framing
        return "distant figure, shot from far away, wide shot, small in frame, tiny person, far distance, blurry face, disfigured face"
      case "Environmental":
        // Allow environment but subject must be prominent
        return "distant figure, shot from far away, wide environmental shot, small in frame, tiny person, vast landscape with small figure, far distance, blurry face, disfigured face"
      default:
        return "distant shot, wide shot, small in frame, blurry face, disfigured face"
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
