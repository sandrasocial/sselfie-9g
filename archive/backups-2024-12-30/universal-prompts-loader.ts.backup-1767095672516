/**
 * Universal Prompts Loader for Admin Prompt Builder
 * 
 * Loads templates from the Universal Prompts library to provide
 * high-quality examples to the concept generation API.
 */

import { getAllTemplatesForCategory, getBrandTemplate } from '@/lib/maya/prompt-templates/high-end-brands'
import { BRAND_CATEGORIES } from '@/lib/maya/prompt-templates/high-end-brands/brand-registry'
import type { PromptTemplate, PromptContext } from '@/lib/maya/prompt-templates/types'

/**
 * Load Universal Prompt templates for a specific category
 * 
 * Returns formatted prompt examples that can be passed to generate-concepts API
 */
export async function loadUniversalPromptsForAdmin(
  category: string
): Promise<string[]> {
  try {
    console.log('[Admin Prompts] Loading templates for category:', category)
    
    // Map admin categories to BRAND_CATEGORIES
    const categoryMapping: Record<string, typeof BRAND_CATEGORIES[keyof typeof BRAND_CATEGORIES]> = {
      'Chanel Luxury': BRAND_CATEGORIES.luxury,
      'ALO Workout': BRAND_CATEGORIES.wellness,
      'Travel': BRAND_CATEGORIES.travel_lifestyle,
      'Wellness': BRAND_CATEGORIES.wellness,
      'Luxury': BRAND_CATEGORIES.luxury,
      'Lifestyle': BRAND_CATEGORIES.lifestyle,
      'Fashion': BRAND_CATEGORIES.fashion,
      'Beauty': BRAND_CATEGORIES.beauty,
      'Fitness': BRAND_CATEGORIES.fitness,
      'Tech': BRAND_CATEGORIES.tech,
      'Travel Lifestyle': BRAND_CATEGORIES.travel_lifestyle,
      'Seasonal Christmas': BRAND_CATEGORIES.lifestyle, // Christmas uses lifestyle category
    }
    
    const templates: string[] = []
    const targetCategory = categoryMapping[category]
    
    if (!targetCategory) {
      console.log('[Admin Prompts] No mapping found for category:', category, '- using lifestyle as default')
      // Default to lifestyle if no mapping found
      const defaultCategory = BRAND_CATEGORIES.lifestyle
      
      try {
        const categoryTemplates = getAllTemplatesForCategory(defaultCategory)
        const selectedTemplates = categoryTemplates.slice(0, 10)
        
        for (const template of selectedTemplates) {
          try {
            const exampleContext: PromptContext = {
              userImages: [],
              contentType: "concept",
              userIntent: category,
            }
            
            const promptExample = template.promptStructure(exampleContext)
            templates.push(promptExample)
          } catch (templateError) {
            console.error('[Admin Prompts] Error generating from template:', template.id, templateError)
          }
        }
      } catch (categoryError) {
        console.error('[Admin Prompts] Error loading default category templates:', categoryError)
      }
      
      return templates
    }
    
    // Load templates for the mapped category
    try {
      const categoryTemplates = getAllTemplatesForCategory(targetCategory)
      
      // Get up to 10 templates
      const selectedTemplates = categoryTemplates.slice(0, 10)
      
      for (const template of selectedTemplates) {
        try {
          // Generate example prompt from template
          const exampleContext: PromptContext = {
            userImages: [], // Empty for now - templates don't need user images
            contentType: "concept" as const,
            userIntent: category,
          }
          
          const promptExample = template.promptStructure(exampleContext)
          templates.push(promptExample)
        } catch (templateError) {
          console.error('[Admin Prompts] Error generating from template:', template.id, templateError)
        }
      }
      
      // Also try to get specific brand templates for certain categories
      if (category === 'Chanel Luxury') {
        try {
          const chanelTemplate = getBrandTemplate('CHANEL')
          if (chanelTemplate) {
            const exampleContext: PromptContext = {
              userImages: [],
              contentType: "concept",
              userIntent: category,
            }
            const promptExample = chanelTemplate.promptStructure(exampleContext)
            templates.unshift(promptExample) // Add at beginning for priority
          }
        } catch (brandError) {
          console.error('[Admin Prompts] Error loading Chanel template:', brandError)
        }
      } else if (category === 'ALO Workout') {
        try {
          const aloTemplate = getBrandTemplate('ALO')
          if (aloTemplate) {
            const exampleContext: PromptContext = {
              userImages: [],
              contentType: "concept",
              userIntent: category,
            }
            const promptExample = aloTemplate.promptStructure(exampleContext)
            templates.unshift(promptExample) // Add at beginning for priority
          }
        } catch (brandError) {
          console.error('[Admin Prompts] Error loading ALO template:', brandError)
        }
      }
    } catch (categoryError) {
      console.error('[Admin Prompts] Error loading category templates:', category, categoryError)
    }
    
    console.log('[Admin Prompts] Loaded', templates.length, 'template examples for category:', category)
    
    return templates
  } catch (error) {
    console.error('[Admin Prompts] Error loading templates:', error)
    // Return empty array on error - concept generation will still work without templates
    return []
  }
}

/**
 * Get all available categories that have templates
 */
export function getAvailableCategories(): string[] {
  return [
    'Chanel Luxury',
    'ALO Workout',
    'Travel',
    'Wellness',
    'Luxury',
    'Lifestyle',
    'Fashion',
    'Beauty',
    'Fitness',
    'Tech',
    'Travel Lifestyle',
    'Seasonal Christmas',
  ]
}

/**
 * Get template count for a category (for UI display)
 */
export async function getTemplateCountForCategory(category: string): Promise<number> {
  const templates = await loadUniversalPromptsForAdmin(category)
  return templates.length
}









