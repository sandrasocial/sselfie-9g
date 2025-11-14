import { FASHION_TRENDS_2025 } from './fashion-knowledge-2025'

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
    const { userTriggerToken, userGender, includeQualityHints = true, includeHandGuidance = true, aestheticPreference } = options

    console.log("[v0] Generating intelligent FLUX prompt with Instagram aesthetics")

    const aesthetic = this.getInstagramAesthetic(aestheticPreference)
    
    const colorGrading = this.getColorGrading(category)
    
    const realismKeywords = this.getRealismKeywords()

    const luxuryUrbanKeywords = this.getLuxuryUrbanKeywords()
    const instagramPose = this.getInstagramPose(category)
    const urbanLighting = this.getUrbanLighting()

    const components: FluxPromptComponents = {
      trigger: userTriggerToken,
      gender: this.getGenderToken(userGender),
      quality: includeQualityHints ? this.getIntelligentQualityHints() : [],
      styleDescription: conceptDescription,
      handGuidance: includeHandGuidance
        ? "perfect hands with five fingers, well-formed hands, anatomically correct hands"
        : "",
      instagramAesthetic: aesthetic.keywords.join(", "),
      colorGrading,
      realismKeywords,
    }

    const promptParts = [
      components.trigger,
      components.gender,
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
    ].join(", ")
  }

  private static getIntelligentQualityHints(): string[] {
    return [
      "shot on iPhone 15 Pro",
      "natural lighting",
      "authentic moment captured",
    ]
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

  private static getLuxuryUrbanKeywords(): string {
    return "European architecture, oversized designer pieces, luxury street style, moody urban atmosphere"
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
}
