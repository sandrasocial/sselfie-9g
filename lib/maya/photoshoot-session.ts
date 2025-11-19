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
    const aesthetic = brandProfile.visual_aesthetic?.toLowerCase() || "minimalist"

    if (userGender === "woman" || userGender === "female") {
      if (aesthetic.includes("luxury") || aesthetic.includes("editorial")) {
        return "oversized black blazer, white t-shirt, designer black bag with gold hardware, gold hoop earrings"
      }
      if (aesthetic.includes("casual") || aesthetic.includes("lifestyle")) {
        return "cream oversized sweater, high-waisted jeans, minimal gold jewelry, leather crossbody bag"
      }
      if (aesthetic.includes("bold") || aesthetic.includes("vibrant")) {
        return "statement blazer, fitted trousers, bold accessories, designer sunglasses"
      }
      return "tailored black jacket, white tee, minimal gold jewelry, designer accessories"
    } else if (userGender === "man" || userGender === "male") {
      if (aesthetic.includes("luxury") || aesthetic.includes("editorial")) {
        return "tailored black overcoat, white dress shirt, designer watch, leather briefcase"
      }
      if (aesthetic.includes("casual") || aesthetic.includes("lifestyle")) {
        return "camel wool coat, white turtleneck, minimal accessories, leather bag"
      }
      return "structured blazer, crisp white shirt, minimal silver jewelry, leather accessories"
    }

    return "oversized blazer, white tee, minimal accessories, designer bag"
  }

  private static generateBaseLocation(brandProfile: any): string {
    const aesthetic = brandProfile.visual_aesthetic?.toLowerCase() || "minimalist"

    if (aesthetic.includes("urban") || aesthetic.includes("city")) {
      return "European city street, Parisian cafe district, cobblestone streets, elegant architecture"
    }
    if (aesthetic.includes("minimalist") || aesthetic.includes("modern")) {
      return "modern cafe with large windows, natural light, clean lines, minimalist interior"
    }
    if (aesthetic.includes("natural") || aesthetic.includes("organic")) {
      return "outdoor cafe terrace, natural greenery, warm sunlight, organic textures"
    }

    return "chic European cafe district, outdoor seating, wine bar ambiance, architectural backdrop"
  }

  private static generateBaseHairStyle(userGender: string): string {
    if (userGender === "woman" || userGender === "female") {
      return "natural waves, effortless styling"
    } else if (userGender === "man" || userGender === "male") {
      return "natural texture, clean styled"
    }
    return "natural styling"
  }

  private static generateBaseAccessories(userGender: string): string {
    if (userGender === "woman" || userGender === "female") {
      return "gold hoop earrings, designer handbag with gold hardware, minimal rings"
    } else if (userGender === "man" || userGender === "male") {
      return "silver watch, leather accessories, minimal jewelry"
    }
    return "minimal elegant accessories"
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
    const genderTerm = userGender === "woman" || userGender === "female" ? "woman" : 
                       userGender === "man" || userGender === "male" ? "man" : "person"

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

  console.log("[v0] [PHOTOSHOOT] ⚠️ DEPRECATED: Creating session with templates")
  console.log("[v0] [PHOTOSHOOT] Recommendation: Use Maya's mode='photoshoot' for better results")

  const aestheticLower = aesthetic.toLowerCase()

  let outfit = ""
  let location = ""

  if (aestheticLower.includes("paris") || aestheticLower.includes("european") || aestheticLower.includes("luxury")) {
    outfit = "oversized black blazer, white t-shirt, black designer bag with gold hardware"
    location = "European cafe district, Paris wine bar, cobblestone streets"
  } else if (aestheticLower.includes("casual") || aestheticLower.includes("cozy")) {
    outfit = "cream oversized sweater, high-waisted jeans, leather crossbody bag"
    location = "cozy cafe interior, warm lighting, wooden tables"
  } else if (aestheticLower.includes("street") || aestheticLower.includes("urban")) {
    outfit = "oversized hoodie, wide-leg trousers, chunky sneakers, crossbody bag"
    location = "urban city street, graffiti walls, modern architecture"
  } else if (aestheticLower.includes("clean girl") || aestheticLower.includes("minimal")) {
    outfit = "white linen shirt, tailored beige trousers, minimal gold jewelry"
    location = "minimalist cafe, bright natural light, clean aesthetic"
  } else {
    outfit = "tailored blazer, white tee, designer accessories"
    location = "elegant cafe setting, natural light"
  }

  const hair =
    userGender === "woman" || userGender === "female"
      ? "natural waves, effortless styling"
      : userGender === "man" || userGender === "male"
        ? "natural texture, clean styled"
        : "natural styling"

  const accessories =
    userGender === "woman" || userGender === "female"
      ? "gold hoop earrings, designer handbag with gold hardware, minimal rings"
      : userGender === "man" || userGender === "male"
        ? "silver watch, leather accessories"
        : "minimal elegant accessories"

  const baseSeed = Math.floor(Math.random() * 1000000)

  console.log("[v0] [PHOTOSHOOT] Template session created:", {
    outfit: outfit.substring(0, 40) + "...",
    location: location.substring(0, 40) + "...",
    baseSeed,
  })

  return {
    baseLook: {
      outfit,
      location,
      hair,
      accessories,
    },
    baseSeed,
  }
}
