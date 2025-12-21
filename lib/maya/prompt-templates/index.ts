/**
 * Prompt Template Library - Main Export
 * Centralized access to all prompt templates
 */

export * from './types'
export * from './helpers'
export * from './carousel-prompts'
export * from './ugc-prompts'
export * from './product-mockup-prompts'
export * from './brand-partnership-prompts'
export * from './reel-cover-prompts'

import { CAROUSEL_TEMPLATES } from './carousel-prompts'
import { UGC_TEMPLATES } from './ugc-prompts'
import { PRODUCT_MOCKUP_TEMPLATES } from './product-mockup-prompts'
import { BRAND_PARTNERSHIP_TEMPLATES } from './brand-partnership-prompts'
import { REEL_COVER_TEMPLATES } from './reel-cover-prompts'
import type { PromptTemplate } from './types'

/**
 * All available prompt templates organized by category
 */
export const ALL_TEMPLATES: Record<string, Record<string, PromptTemplate>> = {
  carousel: CAROUSEL_TEMPLATES,
  ugc: UGC_TEMPLATES,
  product: PRODUCT_MOCKUP_TEMPLATES,
  brand: BRAND_PARTNERSHIP_TEMPLATES,
  reel: REEL_COVER_TEMPLATES,
}

/**
 * Get template by ID across all categories
 */
export function getTemplateById(templateId: string): PromptTemplate | null {
  for (const category of Object.values(ALL_TEMPLATES)) {
    for (const template of Object.values(category)) {
      if (template.id === templateId) {
        return template
      }
    }
  }
  return null
}

/**
 * Get templates by use case
 */
export function getTemplatesByUseCase(useCase: string): PromptTemplate[] {
  const matches: PromptTemplate[] = []
  for (const category of Object.values(ALL_TEMPLATES)) {
    for (const template of Object.values(category)) {
      if (template.useCases.some(uc => uc.toLowerCase().includes(useCase.toLowerCase()))) {
        matches.push(template)
      }
    }
  }
  return matches
}























