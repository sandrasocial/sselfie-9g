/**
 * Scene Selector
 * 
 * Selects the correct Scene Kit based on category + mood + fashionStyle.
 * Ensures scenes belong together - no mixing across kits.
 */

import { getSceneKit, type KitId, type SceneKit } from './scene-kits'

export interface SceneSelectorParams {
  category: string | null
  mood: string | null
  fashionStyle: string | null
}

/**
 * Select scene kit based on category, mood, and fashion style
 * 
 * Rules:
 * - athletic + minimal → athletic_minimal
 * - athletic + luxury → athletic_luxury
 * - athletic + warm → athletic_warm
 * - wellness + minimal → wellness_minimal
 * - wellness + warm → wellness_warm
 * - casual + minimal → casual_minimal
 * - casual + warm → casual_warm
 * - luxury + classic → luxury_classic
 * - business + classic → business_classic
 * - minimal + classic → minimal_classic
 * 
 * @param params - Category, mood, and fashion style
 * @returns Selected kit ID
 */
export function selectSceneKit(params: SceneSelectorParams): KitId {
  const { category, mood, fashionStyle } = params
  
  // Normalize inputs
  const cat = category?.toLowerCase() || null
  const m = mood?.toLowerCase() || null
  const style = fashionStyle?.toLowerCase() || null
  
  // ========================================================================
  // ATHLETIC KITS
  // ========================================================================
  
  if (style === 'athletic' || style === 'elevated_athleisure') {
    if (cat === 'luxury' || m === 'luxury') {
      return 'athletic_luxury'
    }
    if (cat === 'warm' || m === 'warm') {
      return 'athletic_warm'
    }
    // Default: minimal
    return 'athletic_minimal'
  }
  
  // ========================================================================
  // WELLNESS KITS
  // ========================================================================
  
  if (style === 'wellness' || style === 'active') {
    if (cat === 'warm' || m === 'warm') {
      return 'wellness_warm'
    }
    // Default: minimal
    return 'wellness_minimal'
  }
  
  // ========================================================================
  // CASUAL KITS
  // ========================================================================
  
  if (style === 'casual' || style === 'elevated_casual') {
    if (cat === 'warm' || m === 'warm') {
      return 'casual_warm'
    }
    // Default: minimal
    return 'casual_minimal'
  }
  
  // ========================================================================
  // BUSINESS KITS
  // ========================================================================
  
  if (style === 'business' || style === 'professional' || style === 'smart_casual') {
    return 'business_classic'
  }
  
  // ========================================================================
  // LUXURY KITS
  // ========================================================================
  
  if (cat === 'luxury' || m === 'luxury') {
    if (style === 'classic' || !style) {
      return 'luxury_classic'
    }
    // If luxury but athletic style → athletic_luxury (handled above)
    return 'luxury_classic'
  }
  
  // ========================================================================
  // MINIMAL CLASSIC KIT
  // ========================================================================
  
  if (cat === 'minimal' || m === 'minimal') {
    if (style === 'classic' || !style) {
      return 'minimal_classic'
    }
    // If minimal but athletic style → athletic_minimal (handled above)
    // If minimal but casual style → casual_minimal (handled above)
    return 'minimal_classic'
  }
  
  // ========================================================================
  // DEFAULT FALLBACK
  // ========================================================================
  
  // If no match, default to casual_minimal (safest option)
  console.warn(`[SCENE-SELECTOR] No kit match found for category=${cat}, mood=${m}, style=${style}. Defaulting to casual_minimal`)
  return 'casual_minimal'
}

/**
 * Build 9 scenes from selected kit
 * 
 * @param kitId - Selected kit ID
 * @param rotationSeed - Optional seed for scene rotation (future use)
 * @returns Array of 9 scene objects
 */
export function buildNineScenesFromKit(
  kitId: KitId,
  rotationSeed?: number
): SceneKit['scenes'] {
  const kit = getSceneKit(kitId)
  
  // For now, return all 9 scenes in order
  // Future: Add rotation logic based on rotationSeed
  return kit.scenes
}

/**
 * Get scene kit with validation
 * 
 * @param params - Category, mood, and fashion style
 * @returns Scene kit object
 */
export function getSceneKitForParams(params: SceneSelectorParams): SceneKit {
  const kitId = selectSceneKit(params)
  return getSceneKit(kitId)
}
