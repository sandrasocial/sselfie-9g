/**
 * PROMPT CONSTRUCTOR INTEGRATION
 * 
 * Integrates brand-library and prompt-constructor into the concept generation flow.
 * Provides category detection, validation, and prompt building utilities.
 */

import { generateCompleteOutfit } from './brand-library-2025'
import { buildPrompt, type PromptParams } from './prompt-constructor'

// ============================================================================
// CATEGORY DETECTION
// ============================================================================

export interface DetectedCategory {
  category: string
  vibe: string
  location: string
}

/**
 * Detect category from user input
 */
export function detectCategory(userInput: string): DetectedCategory {
  const inputLower = userInput.toLowerCase()
  
  // Athletic/Workout
  if (/(?:workout|gym|fitness|exercise|athletic|training|yoga|pilates)/i.test(inputLower)) {
    return {
      category: 'workout',
      vibe: 'athletic',
      location: 'gym',
    }
  }
  
  // Casual/Coffee
  if (/(?:coffee|casual|errands|weekend|relaxed|everyday)/i.test(inputLower)) {
    return {
      category: 'casual',
      vibe: 'relaxed',
      location: 'coffee-shop',
    }
  }
  
  // Street Style
  if (/(?:street\s*style|streetstyle|fashion|urban|edgy|downtown)/i.test(inputLower)) {
    return {
      category: 'street-style',
      vibe: 'fashion-forward',
      location: 'street',
    }
  }
  
  // Travel/Airport
  if (/(?:airport|travel|traveling|trip|flying|departure)/i.test(inputLower)) {
    return {
      category: 'travel',
      vibe: 'travel-ready',
      location: 'airport',
    }
  }
  
  // Cozy/Home
  if (/(?:cozy|home|comfortable|lounging|lounge|comfort|lazy|chill)/i.test(inputLower)) {
    return {
      category: 'cozy',
      vibe: 'comfortable',
      location: 'home',
    }
  }
  
  // Luxury/Elegant
  if (/(?:luxury|luxurious|chic|elegant|sophisticated|high-end|upscale|refined)/i.test(inputLower)) {
    return {
      category: 'luxury',
      vibe: 'elegant',
      location: 'restaurant',
    }
  }
  
  // Seasonal/Christmas
  if (/(?:christmas|holiday|holidays|xmas|winter|seasonal|festive)/i.test(inputLower)) {
    return {
      category: 'cozy', // Use cozy as base for seasonal
      vibe: 'festive',
      location: 'home',
    }
  }
  
  // Default to casual
  return {
    category: 'casual',
    vibe: 'relaxed',
    location: 'coffee-shop',
  }
}

/**
 * Detect location from user input
 */
export function detectLocation(userInput: string): string {
  const inputLower = userInput.toLowerCase()
  
  const locationMap: Record<string, string> = {
    'gym': 'gym',
    'coffee': 'coffee-shop',
    'cafe': 'coffee-shop',
    'airport': 'airport',
    'home': 'home',
    'street': 'street',
    'soho': 'street',
    'restaurant': 'restaurant',
    'hotel': 'hotel',
    'beach': 'beach',
    'park': 'park',
  }
  
  for (const [key, location] of Object.entries(locationMap)) {
    if (inputLower.includes(key)) {
      return location
    }
  }
  
  return 'coffee-shop' // Default
}

/**
 * Extract age descriptor from user input or return default
 */
export function extractAge(userInput?: string): string {
  if (!userInput) return 'woman in late twenties'
  
  const inputLower = userInput.toLowerCase()
  
  if (/(?:mid.*twenties|mid.*20s)/i.test(inputLower)) {
    return 'woman in mid-twenties'
  }
  if (/(?:late.*twenties|late.*20s)/i.test(inputLower)) {
    return 'woman in late twenties'
  }
  if (/(?:early.*thirties|early.*30s)/i.test(inputLower)) {
    return 'woman in early thirties'
  }
  
  return 'woman in late twenties' // Default
}

// ============================================================================
// PROMPT GENERATION
// ============================================================================

/**
 * Generate a prompt using brand library and prompt constructor
 */
export function generateBrandedPrompt(
  userInput: string,
  options?: {
    userAge?: string
    userFeatures?: string
    hairStyle?: string
    triggerWord?: string
    userGender?: string
  }
): string {
  // Detect category
  const detected = detectCategory(userInput)
  const location = detectLocation(userInput) || detected.location
  
  // Build prompt params
  const params: PromptParams = {
    category: detected.category,
    vibe: detected.vibe,
    location: location,
    userAge: options?.userAge || extractAge(userInput),
    userFeatures: options?.userFeatures,
    hairStyle: options?.hairStyle,
    triggerWord: options?.triggerWord,
    userGender: options?.userGender || 'woman',
  }
  
  // Generate prompt
  const prompt = buildPrompt(params)
  
  return prompt
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface PromptValidation {
  isValid: boolean
  wordCount: number
  hasCamera: boolean
  hasLighting: boolean
  hasBrands: boolean
  hasResolution: boolean
  warnings: string[]
}

/**
 * Validate prompt against requirements
 */
export function validatePrompt(prompt: string): PromptValidation {
  const words = prompt.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  
  const checks = {
    wordCount: wordCount >= 250 && wordCount <= 500,
    hasCamera: /(\d+mm|Camera|Canon|Fujifilm|Hasselblad|Sony|iPhone|lens)/i.test(prompt),
    hasLighting: /light/i.test(prompt) || /lighting/i.test(prompt),
    hasBrands: /(Alo Yoga|Lululemon|Adidas|Levi's|Nike|New Balance|Bottega|Cartier|UGG)/i.test(prompt),
    hasResolution: /(4K|8K|hyper-realistic|Hyper-realistic)/i.test(prompt),
  }
  
  const warnings: string[] = []
  
  if (!checks.wordCount) {
    warnings.push(`Word count ${wordCount} is outside target range (250-500 words)`)
  }
  if (!checks.hasCamera) {
    warnings.push('Missing camera specs (lens, camera model)')
  }
  if (!checks.hasLighting) {
    warnings.push('Missing lighting description')
  }
  if (!checks.hasBrands && wordCount > 100) {
    // Only warn about brands if prompt is substantial (might be intentional for some prompts)
    warnings.push('No branded items detected (may be intentional for generic prompts)')
  }
  if (!checks.hasResolution) {
    warnings.push('Missing "4K resolution" or "Hyper-realistic"')
  }
  
  return {
    isValid: checks.wordCount && checks.hasCamera && checks.hasLighting && checks.hasResolution,
    wordCount,
    hasCamera: checks.hasCamera,
    hasLighting: checks.hasLighting,
    hasBrands: checks.hasBrands,
    hasResolution: checks.hasResolution,
    warnings,
  }
}

// ============================================================================
// TEST CASES
// ============================================================================

export interface TestCase {
  input: string
  expected: {
    brands?: string[]
    wordCount?: [number, number]
    hasCamera?: boolean
    hasLighting?: boolean
    unbrandedItems?: string[]
    maxLuxuryItems?: number
  }
}

/**
 * Run test cases for prompt generation
 */
export function testPromptGeneration(testCase: TestCase): {
  success: boolean
  prompt: string
  validation: PromptValidation
  errors: string[]
} {
  const prompt = generateBrandedPrompt(testCase.input)
  const validation = validatePrompt(prompt)
  const errors: string[] = []
  
  // Check expected brands
  if (testCase.expected.brands) {
    for (const brand of testCase.expected.brands) {
      if (!prompt.includes(brand)) {
        errors.push(`Expected brand "${brand}" not found in prompt`)
      }
    }
  }
  
  // Check word count
  if (testCase.expected.wordCount) {
    const [min, max] = testCase.expected.wordCount
    if (validation.wordCount < min || validation.wordCount > max) {
      errors.push(`Word count ${validation.wordCount} outside expected range [${min}, ${max}]`)
    }
  }
  
  // Check camera
  if (testCase.expected.hasCamera !== undefined) {
    if (validation.hasCamera !== testCase.expected.hasCamera) {
      errors.push(`Expected hasCamera=${testCase.expected.hasCamera}, got ${validation.hasCamera}`)
    }
  }
  
  // Check lighting
  if (testCase.expected.hasLighting !== undefined) {
    if (validation.hasLighting !== testCase.expected.hasLighting) {
      errors.push(`Expected hasLighting=${testCase.expected.hasLighting}, got ${validation.hasLighting}`)
    }
  }
  
  // Check unbranded items
  if (testCase.expected.unbrandedItems) {
    for (const item of testCase.expected.unbrandedItems) {
      if (!prompt.toLowerCase().includes(item.toLowerCase())) {
        errors.push(`Expected unbranded item "${item}" not found in prompt`)
      }
    }
  }
  
  return {
    success: errors.length === 0,
    prompt,
    validation,
    errors,
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { generateBrandedPrompt, validatePrompt, detectCategory, detectLocation, extractAge }


















