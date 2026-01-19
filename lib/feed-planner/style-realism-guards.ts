/**
 * Style Realism Guards
 * 
 * Prevents stupid combinations automatically.
 * Guards ensure scenes are realistic and coherent.
 */

import type { SceneKitScene, OutfitMode } from './scene-kits'

export type GuardAction = 'allow' | 'replace' | 'adapt'

export interface GuardResult {
  action: GuardAction
  reason: string
  replacementSuggestion?: string
  sceneSwap?: string // Alternative scene ID
  outfitModeSwap?: OutfitMode // Alternative outfit mode
}

/**
 * Guard #1: Activewear scenes cannot include luxury materials
 * 
 * Rule: Activewear scenes cannot include cashmere, cardigan, blazer, trench, silk blouse
 * UNLESS kitId == athletic_luxury AND outfitMode == elevated_athleisure
 */
export function guardActivewearMaterials(
  scene: SceneKitScene,
  kitId: string,
  outfitDescription: string
): GuardResult | null {
  const bannedMaterials = ['cashmere', 'cardigan', 'blazer', 'trench', 'silk blouse']
  const hasBannedMaterial = bannedMaterials.some(material => 
    outfitDescription.toLowerCase().includes(material.toLowerCase())
  )
  
  if (!hasBannedMaterial) {
    return null // No guard needed
  }
  
  // Check if this is allowed (athletic_luxury + elevated_athleisure)
  const isAllowed = kitId === 'athletic_luxury' && scene.outfitMode === 'elevated_athleisure'
  
  if (isAllowed) {
    return null // Allowed exception
  }
  
  // Guard triggered
  return {
    action: 'replace',
    reason: `Activewear scene cannot include luxury materials (${bannedMaterials.join(', ')}) unless kit is athletic_luxury with elevated_athleisure`,
    replacementSuggestion: 'Replace with activewear materials: athletic set, sports bra, leggings, gym wear',
    outfitModeSwap: 'activewear'
  }
}

/**
 * Guard #2: Minimal kits cannot include gallery unless explicitly allowed
 * 
 * Rule: Minimal kits cannot include gallery unless:
 * - outfitMode == classic OR elevated_athleisure
 * - AND sceneType == environment (not movement)
 */
export function guardMinimalGallery(
  scene: SceneKitScene,
  kitId: string,
  location: string
): GuardResult | null {
  const isMinimalKit = kitId.includes('minimal')
  const isGallery = location.toLowerCase().includes('gallery')
  
  if (!isMinimalKit || !isGallery) {
    return null // No guard needed
  }
  
  // Check if this is allowed
  const isAllowed = (
    (scene.outfitMode === 'classic' || scene.outfitMode === 'elevated_athleisure') &&
    scene.sceneType === 'environment'
  )
  
  if (isAllowed) {
    return null // Allowed exception
  }
  
  // Guard triggered
  return {
    action: 'replace',
    reason: 'Minimal kits cannot include gallery unless outfitMode is classic/elevated_athleisure AND sceneType is environment',
    replacementSuggestion: 'Replace gallery with minimal space, architectural, or clean studio',
    sceneSwap: undefined // Would need to find alternative scene
  }
}

/**
 * Guard #3: Athletic/wellness locations must be from allow-list
 * 
 * Rule: Athletic/wellness locations must be from:
 * gym, studio, outdoor track, park, wellness space, pilates studio, modern spa gym, minimal home workout corner
 * NO: office, conference room, coworking, hotel lobby (unless kit includes business)
 */
export function guardAthleticLocations(
  scene: SceneKitScene,
  kitId: string,
  location: string
): GuardResult | null {
  const isAthleticKit = kitId.includes('athletic') || kitId.includes('wellness')
  
  if (!isAthleticKit) {
    return null // No guard needed
  }
  
  const allowedLocations = [
    'gym', 'studio', 'outdoor track', 'park', 'wellness space', 
    'pilates studio', 'modern spa gym', 'minimal home workout corner',
    'outdoor', 'fitness studio', 'wellness'
  ]
  
  const bannedLocations = ['office', 'conference room', 'coworking', 'hotel lobby', 'gallery']
  
  const locationLower = location.toLowerCase()
  const isBanned = bannedLocations.some(banned => locationLower.includes(banned))
  const isAllowed = allowedLocations.some(allowed => locationLower.includes(allowed))
  
  if (!isBanned && isAllowed) {
    return null // Location is fine
  }
  
  if (isBanned) {
    return {
      action: 'replace',
      reason: `Athletic/wellness scenes cannot use banned locations: ${bannedLocations.join(', ')}`,
      replacementSuggestion: `Replace with allowed location: ${allowedLocations[0]}`,
      sceneSwap: undefined
    }
  }
  
  // Location not in allow-list but not explicitly banned
  return {
    action: 'adapt',
    reason: `Location "${location}" not in athletic/wellness allow-list`,
    replacementSuggestion: `Consider using: ${allowedLocations[0]}`,
    sceneSwap: undefined
  }
}

/**
 * Guard #4: Detail scenes must be context-safe
 * 
 * Rule: Detail scenes must contain appropriate props:
 * - Athletic detail = bottle/juice/towel/bands/shoes/earbuds/phone/watch/gym bag
 * - NO laptop/coffee unless kit is casual/business
 */
export function guardDetailSceneContent(
  scene: SceneKitScene,
  kitId: string,
  detailDescription: string
): GuardResult | null {
  if (scene.sceneType !== 'detail') {
    return null // Not a detail scene
  }
  
  const descLower = detailDescription.toLowerCase()
  const isAthleticKit = kitId.includes('athletic') || kitId.includes('wellness')
  const isBusinessKit = kitId.includes('business') || kitId.includes('professional')
  const isCasualKit = kitId.includes('casual')
  
  // Check for office objects in athletic/wellness detail scenes
  if (isAthleticKit) {
    const officeObjects = ['laptop', 'coffee', 'desk', 'workspace', 'notebook']
    const hasOfficeObject = officeObjects.some(obj => descLower.includes(obj))
    
    if (hasOfficeObject) {
      return {
        action: 'replace',
        reason: 'Athletic/wellness detail scenes cannot contain office objects (laptop, coffee, desk)',
        replacementSuggestion: 'Replace with athletic props: water bottle, gym gloves, sneakers, yoga mat, resistance bands',
        sceneSwap: undefined
      }
    }
  }
  
  // Check for athletic props in business detail scenes (less strict, but log)
  if (isBusinessKit) {
    const athleticProps = ['gym gloves', 'resistance bands', 'yoga mat']
    const hasAthleticProp = athleticProps.some(prop => descLower.includes(prop))
    
    if (hasAthleticProp && !descLower.includes('laptop') && !descLower.includes('coffee')) {
      return {
        action: 'adapt',
        reason: 'Business detail scenes should prioritize office objects over athletic props',
        replacementSuggestion: 'Consider adding laptop, coffee, or planner to business detail scene',
        sceneSwap: undefined
      }
    }
  }
  
  return null // No guard needed
}

/**
 * Run all guards on a scene
 * 
 * @param scene - Scene to validate
 * @param kitId - Kit ID
 * @param outfitDescription - Outfit description
 * @param location - Location description
 * @param detailDescription - Detail description (if detail scene)
 * @returns Array of guard results (empty if all pass)
 */
export function runAllGuards(
  scene: SceneKitScene,
  kitId: string,
  outfitDescription: string,
  location: string,
  detailDescription?: string
): GuardResult[] {
  const results: GuardResult[] = []
  
  // Guard #1: Activewear materials
  const materialGuard = guardActivewearMaterials(scene, kitId, outfitDescription)
  if (materialGuard) results.push(materialGuard)
  
  // Guard #2: Minimal gallery
  const galleryGuard = guardMinimalGallery(scene, kitId, location)
  if (galleryGuard) results.push(galleryGuard)
  
  // Guard #3: Athletic locations
  const locationGuard = guardAthleticLocations(scene, kitId, location)
  if (locationGuard) results.push(locationGuard)
  
  // Guard #4: Detail scene content
  if (detailDescription) {
    const detailGuard = guardDetailSceneContent(scene, kitId, detailDescription)
    if (detailGuard) results.push(detailGuard)
  }
  
  return results
}

/**
 * Check if scene passes all guards
 * 
 * @param scene - Scene to validate
 * @param kitId - Kit ID
 * @param outfitDescription - Outfit description
 * @param location - Location description
 * @param detailDescription - Detail description (if detail scene)
 * @returns true if all guards pass, false otherwise
 */
export function scenePassesGuards(
  scene: SceneKitScene,
  kitId: string,
  outfitDescription: string,
  location: string,
  detailDescription?: string
): boolean {
  const guards = runAllGuards(scene, kitId, outfitDescription, location, detailDescription)
  return guards.length === 0
}
