export interface FluxPromptComponents {
  trigger: string
  gender: string
  quality: string[]
  camera: string
  lighting: string
  setting: string
  subject: string
  pose: string
  composition: string
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
   */
  static generateFluxPrompt(
    conceptTitle: string,
    conceptDescription: string,
    category: string,
    options: FluxPromptOptions,
  ): GeneratedFluxPrompt {
    const { userTriggerToken, userGender, includeQualityHints = true, includeNegativePrompts = true } = options

    const components: FluxPromptComponents = {
      trigger: userTriggerToken,
      gender: this.getGenderToken(userGender),
      quality: includeQualityHints
        ? [
            "raw photo",
            "editorial quality",
            "professional photography",
            "sharp focus",
            "high resolution",
            "8k uhd",
            "dslr",
          ]
        : [],
      camera: this.buildCameraSpecs(category),
      lighting: this.buildLightingSpecs(category),
      setting: this.extractSettingFromDescription(conceptDescription),
      subject: this.buildSubjectSpecs(conceptDescription, userGender),
      pose: this.extractPoseFromDescription(conceptDescription),
      composition: this.buildCompositionSpecs(category),
      negatives: includeNegativePrompts
        ? "blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, signature, text"
        : "",
    }

    // Assemble final prompt
    const promptParts = [
      // Core identity
      components.trigger,
      components.gender,

      // Quality foundation
      ...components.quality,

      // Technical specs
      components.camera,
      components.lighting,

      // Scene and subject
      components.setting,
      components.subject,
      components.pose,

      // Composition
      components.composition,
    ].filter(Boolean)

    let prompt = promptParts.join(", ")

    // Add negative prompts
    if (components.negatives && includeNegativePrompts) {
      prompt += ` --no ${components.negatives}`
    }

    const wordCount = prompt.split(/\s+/).length
    const characterCount = prompt.length

    console.log("[v0] FLUX prompt generated:", {
      wordCount,
      characterCount,
      trigger: components.trigger,
      gender: components.gender,
    })

    return {
      prompt,
      components,
      wordCount,
      characterCount,
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

  private static buildCameraSpecs(category: string): string {
    const specs = []

    if (category === "portrait" || category === "headshot") {
      specs.push("85mm lens", "shallow depth of field", "bokeh background")
    } else if (category === "lifestyle") {
      specs.push("35mm lens", "natural depth of field")
    } else if (category === "editorial") {
      specs.push("50mm lens", "medium depth of field")
    } else {
      specs.push("professional camera", "optimal depth of field")
    }

    return specs.join(", ")
  }

  private static buildLightingSpecs(category: string): string {
    const specs = []

    if (category === "portrait" || category === "headshot") {
      specs.push("soft studio lighting", "professional key light", "subtle fill light")
    } else if (category === "lifestyle") {
      specs.push("natural lighting", "golden hour", "soft ambient light")
    } else if (category === "editorial") {
      specs.push("dramatic lighting", "professional studio setup", "controlled shadows")
    } else {
      specs.push("professional lighting", "well-lit scene")
    }

    return specs.join(", ")
  }

  private static extractSettingFromDescription(description: string): string {
    // Extract setting keywords from description
    const settingKeywords = [
      "studio",
      "outdoor",
      "indoor",
      "office",
      "cafe",
      "street",
      "park",
      "home",
      "minimalist",
      "modern",
      "elegant",
      "urban",
      "natural",
    ]

    const foundSettings = settingKeywords.filter((keyword) => description.toLowerCase().includes(keyword))

    if (foundSettings.length > 0) {
      return `${foundSettings.join(", ")} setting`
    }

    return "professional setting"
  }

  private static buildSubjectSpecs(description: string, userGender?: string | null): string {
    const specs = []

    // Extract attire/style from description
    const styleKeywords = ["casual", "formal", "business", "elegant", "professional", "relaxed", "sophisticated"]

    const foundStyles = styleKeywords.filter((keyword) => description.toLowerCase().includes(keyword))

    if (foundStyles.length > 0) {
      specs.push(`${foundStyles[0]} attire`)
    }

    // Add expression
    specs.push("confident expression", "natural pose")

    return specs.join(", ")
  }

  private static extractPoseFromDescription(description: string): string {
    const poseKeywords = ["standing", "sitting", "leaning", "walking", "looking at camera", "profile", "three-quarter"]

    const foundPoses = poseKeywords.filter((keyword) => description.toLowerCase().includes(keyword))

    if (foundPoses.length > 0) {
      return foundPoses.join(", ")
    }

    return "natural pose, looking at camera"
  }

  private static buildCompositionSpecs(category: string): string {
    const specs = []

    if (category === "portrait" || category === "headshot") {
      specs.push("medium shot", "centered composition", "professional framing")
    } else if (category === "lifestyle") {
      specs.push("full body shot", "dynamic composition", "environmental context")
    } else if (category === "editorial") {
      specs.push("artistic composition", "strong visual impact", "magazine quality")
    } else {
      specs.push("well-balanced composition", "professional framing")
    }

    return specs.join(", ")
  }
}
