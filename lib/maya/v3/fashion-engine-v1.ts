/**
 * Fashion Engine V1
 * Context-aware fashion selection that never repeats
 * Scandinavian/influencer-core/neutral aesthetic
 */

export interface FashionBlock {
  category: string
  wardrobeKeywords: string[] // 3-6 keywords only
  materials: string[]
  palette: string
  scenarioTypes: string[] // Which scenarios this works with
}

const FASHION_LIBRARY: FashionBlock[] = [
  {
    category: "scandinavian-minimal",
    wardrobeKeywords: ["oversized blazer", "tailored trousers", "minimal gold jewelry"],
    materials: ["wool", "cotton"],
    palette: "neutral tones",
    scenarioTypes: ["paris", "cafe", "luxury"],
  },
  {
    category: "clean-girl-casual",
    wardrobeKeywords: ["ribbed tank", "straight-leg jeans", "leather crossbody bag"],
    materials: ["cotton", "leather"],
    palette: "cream and beige",
    scenarioTypes: ["cafe", "street", "casual"],
  },
  {
    category: "elevated-basics",
    wardrobeKeywords: ["relaxed tee", "high-waist trousers", "structured blazer"],
    materials: ["linen", "cotton"],
    palette: "neutral palette",
    scenarioTypes: ["rooftop", "urban", "hotel"],
  },
  {
    category: "quiet-luxury",
    wardrobeKeywords: ["cashmere sweater", "wool coat", "gold minimal jewelry"],
    materials: ["cashmere", "wool"],
    palette: "camel and cream",
    scenarioTypes: ["paris", "luxury", "hotel"],
  },
  {
    category: "streetwear-refined",
    wardrobeKeywords: ["oversized hoodie", "tailored joggers", "minimal sneakers"],
    materials: ["cotton", "technical fabric"],
    palette: "monochrome",
    scenarioTypes: ["urban", "street", "rooftop"],
  },
  {
    category: "parisian-chic",
    wardrobeKeywords: ["black turtleneck", "straight-leg denim", "leather loafers"],
    materials: ["merino wool", "denim", "leather"],
    palette: "black and neutral",
    scenarioTypes: ["paris", "cafe", "street"],
  },
  {
    category: "modern-minimalist",
    wardrobeKeywords: ["white button-down", "tailored pants", "gold hoop earrings"],
    materials: ["cotton", "linen"],
    palette: "white and beige",
    scenarioTypes: ["luxury", "hotel", "rooftop"],
  },
  {
    category: "effortless-edge",
    wardrobeKeywords: ["leather jacket", "ribbed dress", "ankle boots"],
    materials: ["leather", "knit"],
    palette: "earth tones",
    scenarioTypes: ["urban", "street", "rooftop"],
  },
  {
    category: "neutral-layers",
    wardrobeKeywords: ["long coat", "simple tee", "wide-leg trousers"],
    materials: ["wool", "cotton"],
    palette: "neutral layers",
    scenarioTypes: ["paris", "street", "urban"],
  },
  {
    category: "soft-neutral",
    wardrobeKeywords: ["oversized sweater", "straight-leg jeans", "minimal accessories"],
    materials: ["cashmere", "denim"],
    palette: "cream and taupe",
    scenarioTypes: ["cafe", "casual", "indoor"],
  },
  {
    category: "elevated-lounge",
    wardrobeKeywords: ["knit set", "relaxed cardigan", "minimal sandals"],
    materials: ["knit", "cotton"],
    palette: "oatmeal and beige",
    scenarioTypes: ["bedroom", "hotel", "indoor"],
  },
  {
    category: "city-sophisticated",
    wardrobeKeywords: ["structured blazer", "slim-fit trousers", "pointed-toe flats"],
    materials: ["wool", "cotton"],
    palette: "charcoal and cream",
    scenarioTypes: ["elevator", "lobby", "luxury"],
  },
]

// Track usage to avoid repetition
const usageHistory: string[] = []

export function selectFashionV1(scenarioName: string, keywords: string[], userPalette?: string[]): FashionBlock {
  // Filter out recently used categories
  const availableOptions = FASHION_LIBRARY.filter((fashion) => !usageHistory.includes(fashion.category))

  // If all have been used, reset history
  const options = availableOptions.length > 0 ? availableOptions : FASHION_LIBRARY

  // Score each fashion block
  const scores = options.map((fashion) => {
    let score = 0

    // Match scenario types (+5 points)
    if (fashion.scenarioTypes.some((type) => scenarioName.toLowerCase().includes(type))) {
      score += 5
    }

    // Match keywords (+2 points)
    keywords.forEach((keyword) => {
      if (
        fashion.wardrobeKeywords.some((w) => keyword.toLowerCase().includes(w) || w.includes(keyword.toLowerCase()))
      ) {
        score += 2
      }
      if (fashion.scenarioTypes.some((s) => keyword.toLowerCase().includes(s) || s.includes(keyword.toLowerCase()))) {
        score += 2
      }
    })

    // Bonus for user palette match (+3 points)
    if (userPalette && userPalette.length > 0) {
      const paletteMatch = userPalette.some((color) => fashion.palette.toLowerCase().includes(color.toLowerCase()))
      if (paletteMatch) score += 3
    }

    return { fashion, score }
  })

  // Sort by score
  scores.sort((a, b) => b.score - a.score)

  // Select top match
  const selected = scores[0].fashion

  // Add to usage history (keep last 8)
  usageHistory.push(selected.category)
  if (usageHistory.length > 8) {
    usageHistory.shift()
  }

  return selected
}

export function getFashionBlock(category: string): FashionBlock | null {
  return FASHION_LIBRARY.find((f) => f.category === category) || null
}

export function getAllFashion(): FashionBlock[] {
  return FASHION_LIBRARY
}

export function clearFashionHistory(): void {
  usageHistory.length = 0
}
