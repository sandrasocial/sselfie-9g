// High-end brand category + brand detection for Studio Pro / Nano Banana flows
// This stays data-driven and extensible as new brands are added.

import {
  type BrandProfile,
  type BrandCategory,
  type BrandCategoryKey,
  BRAND_CATEGORIES,
  BRAND_PROFILES,
} from "./brand-registry"

export interface CategoryDetectionResult {
  category: BrandCategory
  suggestedBrands: BrandProfile[]
  confidence: number // 0–1
  keywords: string[] // matched keywords / phrases
}

// Lightweight helpers derived from the registry so adding new brands is easy
const ALL_BRAND_PROFILES: BrandProfile[] = Object.values(BRAND_PROFILES)

// Explicit brand mention patterns (lowercase)
const BRAND_KEYWORDS: Record<string, BrandProfile> = (() => {
  const map: Record<string, BrandProfile> = {}

  for (const brand of ALL_BRAND_PROFILES) {
    const lowerName = brand.name.toLowerCase()
    const lowerSlug = brand.slug.toLowerCase()

    // Base entries
    map[lowerName] = brand
    map[lowerSlug] = brand

    // Hand-tuned aliases per known brand
    if (brand.id === "ALO") {
      map["alo"] = brand
      map["alo yoga"] = brand
    }

    if (brand.id === "LULULEMON") {
      map["lululemon"] = brand
      map["lulu lemon"] = brand
    }

    if (brand.id === "GLOSSIER") {
      map["glossier"] = brand
    }

    if (brand.id === "CHANEL") {
      map["chanel"] = brand
    }
  }

  return map
})()

// Category-level intent keywords
const CATEGORY_KEYWORDS: Record<BrandCategoryKey, string[]> = {
  wellness: ["yoga", "wellness", "fitness", "workout", "athletic", "mind-body", "ritual"],
  luxury: ["luxury", "high-end", "high end", "premium", "sophisticated", "haute", "couture"],
  lifestyle: ["lifestyle", "clean girl", "minimal", "everyday", "relatable", "daily life"],
  fashion: ["fashion", "editorial", "runway", "designer", "outfit", "high fashion", "lookbook"],
  beauty: ["beauty", "skincare", "skin care", "makeup", "glow", "natural beauty", "dewy"],
  fitness: ["athlete", "training", "gym", "running", "pilates", "studio class"],
  tech: ["tech", "device", "app ui", "saas", "product shot", "startup"],
  travel_lifestyle: [
    "airport",
    "terminal",
    "boarding gate",
    "boarding",
    "airplane",
    "runway view",
    "lounge",
    "duty free",
    "carry-on",
    "suitcase",
    "travel day",
    "pre-boarding",
  ],
}

// Brand-level aesthetic signals that hint at a specific brand within a category
const BRAND_AESTHETIC_KEYWORDS: Record<string, string[]> = {
  ALO: [
    "alo yoga",
    "yoga studio",
    "wellness content",
    "soft neutral activewear",
    "minimal yoga",
  ],
  LULULEMON: [
    "lululemon",
    "performance wear",
    "technical leggings",
    "urban workout",
    "running club",
  ],
  GLOSSIER: [
    "clean girl",
    "dewy skin",
    "skin first",
    "pink bathroom",
    "millennial pink",
  ],
  CHANEL: [
    "tweed",
    "parisian",
    "haute couture",
    "runway show",
    "classic luxury",
  ],
}

function pickPrimaryCategory(categoryScores: Record<BrandCategoryKey, number>): BrandCategoryKey {
  let bestKey: BrandCategoryKey = "lifestyle"
  // Initialize to -1 to ensure any score >= 0 will be selected
  let bestScore: number = -1

  const categoryKeys = Object.keys(BRAND_CATEGORIES) as BrandCategoryKey[]
  for (const key of categoryKeys) {
    const score = categoryScores[key] ?? 0
    if (score > bestScore) {
      bestScore = score
      bestKey = key
    }
  }

  return bestKey
}

export function detectCategoryAndBrand(
  userIntent: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userImages?: any[],
): CategoryDetectionResult {
  const text = (userIntent || "").toLowerCase()

  const matchedKeywords: Set<string> = new Set()
  const brandScores: Map<string, number> = new Map() // BrandProfile.id → score
  const categoryScores: Record<BrandCategoryKey, number> = {
    wellness: 0,
    luxury: 0,
    lifestyle: 0,
    fashion: 0,
    beauty: 0,
    fitness: 0,
    tech: 0,
    travel_lifestyle: 0,
  }

  // 1. Explicit brand mentions (very strong signal)
  for (const [keyword, brand] of Object.entries(BRAND_KEYWORDS)) {
    if (keyword && text.includes(keyword)) {
      matchedKeywords.add(keyword)

      const prev = brandScores.get(brand.id) ?? 0
      // Explicit brand → push towards 0.95
      const next = Math.max(prev, 0.95)
      brandScores.set(brand.id, next)

      // Nudge its categories as well
      for (const cat of brand.categories) {
        categoryScores[cat] = (categoryScores[cat] ?? 0) + 0.4
      }
    }
  }

  // 2. Category keywords (medium signal)
  ;(Object.keys(CATEGORY_KEYWORDS) as BrandCategoryKey[]).forEach((catKey) => {
    const words = CATEGORY_KEYWORDS[catKey]
    for (const word of words) {
      if (text.includes(word)) {
        matchedKeywords.add(word)
        categoryScores[catKey] = (categoryScores[catKey] ?? 0) + 0.3
      }
    }
  })

  // 3. Brand aesthetic / vibe keywords (help disambiguate inside a category)
  for (const [brandId, signals] of Object.entries(BRAND_AESTHETIC_KEYWORDS)) {
    for (const signal of signals) {
      if (text.includes(signal)) {
        matchedKeywords.add(signal)
        const prev = brandScores.get(brandId) ?? 0
        // Brand aesthetic match pushes you towards 0.8 if not already higher
        const next = Math.max(prev, 0.8)
        brandScores.set(brandId, next)
      }
    }
  }

  // 4. (Optional) future: inspect userImages for logos / typography / settings
  // For now we keep this purely text-driven but keep the parameter for extension.

  // Pick primary category based on accumulated scores
  const primaryCategoryKey = pickPrimaryCategory(categoryScores)
  const primaryCategory = BRAND_CATEGORIES[primaryCategoryKey]

  // Score brands within the primary category first, then fall back to others
  const scoredBrands: { brand: BrandProfile; score: number }[] = []

  for (const brand of ALL_BRAND_PROFILES) {
    const baseScore = brandScores.get(brand.id) ?? 0

    // Light bonus if brand is inside the primary category
    const inPrimaryCategory = brand.categories.includes(primaryCategoryKey)
    const categoryBonus = inPrimaryCategory ? 0.05 : 0

    const total = Math.min(1, baseScore + categoryBonus)
    if (total > 0) {
      scoredBrands.push({ brand, score: total })
    }
  }

  scoredBrands.sort((a, b) => b.score - a.score)

  // Select top 1–3 brands, preferring those in the primary category
  const suggestedBrands: BrandProfile[] = []
  for (const { brand } of scoredBrands) {
    if (suggestedBrands.length >= 3) break
    suggestedBrands.push(brand)
  }

  // Confidence rules
  let confidence = 0.3 // Generic baseline
  const topBrandScore = scoredBrands[0]?.score ?? 0
  const anyCategoryHit = Object.values(categoryScores).some((v) => v > 0)

  if (topBrandScore >= 0.9) {
    // Exact / near-exact brand match
    confidence = 0.95
  } else if (topBrandScore >= 0.7 && anyCategoryHit) {
    // Category + brand aesthetic signals
    confidence = 0.8
  } else if (anyCategoryHit) {
    // Category-only match
    confidence = 0.6
  }

  return {
    category: primaryCategory,
    suggestedBrands,
    confidence,
    keywords: Array.from(matchedKeywords),
  }
}
