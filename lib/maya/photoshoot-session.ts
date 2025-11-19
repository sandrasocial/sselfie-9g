/**
 * Photoshoot Session Management
 * Creates consistent visual identity across all 9 concept cards in a feed
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
  seedVariation: number // +0, +1, +2, etc from baseSeed
}

export class PhotoshootSessionBuilder {
  /**
   * Generate a photoshoot session with consistent styling across all images
   * This creates the "Instagram carousel" effect where all 9 images look cohesive
   */
  static generatePhotoshootSession(
    brandProfile: any,
    userGender: string,
    userContext: string,
  ): {
    session: PhotoshootSession
    concepts: PhotoshootConcept[]
  } {
    console.log("[v0] [PHOTOSHOOT] Generating consistent photoshoot session")

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
      // Default elegant
      return "tailored black jacket, white tee, minimal gold jewelry, designer accessories"
    } else if (userGender === "man" || userGender === "male") {
      if (aesthetic.includes("luxury") || aesthetic.includes("editorial")) {
        return "tailored black overcoat, white dress shirt, designer watch, leather briefcase"
      }
      if (aesthetic.includes("casual") || aesthetic.includes("lifestyle")) {
        return "camel wool coat, white turtleneck, minimal accessories, leather bag"
      }
      // Default masculine elegant
      return "structured blazer, crisp white shirt, minimal silver jewelry, leather accessories"
    }

    // Gender-neutral default
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

    // Default luxury urban
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
 * Simplified helper function for carousel photoshoot creation ONLY
 * NO LONGER USED for regular concept generation
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

  console.log("[v0] [PHOTOSHOOT] Creating carousel session for:", { userGender, aesthetic })

  // Regular concept cards bypass this entirely and use Maya's dynamic prompting
  
  const aestheticLower = aesthetic.toLowerCase()

  let outfit = ""
  let location = ""

  // Only basic fallbacks, not prescriptive templates
  if (aestheticLower.includes("paris") || aestheticLower.includes("european") || aestheticLower.includes("luxury")) {
    outfit = "tailored outfit with designer accessories"
    location = "European cafe district or urban architecture"
  } else if (aestheticLower.includes("casual") || aestheticLower.includes("cozy")) {
    outfit = "comfortable elevated basics with minimal accessories"
    location = "cozy natural setting with warm lighting"
  } else if (aestheticLower.includes("street") || aestheticLower.includes("urban")) {
    outfit = "urban streetwear with statement pieces"
    location = "city street with modern architecture"
  } else {
    // Default fallback
    outfit = "styled outfit matching the aesthetic"
    location = "setting that complements the vibe"
  }

  const hair = userGender === "woman" || userGender === "female"
    ? "natural styling"
    : userGender === "man" || userGender === "male"
    ? "natural grooming"
    : "natural styling"

  const accessories = userGender === "woman" || userGender === "female"
    ? "minimal elegant accessories"
    : userGender === "man" || userGender === "male"
    ? "subtle accessories"
    : "minimal accessories"

  const baseSeed = Math.floor(Math.random() * 1000000)

  console.log("[v0] [PHOTOSHOOT] Carousel session created for consistency:", {
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
