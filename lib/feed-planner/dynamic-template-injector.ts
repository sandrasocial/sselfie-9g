/**
 * Dynamic Template Injector
 * 
 * Injects dynamic content from vibe libraries into template placeholders.
 * Handles outfit selection, location selection, and accessory selection based on
 * user's fashion style and rotation indices.
 */

import { 
  getVibeLibrary, 
  getOutfitsByStyle,
  type OutfitFormula, 
  type LocationDescription, 
  type AccessorySet 
} from '@/lib/styling/vibe-libraries'
import { 
  replacePlaceholders, 
  type TemplatePlaceholders 
} from '@/lib/feed-planner/template-placeholders'
import { 
  getRotationState,
  type RotationState 
} from '@/lib/feed-planner/rotation-manager'

export interface InjectionContext {
  vibe: string
  fashionStyle: string
  userId: string
  // Rotation indices (Phase 5 will add database tracking)
  outfitIndex?: number
  locationIndex?: number
  accessoryIndex?: number
}

/**
 * Build placeholder values from vibe library content
 * 
 * @param context - Injection context with vibe, fashion style, and rotation indices
 * @returns Partial placeholder values ready for template replacement
 */
export function buildPlaceholders(
  context: InjectionContext
): Partial<TemplatePlaceholders> {
  const library = getVibeLibrary(context.vibe)
  
  if (!library) {
    throw new Error(`Vibe library not found: ${context.vibe}`)
  }
  
  // Get outfits for the user's fashion style
  const outfits = getOutfitsByStyle(context.vibe, context.fashionStyle)
  
  if (outfits.length === 0) {
    throw new Error(`No outfits found for vibe: ${context.vibe}, style: ${context.fashionStyle}`)
  }
  
  // Use rotation indices with wraparound
  const outfitIndex = context.outfitIndex || 0
  const locationIndex = context.locationIndex || 0
  const accessoryIndex = context.accessoryIndex || 0
  
  // Get items with wraparound (ensures we always have values)
  const outfit1 = outfits[outfitIndex % outfits.length]
  const outfit2 = outfits[(outfitIndex + 1) % outfits.length]
  const outfit3 = outfits[(outfitIndex + 2) % outfits.length]
  const outfit4 = outfits[(outfitIndex + 3) % outfits.length]
  
  const locations = library.locations
  const location1 = locations[locationIndex % locations.length]
  const location2 = locations[(locationIndex + 1) % locations.length]
  const location3 = locations[(locationIndex + 2) % locations.length]
  
  const accessories = library.accessories
  const accessory1 = accessories[accessoryIndex % accessories.length]
  const accessory2 = accessories[(accessoryIndex + 1) % accessories.length]
  
  // Build outfit descriptions for full-body scenes
  function formatOutfit(outfit: OutfitFormula): string {
    return `A confident woman wearing ${outfit.pieces.join(', ')}. ${outfit.description}`
  }
  
  // Build outfit descriptions for mid-shot scenes (focus on top + bag)
  function formatMidshot(outfit: OutfitFormula): string {
    // For mid-shots, focus on top pieces (usually first 2-3 pieces)
    const topPieces = outfit.pieces.slice(0, Math.min(3, outfit.pieces.length))
    return `A woman in ${topPieces.join(', ')}`
  }
  
  // Build location descriptions
  function formatLocation(location: LocationDescription): string {
    return location.description
  }
  
  // Build accessory descriptions
  function formatAccessories(accessory: AccessorySet): string {
    return accessory.description
  }
  
  // Build styling notes from vibe data
  const stylingNotes = `Editorial styling with attention to ${library.textures.slice(0, 2).join(' and ')} textures. High-fashion photography aesthetic. Natural confident pose.`
  
  const colorPaletteNotes = `Color palette: ${library.colorPalette.slice(0, 3).join(', ')}.`
  
  const textureNotes = `Focus on textures: ${library.textures.slice(0, 2).join(', ')}.`
  
  // Find locations by setting type
  const outdoorLocations = locations.filter(l => l.setting === 'outdoor')
  const indoorLocations = locations.filter(l => l.setting === 'indoor')
  
  // Return placeholder values
  return {
    OUTFIT_FULLBODY_1: formatOutfit(outfit1),
    OUTFIT_FULLBODY_2: formatOutfit(outfit2),
    OUTFIT_FULLBODY_3: formatOutfit(outfit3),
    OUTFIT_FULLBODY_4: formatOutfit(outfit4),
    
    OUTFIT_MIDSHOT_1: formatMidshot(outfit1),
    OUTFIT_MIDSHOT_2: formatMidshot(outfit2),
    
    LOCATION_OUTDOOR_1: outdoorLocations.length > 0 
      ? formatLocation(outdoorLocations[0]) 
      : formatLocation(location1),
    LOCATION_INDOOR_1: indoorLocations.length > 0 
      ? formatLocation(indoorLocations[0]) 
      : formatLocation(location1),
    LOCATION_INDOOR_2: indoorLocations.length > 1 
      ? formatLocation(indoorLocations[1]) 
      : formatLocation(location2),
    LOCATION_INDOOR_3: indoorLocations.length > 2 
      ? formatLocation(indoorLocations[2]) 
      : formatLocation(location3),
    LOCATION_ARCHITECTURAL_1: formatLocation(location1),
    
    ACCESSORY_CLOSEUP_1: formatAccessories(accessory1),
    ACCESSORY_FLATLAY_1: formatAccessories(accessory1),
    ACCESSORY_FLATLAY_2: formatAccessories(accessory2),
    
    LIGHTING_EVENING: 'Evening golden hour lighting with warm shadows',
    LIGHTING_BRIGHT: 'Bright natural lighting, well-lit and airy',
    LIGHTING_AMBIENT: 'Soft ambient interior lighting',
    
    STYLING_NOTES: stylingNotes,
    COLOR_PALETTE: colorPaletteNotes,
    TEXTURE_NOTES: textureNotes
  }
}

/**
 * Main function to inject dynamic content into template
 * 
 * @param templatePrompt - Template string with placeholders
 * @param context - Injection context
 * @returns Template with placeholders replaced with dynamic content
 */
export function injectDynamicContent(
  templatePrompt: string,
  context: InjectionContext
): string {
  const placeholders = buildPlaceholders(context)
  return replacePlaceholders(templatePrompt, placeholders)
}

/**
 * Build placeholders with rotation state from database
 * 
 * @param vibe - Vibe key (e.g., 'luxury_dark_moody')
 * @param fashionStyle - Fashion style (e.g., 'business')
 * @param userId - User ID
 * @returns Placeholder values ready for template replacement
 */
export async function buildPlaceholdersWithRotation(
  vibe: string,
  fashionStyle: string,
  userId: string
): Promise<Partial<TemplatePlaceholders>> {
  // Get current rotation state from database
  const rotationState = await getRotationState(userId, vibe, fashionStyle)
  
  // Build placeholders using rotation indices
  const context: InjectionContext = {
    vibe,
    fashionStyle,
    userId,
    outfitIndex: rotationState.outfitIndex,
    locationIndex: rotationState.locationIndex,
    accessoryIndex: rotationState.accessoryIndex
  }
  
  return buildPlaceholders(context)
}

/**
 * Complete injection with rotation tracking
 * 
 * @param templatePrompt - Template string with placeholders
 * @param vibe - Vibe key
 * @param fashionStyle - Fashion style
 * @param userId - User ID
 * @returns Template with placeholders replaced with dynamic content
 */
export async function injectDynamicContentWithRotation(
  templatePrompt: string,
  vibe: string,
  fashionStyle: string,
  userId: string
): Promise<string> {
  const placeholders = await buildPlaceholdersWithRotation(vibe, fashionStyle, userId)
  return replacePlaceholders(templatePrompt, placeholders)
}
