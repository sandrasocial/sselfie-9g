/**
 * Photoshoot Session Management - DEPRECATED
 *
 * This file is being phased out in favor of intelligent, dynamic prompt generation.
 * Maya now handles consistency through advanced prompting rather than hardcoded templates.
 *
 * Kept for backward compatibility with existing photoshoot creation endpoint.
 */

export interface PhotoshootSession {
  baseOutfit: string
  baseLocation: string
  baseHairStyle: string
  baseAccessories: string
  baseSeed: number
  colorPalette: string
  lightingStyle: string
  vibe: string
}

export interface PhotoshootConcept {
  title: string
  description: string
  category: string
  pose: string
  seedVariation: number
}

/**
 * @deprecated Use Maya's intelligent prompt generation in chat/route.ts instead
 * This creates hardcoded templates which limit creativity
 */
export class PhotoshootSessionBuilder {
  static generatePhotoshootSession(
    brandProfile: any,
    userGender: string,
    userContext: string,
  ): {
    session: PhotoshootSession
    concepts: PhotoshootConcept[]
  } {
    console.log("[v0] [PHOTOSHOOT] ⚠️ DEPRECATED: Using legacy template system")
    console.log("[v0] [PHOTOSHOOT] Consider using Maya's intelligent generation instead")

    // Generate base styling that will persist across ALL images
    const session: PhotoshootSession = {
      baseOutfit: this.generateBaseOutfit(brandProfile, userGender),
      baseLocation: this.generateBaseLocation(brandProfile),
      baseHairStyle: this.generateBaseHairStyle(userGender),
      baseAccessories: this.generateBaseAccessories(userGender),
      baseSeed: Math.floor(Math.random() * 1000000), // Single seed for consistency
      colorPalette: brandProfile.color_theme || "warm neutral tones, muted colors",
      lightingStyle: "natural overcast light, soft shadows, golden hour glow",
      vibe: brandProfile.visual_aesthetic || "minimalist luxury, editorial",
    }

    // Generate 9 concepts that use the SAME base styling
    const concepts: PhotoshootConcept[] = [
      {
        title: "The Introduction",
        description: "Close-up portrait establishing your signature look",
        category: "Close-Up",
        pose: "looking over shoulder, natural smile",
        seedVariation: 0,
      },
      {
        title: "In My Element",
        description: "Environmental shot showing your lifestyle",
        category: "Environmental",
        pose: "walking naturally, looking away",
        seedVariation: 1,
      },
      {
        title: "Signature Style",
        description: "Half body showing complete outfit details",
        category: "Half Body",
        pose: "leaning against wall, hand in pocket",
        seedVariation: 2,
      },
      {
        title: "Full Look",
        description: "Full body showcasing the entire aesthetic",
        category: "Full Body",
        pose: "standing confidently, looking to side",
        seedVariation: 3,
      },
      {
        title: "The Details",
        description: "Focused shot highlighting accessories and styling",
        category: "Close-Up",
        pose: "adjusting accessories, looking down",
        seedVariation: 4,
      },
      {
        title: "Candid Moment",
        description: "Natural lifestyle moment in location",
        category: "Lifestyle",
        pose: "mid-movement, authentic moment",
        seedVariation: 5,
      },
      {
        title: "Side Profile",
        description: "Profile angle emphasizing facial features",
        category: "Close-Up",
        pose: "profile view, looking away",
        seedVariation: 6,
      },
      {
        title: "Dynamic Action",
        description: "Movement shot showing energy and personality",
        category: "Action",
        pose: "walking mid-stride, hair flowing",
        seedVariation: 7,
      },
      {
        title: "The Closer",
        description: "Final environmental portrait tying it all together",
        category: "Environmental",
        pose: "sitting at cafe, looking away naturally",
        seedVariation: 8,
      },
    ]

    console.log("[v0] [PHOTOSHOOT] Session created:", {
      outfit: session.baseOutfit.substring(0, 50),
      location: session.baseLocation.substring(0, 50),
      baseSeed: session.baseSeed,
      conceptCount: concepts.length,
    })

    return { session, concepts }
  }

  private static generateBaseOutfit(brandProfile: any, userGender: string): string {
    // Return empty - Maya's fashion intelligence will generate appropriate outfits
    // based on the user's aesthetic, context, and current trends
    console.log("[v0] [PHOTOSHOOT] ⚠️ generateBaseOutfit called - should use Maya's fashion intelligence instead")
    return ""
  }

  private static generateBaseLocation(brandProfile: any): string {
    // Return empty - Maya's fashion intelligence will generate appropriate locations
    console.log("[v0] [PHOTOSHOOT] ⚠️ generateBaseLocation called - should use Maya's fashion intelligence instead")
    return ""
  }

  private static generateBaseHairStyle(userGender: string): string {
    // Return empty - Maya will determine styling based on context
    return ""
  }

  private static generateBaseAccessories(userGender: string): string {
    // Return empty - Maya will determine accessories based on context
    return ""
  }

  /**
   * Build a prompt that combines the base session styling with specific concept details
   */
  static buildConsistentPrompt(
    session: PhotoshootSession,
    concept: PhotoshootConcept,
    triggerWord: string,
    userGender: string,
  ): string {
    const genderTerm =
      userGender === "woman" || userGender === "female"
        ? "woman"
        : userGender === "man" || userGender === "male"
          ? "man"
          : "person"

    // BUILD: Trigger + Gender + Base Styling (CONSISTENT) + Pose (VARIES)
    const promptParts = [
      triggerWord,
      genderTerm,
      session.baseOutfit, // SAME for all 9 images
      session.baseHairStyle, // SAME for all 9 images
      session.baseAccessories, // SAME for all 9 images
      session.baseLocation, // SAME for all 9 images
      concept.pose, // DIFFERENT for each image (pose variation)
      session.lightingStyle,
      session.colorPalette,
      session.vibe,
      // Consistency keywords
      "professional photoshoot, cohesive aesthetic, Instagram carousel style",
      // Quality
      "shot on iPhone 15 Pro, natural lighting, authentic moment, skin texture visible, pores visible",
      "amateur cellphone quality, visible sensor noise, raw photography",
    ]

    const prompt = promptParts.filter(Boolean).join(", ")

    console.log("[v0] [PHOTOSHOOT] Built consistent prompt:", {
      concept: concept.title,
      seedVariation: concept.seedVariation,
      promptLength: prompt.length,
    })

    return prompt
  }
}

/**
 * Simplified helper function for Maya chat to create photoshoot consistency
 * Used directly in generateConceptsTool
 * @deprecated Use Maya chat generation with mode="photoshoot" instead
 */
export async function createPhotoshootSession(params: {
  userGender: string
  aesthetic: string
  context?: string
}): Promise<{
  baseLook: {
    outfit: string
    location: string
    hair: string
    accessories: string
  }
  baseSeed: number
}> {
  const { userGender, aesthetic, context } = params

  console.log("[v0] [PHOTOSHOOT] ⚠️ DEPRECATED: This function uses hardcoded templates")
  console.log("[v0] [PHOTOSHOOT] Recommendation: Use Maya's mode='photoshoot' for intelligent styling")

  // This function is deprecated and should not be used
  return {
    baseLook: {
      outfit: "", // Maya's fashion intelligence will provide
      location: "", // Maya's fashion intelligence will provide
      hair: "", // Maya's fashion intelligence will provide
      accessories: "", // Maya's fashion intelligence will provide
    },
    baseSeed: Math.floor(Math.random() * 1000000),
  }
}
