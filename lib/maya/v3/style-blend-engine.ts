/**
 * Maya 3.0 Style Blend Engine
 *
 * Merges user personal aesthetic with trending Instagram fashion looks,
 * color palettes, and wardrobe suggestions.
 */

export interface StyleBlendBlock {
  personalAesthetic: string[]
  trendingLooks: string[]
  colorPalette: string[]
  wardrobeKeywords: string[]
}

const STYLE_AESTHETICS = {
  minimalist: {
    keywords: ["clean lines", "neutral palette", "simple silhouettes", "quality basics"],
    colors: ["black", "white", "beige", "gray", "camel"],
    wardrobe: ["tailored blazer", "white tee", "straight jeans", "minimal jewelry"],
  },
  boho: {
    keywords: ["flowing fabrics", "earthy tones", "layered textures", "natural materials"],
    colors: ["terracotta", "sage green", "cream", "rust", "warm browns"],
    wardrobe: ["flowing dress", "layered necklaces", "wide-brim hat", "suede boots"],
  },
  edgy: {
    keywords: ["leather accents", "bold pieces", "urban style", "statement items"],
    colors: ["black", "dark denim", "burgundy", "metallic accents"],
    wardrobe: ["leather jacket", "combat boots", "ripped jeans", "chain accessories"],
  },
  feminine: {
    keywords: ["soft fabrics", "romantic details", "flattering fits", "delicate accessories"],
    colors: ["blush pink", "soft lavender", "cream", "rose gold"],
    wardrobe: ["flowy dress", "delicate jewelry", "feminine blouse", "soft knits"],
  },
  classic: {
    keywords: ["timeless pieces", "elegant style", "refined details", "polished look"],
    colors: ["navy", "ivory", "camel", "burgundy", "black"],
    wardrobe: ["trench coat", "pearl earrings", "tailored pants", "silk blouse"],
  },
  casual: {
    keywords: ["comfortable style", "effortless look", "everyday basics", "relaxed fit"],
    colors: ["denim blue", "white", "gray", "olive green", "tan"],
    wardrobe: ["oversized sweater", "jeans", "sneakers", "casual tee", "denim jacket"],
  },
}

const TRENDING_LOOKS_2025 = [
  "quiet luxury aesthetic",
  "clean girl aesthetic",
  "coastal grandmother",
  "dark academia",
  "Scandi minimalism",
  "Y2K revival",
  "cottagecore refined",
  "urban sophisticate",
  "athleisure elevated",
  "neo-bohemian",
]

export function getStyleBlendBlocks(userStyles: string[]): StyleBlendBlock {
  // Merge multiple user style preferences
  const blendedStyle: StyleBlendBlock = {
    personalAesthetic: [],
    trendingLooks: [],
    colorPalette: [],
    wardrobeKeywords: [],
  }

  // Collect keywords from user's style preferences
  userStyles.forEach((style) => {
    const styleKey = style.toLowerCase()
    const aesthetic = STYLE_AESTHETICS[styleKey as keyof typeof STYLE_AESTHETICS]

    if (aesthetic) {
      blendedStyle.personalAesthetic.push(...aesthetic.keywords)
      blendedStyle.colorPalette.push(...aesthetic.colors)
      blendedStyle.wardrobeKeywords.push(...aesthetic.wardrobe)
    }
  })

  // Add trending looks that complement the user's style
  blendedStyle.trendingLooks = TRENDING_LOOKS_2025.slice(0, 3)

  // Remove duplicates
  blendedStyle.personalAesthetic = [...new Set(blendedStyle.personalAesthetic)]
  blendedStyle.colorPalette = [...new Set(blendedStyle.colorPalette)]
  blendedStyle.wardrobeKeywords = [...new Set(blendedStyle.wardrobeKeywords)]

  return blendedStyle
}

export function getAvailableStyles(): string[] {
  return Object.keys(STYLE_AESTHETICS).map((key) => key.charAt(0).toUpperCase() + key.slice(1))
}

export function getTrendingLooks(): string[] {
  return TRENDING_LOOKS_2025
}
