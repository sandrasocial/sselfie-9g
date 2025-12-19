/**
 * Universal AI Image Prompts - Raw Data
 * 
 * This file contains the raw Universal Prompts data extracted from
 * Universal_AI_Image_Prompts.md
 * 
 * Structure: Organized by category with all 148 prompts
 * 
 * TODO: Populate this file with actual Universal Prompts from the markdown file
 * For now, this serves as a template structure
 */

export interface RawUniversalPrompt {
  id: string
  title: string
  fullPrompt: string
}

export const UNIVERSAL_PROMPTS_RAW: Record<string, RawUniversalPrompt[]> = {
  'alo-workout': [
    // TODO: Add all 10 ALO prompts from Universal_AI_Image_Prompts.md
    // Example structure:
    {
      id: 'alo-001',
      title: 'Movement Shot',
      fullPrompt: `Vertical 2:3 photo in UGC influencer style from Alo captured in movement. Woman maintaining exactly the characteristics of the person in the attachment (face, visual identity), without copying the photo.

She walks slowly through a modern and minimalist space, wearing a monochromatic Alo outfit and sneakers. Adjusts sunglasses during the walk.

Hair loose with volume and waves. Natural glam makeup.

Balanced natural lighting. Full body framing with slight sense of movement. Real, clean and aspirational aesthetic.`,
    },
    // ... add remaining 9 ALO prompts
  ],
  
  'chanel-luxury': [
    // TODO: Add all 9 Chanel prompts
  ],
  
  'travel-lifestyle': [
    // TODO: Add all 10 travel/airport prompts
  ],
  
  'seasonal-christmas': [
    // TODO: Add all 10 Christmas prompts
  ],
  
  'beauty': [
    // TODO: Add all 18 beauty prompts
  ],
  
  'venice-thailand-travel': [
    // TODO: Add all 18 Venice & Thailand prompts
  ],
  
  'fashion': [
    // TODO: Add all 11 fashion prompts
  ],
  
  'lifestyle-wellness': [
    // TODO: Add all 17 lifestyle/wellness prompts
  ],
  
  'luxury-lifestyle': [
    // TODO: Add all 9 luxury lifestyle prompts
  ],
  
  'tech': [
    // TODO: Add all 12 tech prompts
  ],
  
  'selfies': [
    // TODO: Add all 12 selfie prompts
  ],
  
  'generic-lifestyle': [
    // Fallback generic prompts
  ],
}

/**
 * Get all raw prompts for a category
 */
export function getRawPromptsForCategory(category: string): RawUniversalPrompt[] {
  return UNIVERSAL_PROMPTS_RAW[category] || []
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  return Object.keys(UNIVERSAL_PROMPTS_RAW)
}

/**
 * Get total prompt count
 */
export function getTotalPromptCount(): number {
  return Object.values(UNIVERSAL_PROMPTS_RAW).reduce((sum, prompts) => sum + prompts.length, 0)
}
