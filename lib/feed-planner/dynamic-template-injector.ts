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
  // Frame type for contextual location formatting
  frameType?: 'flatlay' | 'closeup' | 'fullbody' | 'midshot'
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
    // Log detailed error for debugging
    console.error(`[Dynamic Template Injector] No outfits found:`, {
      vibe: context.vibe,
      fashionStyle: context.fashionStyle,
      userId: context.userId,
      availableStyles: library ? Object.keys(library.fashionStyles) : []
    })
    throw new Error(`No outfits found for vibe: ${context.vibe}, style: ${context.fashionStyle}. Available styles: ${library ? Object.keys(library.fashionStyles).join(', ') : 'none'}`)
  }
  
  console.log(`[Dynamic Template Injector] Found ${outfits.length} outfits for vibe: ${context.vibe}, style: ${context.fashionStyle}`)
  
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
  
  /**
   * Extracts surface/material description from location for flatlay scenes
   * Removes ambient details, furniture, and atmosphere descriptions
   */
  function extractSurfaceDescription(location: LocationDescription): string {
    const desc = location.description
    
    // Try to extract just the surface/material (e.g., "dark marble", "wooden table", "concrete surface")
    // Common patterns: "marble", "wood", "concrete", "stone", "glass", "metal"
    const surfacePatterns = [
      /(dark|light|black|white|grey|gray|beige|warm|cool)\s*(marble|granite|stone|concrete|wood|wooden|glass|metal|surface|table|desk|counter)/i,
      /(marble|granite|stone|concrete|wood|wooden|glass|metal)\s*(surface|table|desk|counter|floor)/i,
      /(minimal|clean|simple)\s*(surface|table|desk)/i,
    ]
    
    for (const pattern of surfacePatterns) {
      const match = desc.match(pattern)
      if (match) {
        return match[0] + ' surface'
      }
    }
    
    // Fallback: extract first 2-3 words that describe material/surface
    const words = desc.split(/[.,;]/)[0].trim().split(/\s+/).slice(0, 3)
    if (words.length > 0) {
      return words.join(' ') + ' surface'
    }
    
    // Ultimate fallback: just "surface"
    return 'surface'
  }
  
  /**
   * Formats location description based on frame type
   * - Flatlay: Just surface/material (e.g., "dark marble surface")
   * - Closeup: Minimal or empty
   * - Fullbody/Midshot: Full description
   */
  function formatLocationForFrameType(
    location: LocationDescription,
    frameType: 'flatlay' | 'closeup' | 'fullbody' | 'midshot'
  ): string {
    switch (frameType) {
      case 'flatlay':
        // For flatlay, extract just the surface/material
        return extractSurfaceDescription(location)
      case 'closeup':
        // For closeup, return minimal context or empty
        return '' // Closeup scenes don't need location context
      case 'fullbody':
      case 'midshot':
        // For fullbody/midshot, return full description
        return location.description
    }
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
    
    // Get frame type from context (default to midshot if not provided)
    const frameType = context.frameType || 'midshot'
    
    // Return placeholder values with contextual location formatting
    return {
      OUTFIT_FULLBODY_1: formatOutfit(outfit1),
      OUTFIT_FULLBODY_2: formatOutfit(outfit2),
      OUTFIT_FULLBODY_3: formatOutfit(outfit3),
      OUTFIT_FULLBODY_4: formatOutfit(outfit4),
      
      OUTFIT_MIDSHOT_1: formatMidshot(outfit1),
      OUTFIT_MIDSHOT_2: formatMidshot(outfit2),
      
      LOCATION_OUTDOOR_1: outdoorLocations.length > 0 
        ? formatLocationForFrameType(outdoorLocations[0], frameType)
        : formatLocationForFrameType(location1, frameType),
      LOCATION_INDOOR_1: indoorLocations.length > 0 
        ? formatLocationForFrameType(indoorLocations[0], frameType)
        : formatLocationForFrameType(location1, frameType),
      LOCATION_INDOOR_2: indoorLocations.length > 1 
        ? formatLocationForFrameType(indoorLocations[1], frameType)
        : formatLocationForFrameType(location2, frameType),
      LOCATION_INDOOR_3: indoorLocations.length > 2 
        ? formatLocationForFrameType(indoorLocations[2], frameType)
        : formatLocationForFrameType(location3, frameType),
      LOCATION_ARCHITECTURAL_1: formatLocationForFrameType(location1, frameType),
    
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
 * @param frameType - Frame type for contextual location formatting (optional)
 * @returns Placeholder values ready for template replacement
 */
export async function buildPlaceholdersWithRotation(
  vibe: string,
  fashionStyle: string,
  userId: string,
  frameType?: 'flatlay' | 'closeup' | 'fullbody' | 'midshot'
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
    accessoryIndex: rotationState.accessoryIndex,
    frameType
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
 * @param frameType - Frame type for contextual location formatting (optional)
 * @returns Template with placeholders replaced with dynamic content
 */
export async function injectDynamicContentWithRotation(
  templatePrompt: string,
  vibe: string,
  fashionStyle: string,
  userId: string,
  frameType?: 'flatlay' | 'closeup' | 'fullbody' | 'midshot'
): Promise<string> {
  const placeholders = await buildPlaceholdersWithRotation(vibe, fashionStyle, userId, frameType)
  return replacePlaceholders(templatePrompt, placeholders)
}
