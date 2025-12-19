// High-end brand prompt system index
// Central export + utility helpers for all high-end brand templates.

import type { PromptTemplate } from "../types"
import type { BrandCategory } from "./brand-registry"

import { WELLNESS_BRANDS } from "./wellness-brands"
import { LUXURY_BRANDS } from "./luxury-brands"
import { LIFESTYLE_BRANDS } from "./lifestyle-brands"
import { FASHION_BRANDS } from "./fashion-brands"
import { TECH_BRANDS } from "./tech-brands"
import { SELFIES } from "./selfies"
import { BEAUTY_BRANDS } from "./beauty-brands"

// Re-export brand template modules
export * from "./wellness-brands"
export * from "./luxury-brands"
export * from "./lifestyle-brands"
export * from "./fashion-brands"
export * from "./tech-brands"
export * from "./selfies"
export * from "./beauty-brands"

// Re-export core registry + detection utilities
export * from "./brand-registry"
export * from "./category-mapper"

// Also expose non-brand lifestyle/seasonal systems
export * from "./travel-lifestyle"
export * from "./seasonal-christmas"

// ---------- Aggregated brand templates ----------

export const ALL_BRAND_TEMPLATES: Record<string, PromptTemplate> = {
  ...WELLNESS_BRANDS,
  ...LUXURY_BRANDS,
  ...LIFESTYLE_BRANDS,
  ...FASHION_BRANDS,
  ...TECH_BRANDS,
  ...SELFIES,
  ...BEAUTY_BRANDS,
}

// ---------- Convenience helpers ----------

/**
 * Look up a high-end brand template by its id.
 * Returns null if not found.
 */
export function getBrandTemplate(brandId: string): PromptTemplate | null {
  return ALL_BRAND_TEMPLATES[brandId] ?? null
}

/**
 * Get all templates whose associated brand profile belongs to the given category.
 * Only templates that include a `brandProfile` field will be returned.
 */
export function getAllTemplatesForCategory(category: BrandCategory): PromptTemplate[] {
  const results: PromptTemplate[] = []

  Object.values(ALL_BRAND_TEMPLATES).forEach((template) => {
    const withBrand = template as PromptTemplate & {
      // High-end brand templates optionally include brandProfile from brand-registry
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      brandProfile?: { categories?: any[] }
    }

    if (withBrand.brandProfile && Array.isArray(withBrand.brandProfile.categories)) {
      if (withBrand.brandProfile.categories.includes(category.key)) {
        results.push(template)
      }
    }
  })

  return results
}
