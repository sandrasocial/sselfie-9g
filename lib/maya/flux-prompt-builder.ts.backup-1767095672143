import { FASHION_TRENDS_2025 } from "./fashion-knowledge-2025"

export interface FluxPromptComponents {
  trigger: string
  gender: string
  quality: string[]
  styleDescription: string
  handGuidance: string
  instagramAesthetic: string
  colorGrading: string
  realismKeywords: string
}

export interface FluxPromptOptions {
  userTriggerToken: string
  userGender?: string | null
  userEthnicity?: string | null
  physicalPreferences?: string | null
  includeQualityHints?: boolean
  includeHandGuidance?: boolean
  aestheticPreference?: string
}

export interface GeneratedFluxPrompt {
  prompt: string
  components: FluxPromptComponents
  wordCount: number
  characterCount: number
  aestheticUsed: string
}

export class FluxPromptBuilder {
  /**
   * Generate intelligent FLUX prompt with Instagram aesthetics
   * Uses fashion knowledge base for trend-aware, category-specific prompting
   */
  static generateFluxPrompt(
    conceptTitle: string,
    conceptDescription: string,
    category: string,
    options: FluxPromptOptions,
    referenceImageUrl?: string,
  ): GeneratedFluxPrompt {
    const {
      userTriggerToken,
      userGender,
      userEthnicity,
      physicalPreferences,
      includeQualityHints = true,
      includeHandGuidance = true,
      aestheticPreference,
    } = options

    console.log("[v0] Generating intelligent FLUX prompt with Instagram aesthetics")

    const aesthetic = this.getInstagramAesthetic(aestheticPreference)

    const colorGrading = this.getColorGrading(category)

    const realismKeywords = this.getRealismKeywords()

    const luxuryUrbanKeywords = this.getLuxuryUrbanKeywords()
    const instagramPose = this.getInstagramPose(category)
    const urbanLighting = this.getUrbanLighting()

    const components: FluxPromptComponents = {
      trigger: userTriggerToken,
      gender: this.getGenderToken(userGender, userEthnicity),
      quality: includeQualityHints ? this.getIntelligentQualityHints() : [],
      styleDescription: conceptDescription,
      handGuidance: includeHandGuidance
        ? "perfect hands with five fingers, well-formed hands, anatomically correct hands"
        : "",
      instagramAesthetic: aesthetic.keywords.join(", "),
      colorGrading,
      realismKeywords,
    }

    // Clean physical preferences - convert instruction phrases to descriptive language, preserve user intent
    let cleanedPhysicalPreferences = ""
    if (physicalPreferences) {
      cleanedPhysicalPreferences = this.convertPhysicalPreferencesToPrompt(physicalPreferences)
    }

    const promptParts = [
      components.trigger,
      components.gender,
      cleanedPhysicalPreferences || "", // Add cleaned physical preferences after gender
      components.styleDescription,
      instagramPose,
      luxuryUrbanKeywords,
      urbanLighting,
      components.instagramAesthetic,
      components.realismKeywords,
      ...components.quality,
      components.handGuidance,
    ].filter(Boolean)

    const prompt = promptParts.join(", ")

    console.log("[v0] Intelligent prompt with Instagram aesthetic:", {
      aestheticUsed: aesthetic.name,
      category,
      wordCount: prompt.split(/\s+/).length,
      hasInstagramKeywords: true,
      hasCategoryColorGrading: true,
    })

    return {
      prompt,
      components,
      wordCount: prompt.split(/\s+/).length,
      characterCount: prompt.length,
      aestheticUsed: aesthetic.name,
    }
  }

  private static getInstagramAesthetic(preference?: string) {
    const aesthetics = FASHION_TRENDS_2025.instagram.aesthetics

    // If user has preference, use it
    if (preference && aesthetics[preference as keyof typeof aesthetics]) {
      return aesthetics[preference as keyof typeof aesthetics]
    }

    // Default to raw authentic (most viral in 2025)
    return aesthetics.raw_authentic
  }

  private static getColorGrading(category: string): string {
    const grading: Record<string, string> = {
      "Close-Up Portrait": "soft muted tones, natural skin warmth, gentle shadows",
      "Half Body Lifestyle": "desaturated warm tones, editorial mood, balanced exposure",
      "Environmental Portrait": "crushed blacks, moody atmospheric, dramatic contrast",
      "Close-Up Action": "high contrast, rich saturation, dynamic tones",
      "Product Focus": "clean whites, accurate colors, soft commercial lighting",
      "Candid Moment": "natural color balance, authentic tones, real-world lighting",
    }

    return grading[category] || "natural color balance, authentic lighting"
  }

  private static getRealismKeywords(): string {
    return [
      "amateur cellphone quality",
      "visible sensor noise",
      "heavy HDR glow",
      "blown-out highlights",
      "crushed shadows",
      "raw photography",
      "skin texture visible",
      "pores visible",
      "natural imperfections",
      "subtle film grain",
      "muted colors",
      "authentic texture",
      "realistic skin texture",
    ].join(", ")
  }

  private static getIntelligentQualityHints(): string[] {
    return ["shot on iPhone 15 Pro", "natural lighting", "authentic moment captured"]
  }

  private static getGenderToken(userGender?: string | null, userEthnicity?: string | null): string {
    let genderTerm = "person"

    switch (userGender?.toLowerCase()) {
      case "woman":
      case "female":
        genderTerm = "woman"
        break
      case "man":
      case "male":
        genderTerm = "man"
        break
      case "non-binary":
        genderTerm = "non-binary person"
        break
    }

    // Include ethnicity if provided for accurate representation
    if (userEthnicity && userEthnicity !== "Other") {
      return `${userEthnicity} ${genderTerm}`
    }

    return genderTerm
  }

  private static getLuxuryUrbanKeywords(): string {
    // Return minimal - Maya's fashion intelligence generates context-appropriate keywords
    return "moody urban atmosphere"
  }

  private static getInstagramPose(category: string): string {
    const poses: Record<string, string> = {
      "Close-Up Portrait": "looking over shoulder away from camera, profile angle",
      "Half Body Lifestyle": "leaning against wall, hand in pocket, looking to side",
      "Environmental Portrait": "walking mid-stride, looking away naturally",
      "Close-Up Action": "adjusting sunglasses while looking down",
      "Product Focus": "holding product naturally while looking away",
      "Candid Moment": "caught mid-movement, looking away from camera naturally",
    }

    return poses[category] || "natural candid pose, looking away from camera"
  }

  private static getUrbanLighting(): string {
    return "overcast natural light, muted desaturated tones, crushed blacks, cool neutral temperature, moody urban atmosphere"
  }

  /**
   * Convert physical preferences from instruction language to descriptive prompt language
   * Key principle: PRESERVE user intent, just remove instruction-style language
   */
  private static convertPhysicalPreferencesToPrompt(preferences: string): string {
    let result = preferences.trim()

    // Step 1: Handle "natural hair color" specifically - PRESERVE THE INTENT
    // Convert "keep my natural hair color" → "natural hair color"
    const hasNaturalHairColor = /\b(?:keep\s+my\s+natural\s+hair\s+color|keep\s+my\s+natural\s+hair)\b/gi.test(result)
    if (hasNaturalHairColor) {
      // Replace the instruction phrase with just "natural hair color"
      result = result.replace(/\bkeep\s+my\s+natural\s+hair\s+color\b/gi, "natural hair color")
      result = result.replace(/\bkeep\s+my\s+natural\s+hair\b/gi, "natural hair color")
    }

    // Step 2: Handle "the face" or "face" - convert to descriptive
    // "dont change the face" → "natural facial features"
    // "don't change the face" → "natural facial features"
    result = result.replace(/\b(?:dont|don't)\s+change\s+the\s+face\b/gi, "natural facial features")
    result = result.replace(/\b(?:dont|don't)\s+change\s+face\b/gi, "natural facial features")
    
    // If just "the face" remains (after removing instruction verbs), convert it
    // Use word boundaries to ensure we only match standalone "the face"
    result = result.replace(/\bthe\s+face\b/gi, "natural facial features")
    
    // Note: We don't replace standalone "face" as it might be part of other phrases
    // The user's descriptive modifications should be preserved as-is

    // Step 3: Handle "natural features" - preserve as descriptive
    // "preserve my natural features" → "natural features"
    result = result.replace(/\b(?:preserve|keep|maintain)\s+my\s+natural\s+features\b/gi, "natural features")

    // Step 4: Handle "natural eye color" - preserve intent
    result = result.replace(/\bkeep\s+my\s+natural\s+eye\s+color\b/gi, "natural eye color")
    result = result.replace(/\bkeep\s+my\s+natural\s+eyes\b/gi, "natural eye color")

    // Step 5: Remove instruction verbs/phrases (but keep the descriptive content)
    // Remove: "always keep my", "keep my", "preserve my", "maintain my", "dont change", "don't change"
    result = result.replace(/\balways\s+keep\s+my\b/gi, "")
    result = result.replace(/\bkeep\s+my\b/gi, "")
    result = result.replace(/\bpreserve\s+my\b/gi, "")
    result = result.replace(/\bmaintain\s+my\b/gi, "")
    result = result.replace(/\b(?:dont|don't)\s+change\b/gi, "")
    result = result.replace(/\bdo\s+not\s+change\b/gi, "")

    // Step 6: Clean up extra spaces, commas, and normalize
    result = result
      .replace(/,\s*,/g, ",") // Remove double commas
      .replace(/,\s*,/g, ",") // Remove double commas again (in case of triple)
      .replace(/^,\s*/, "") // Remove leading comma
      .replace(/\s*,\s*$/, "") // Remove trailing comma
      .replace(/\s+/g, " ") // Normalize multiple spaces
      .trim() // Final trim

    return result
  }
}
