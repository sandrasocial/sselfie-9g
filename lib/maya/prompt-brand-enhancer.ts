/**
 * PROMPT BRAND ENHANCER
 * 
 * Enhances existing prompts with brand library details.
 * Analyzes prompt content and injects appropriate brand names based on category.
 */

import { generateCompleteOutfit, getBrandedPiece, getDetailedDescription } from './brand-library-2025'
import { detectCategory } from './prompt-constructor-integration'

/**
 * Enhance a prompt with brand library details
 * Detects category, generates appropriate branded outfit, and injects brand names
 */
export function enhancePromptWithBrands(
  prompt: string,
  userRequest?: string,
  category?: string
): string {
  // Detect category from prompt or user request
  const detectedCategory = category || detectCategory(userRequest || prompt).category
  
  // Generate outfit using brand library
  const outfit = generateCompleteOutfit(detectedCategory, userRequest || prompt)
  
  // Build branded outfit description
  const brandedOutfitParts: string[] = []
  
  if (outfit.top) {
    brandedOutfitParts.push(outfit.top)
  }
  if (outfit.bottom) {
    brandedOutfitParts.push(outfit.bottom)
  }
  if (outfit.outerwear) {
    brandedOutfitParts.push(outfit.outerwear)
  }
  if (outfit.shoes) {
    brandedOutfitParts.push(outfit.shoes)
  }
  if (outfit.bag) {
    brandedOutfitParts.push(outfit.bag)
  }
  if (outfit.accessory) {
    brandedOutfitParts.push(outfit.accessory)
  }
  if (outfit.jewelry) {
    brandedOutfitParts.push(outfit.jewelry)
  }
  
  const brandedOutfitDescription = brandedOutfitParts.join(', ')
  
  // Find outfit description in prompt and replace with branded version
  // Common patterns: "wearing [outfit]", "in [outfit]", "[outfit description]"
  let enhancedPrompt = prompt
  
  // Pattern 1: Replace generic outfit descriptions with branded ones
  // Look for patterns like "wearing", "in", "outfit:" and replace with branded version
  const outfitPatterns = [
    /(?:wearing|in|outfit:)\s*([^,\.\n]+(?:,\s*[^,\.\n]+)*)/i,
    /(?:wearing|in)\s+(.+?)(?:,\s|\.|$)/i,
  ]
  
  // If we can't find a pattern, inject branded outfit at appropriate location
  const hasBrands = /(?:Alo Yoga|Lululemon|Adidas|Levi's|Nike|New Balance|Bottega|Cartier|UGG)/i.test(prompt)
  
  if (!hasBrands && brandedOutfitDescription) {
    // Try to find where outfit is mentioned and enhance it
    // Look for "wearing", "in", or outfit-related keywords
    if (/wearing|in [a-z]|outfit/i.test(prompt)) {
      // Replace generic outfit with branded
      enhancedPrompt = prompt.replace(
        /(?:wearing|in)\s+([^,\.\n]+(?:,\s+[^,\.\n]+){0,3})/i,
        `wearing ${brandedOutfitDescription}`
      )
    } else {
      // Inject branded outfit description near the beginning (after character description)
      // Look for pattern like "woman" or "person" and add outfit after
      enhancedPrompt = prompt.replace(
        /(woman|person|man)(\s+[^,\.\n]{0,50})/i,
        `$1 wearing ${brandedOutfitDescription}$2`
      )
    }
  }
  
  return enhancedPrompt
}

/**
 * Enhance outfit descriptions in a prompt with specific brand pieces
 */
export function replaceOutfitWithBranded(
  prompt: string,
  category: string,
  itemType: 'top' | 'bottom' | 'shoes' | 'bag' | 'accessory',
  userRequest?: string
): string {
  const brandedPiece = getBrandedPiece(category, itemType, userRequest)
  
  if (!brandedPiece) {
    return prompt
  }
  
  // Common generic patterns to replace
  const genericPatterns: Record<string, RegExp[]> = {
    'top': [
      /\b(?:wearing|in)\s+(?:a\s+)?(?:cream|cable\s+knit|sweater|tank|top|shirt|blouse)\b/gi,
      /\b(?:cream|cable\s+knit|sweater|tank|top|shirt)\b/gi,
    ],
    'bottom': [
      /\b(?:wearing|in)\s+(?:a\s+)?(?:jeans|pants|leggings|trousers)\b/gi,
      /\b(?:jeans|pants|leggings|trousers)\b/gi,
    ],
    'shoes': [
      /\b(?:wearing|in)\s+(?:a\s+)?(?:sneakers|shoes|boots|heels)\b/gi,
      /\b(?:white\s+)?sneakers\b/gi,
    ],
    'bag': [
      /\b(?:carrying|with)\s+(?:a\s+)?(?:bag|tote|purse|handbag)\b/gi,
      /\b(?:bag|tote|purse|handbag)\b/gi,
    ],
  }
  
  const patterns = genericPatterns[itemType] || []
  
  for (const pattern of patterns) {
    if (pattern.test(prompt)) {
      return prompt.replace(pattern, brandedPiece)
    }
  }
  
  return prompt
}
























