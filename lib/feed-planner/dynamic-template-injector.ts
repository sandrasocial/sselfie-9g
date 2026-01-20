/**
 * Dynamic Template Injector
 * 
 * 🧊 FROZEN: Template injection. Will be replaced with scene composition.
 * 
 * PHASE 6: This file is frozen. Feed Planner now uses scene-resolver.ts for scene intent.
 * This injector mutates template text and will be replaced with structured scene composition.
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
  // Style + aesthetic blending
  visualAesthetics?: string[]
  fashionStyles?: string[]
  feedStyle?: string
  category?: string
}

type StyleAccessor = "athletic" | "business" | "bohemian" | "classic" | "trendy" | "casual"
type VisualCategory = "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"

const STYLE_KEYS: StyleAccessor[] = ["athletic", "business", "bohemian", "classic", "trendy", "casual"]
const CATEGORY_KEYS: VisualCategory[] = ["luxury", "minimal", "beige", "warm", "edgy", "professional"]

function normalizeStyleList(styles?: string[], fallback?: string): string[] {
  const cleaned = (styles || [])
    .map((style) => style.toLowerCase().trim())
    .filter((style) => STYLE_KEYS.includes(style as StyleAccessor))
  if (cleaned.length > 0) {
    return cleaned
  }
  if (fallback && STYLE_KEYS.includes(fallback as StyleAccessor)) {
    return [fallback]
  }
  return ["casual"]
}

function normalizeAestheticList(aesthetics?: string[], fallback?: string): string[] {
  const cleaned = (aesthetics || [])
    .map((aesthetic) => aesthetic.toLowerCase().trim())
    .filter((aesthetic) => CATEGORY_KEYS.includes(aesthetic as VisualCategory))
  if (cleaned.length > 0) {
    return cleaned
  }
  if (fallback && CATEGORY_KEYS.includes(fallback as VisualCategory)) {
    return [fallback]
  }
  return ["minimal"]
}

function parseVibeKey(vibe: string): { category: VisualCategory | null; mood: string | null } {
  const lower = vibe.toLowerCase().trim()
  const match = lower.match(/^(luxury|minimal|beige|warm|edgy|professional)_([a-z_]+)$/)
  if (!match) {
    return { category: null, mood: null }
  }
  const category = match[1] as VisualCategory
  const mood = match[2]
  return { category, mood }
}

function getPaletteDescriptor(feedStyle?: string, category?: VisualCategory | null): string {
  const style = feedStyle?.toLowerCase().trim()
  if (style === "luxury" || category === "luxury") return "rich, sophisticated neutrals"
  if (style === "minimal" || category === "minimal") return "clean whites and soft grays"
  if (style === "beige" || category === "beige") return "warm beiges and camel tones"
  if (category === "warm") return "warm golden tones"
  if (category === "edgy") return "cool neutrals and charcoal tones"
  if (category === "professional") return "polished neutrals and soft blacks"
  return "neutral tones"
}

function getAccentNote(accentAesthetic?: string, accentStyle?: string): string | null {
  const notes: string[] = []
  if (accentAesthetic) {
    notes.push(`subtle ${accentAesthetic} accents`)
  }
  if (accentStyle) {
    notes.push(`${accentStyle} styling touches`)
  }
  if (notes.length === 0) return null
  return notes.join(" with ")
}

function buildAccessorySets(
  primaryStyle: string,
  palette: string,
  category: VisualCategory | null,
  accentStyle?: string
): AccessorySet[] {
  const prefix =
    category === "luxury"
      ? "luxury"
      : category === "minimal"
        ? "minimal"
        : category === "beige" || category === "warm"
          ? "warm"
          : category === "edgy"
            ? "edgy"
            : category === "professional"
              ? "professional"
              : "lifestyle"
  const accentNote = accentStyle ? ` with subtle ${accentStyle} touches` : ""
  const style = primaryStyle.toLowerCase()

  if (style === "athletic") {
    if (category === "edgy") {
      return [
        {
          id: "athletic_edgy_flatlay",
          name: "Athletic edgy flatlay",
          vibe: "athletic",
          items: ["black coffee", "training gloves", "chain bracelet"],
          description: `Edgy athletic flatlay with black coffee, training gloves, and chain bracelet in ${palette} tones${accentNote}.`,
        },
        {
          id: "athletic_edgy_accessories",
          name: "Athletic edgy accessories",
          vibe: "athletic",
          items: ["matte water bottle", "wireless headphones", "black gym bag"],
          description: `Matte water bottle, wireless headphones, and black gym bag styled in ${palette} palette for a gritty athletic edge${accentNote}.`,
        },
      ]
    }

    return [
      {
        id: "athletic_flatlay",
        name: "Athletic flatlay",
        vibe: "athletic",
        items: ["smoothie bowl", "yoga mat", "resistance band"],
        description: `Athletic flatlay with smoothie bowl, yoga mat, and resistance band in ${palette} colors${accentNote}.`,
      },
      {
        id: "athletic_accessories",
        name: "Athletic accessories",
        vibe: "athletic",
        items: ["water bottle", "Apple headphones", "gym bag"],
        description: `Premium water bottle, Apple headphones, and gym bag in ${palette} tones for a ${prefix} athletic look${accentNote}.`,
      },
    ]
  }

  if (style === "business") {
    return [
      {
        id: "business_flatlay",
        name: "Business flatlay",
        vibe: "business",
        items: ["laptop", "leather notebook", "pen"],
        description: `Minimal workstation flatlay with laptop, leather notebook, and pen in ${palette} tones${accentNote}.`,
      },
      {
        id: "business_accessories",
        name: "Business accessories",
        vibe: "business",
        items: ["espresso cup", "structured tote", "watch"],
        description: `Espresso cup, structured tote, and classic watch aligned to ${palette} palette for a polished look${accentNote}.`,
      },
    ]
  }

  if (style === "bohemian") {
    return [
      {
        id: "bohemian_flatlay",
        name: "Bohemian flatlay",
        vibe: "bohemian",
        items: ["woven pouch", "ceramic mug", "dried florals"],
        description: `Bohemian flatlay with woven pouch, ceramic mug, and dried florals in ${palette} tones${accentNote}.`,
      },
      {
        id: "bohemian_accessories",
        name: "Bohemian accessories",
        vibe: "bohemian",
        items: ["layered jewelry", "vintage book", "textured scarf"],
        description: `Layered jewelry, vintage book, and textured scarf in ${palette} palette for an artistic feel${accentNote}.`,
      },
    ]
  }

  if (style === "classic") {
    return [
      {
        id: "classic_flatlay",
        name: "Classic flatlay",
        vibe: "classic",
        items: ["leather planner", "pearl jewelry", "espresso cup"],
        description: `Classic flatlay with leather planner, pearl jewelry, and espresso cup in ${palette} tones${accentNote}.`,
      },
      {
        id: "classic_accessories",
        name: "Classic accessories",
        vibe: "classic",
        items: ["structured handbag", "gold watch", "silk scarf"],
        description: `Structured handbag, gold watch, and silk scarf aligned to ${palette} palette for timeless elegance${accentNote}.`,
      },
    ]
  }

  if (style === "trendy") {
    return [
      {
        id: "trendy_flatlay",
        name: "Trendy flatlay",
        vibe: "trendy",
        items: ["statement sunglasses", "mini bag", "phone"],
        description: `Trendy flatlay with statement sunglasses, mini bag, and phone in ${palette} tones${accentNote}.`,
      },
      {
        id: "trendy_accessories",
        name: "Trendy accessories",
        vibe: "trendy",
        items: ["bold jewelry", "textured clutch", "iced drink"],
        description: `Bold jewelry, textured clutch, and iced drink styled in ${palette} palette for a modern vibe${accentNote}.`,
      },
    ]
  }

  return [
    {
      id: "casual_flatlay",
      name: "Casual flatlay",
      vibe: "casual",
      items: ["coffee cup", "journal", "phone"],
      description: `Casual flatlay with coffee cup, journal, and phone in ${palette} tones${accentNote}.`,
    },
    {
      id: "casual_accessories",
      name: "Casual accessories",
      vibe: "casual",
      items: ["tote bag", "sunglasses", "notebook"],
      description: `Tote bag, sunglasses, and notebook styled in ${palette} palette for an effortless feel${accentNote}.`,
    },
  ]
}

function buildLocations(
  primaryStyle: string,
  category: VisualCategory | null,
  accentAesthetic?: string
): LocationDescription[] {
  const accentNote = accentAesthetic ? ` with subtle ${accentAesthetic} accents` : ""
  const baseDescriptors: Record<string, string> = {
    luxury: "upscale",
    minimal: "clean",
    beige: "warm beige",
    warm: "warm",
    edgy: "industrial",
    professional: "polished",
  }
  const descriptor = baseDescriptors[category || "minimal"] || "clean"
  const style = primaryStyle.toLowerCase()

  if (style === "athletic") {
    return [
      {
        id: "athletic_gym",
        name: "Modern gym",
        description: `${descriptor} modern gym with natural light${accentNote}`,
        lighting: "natural window light",
        mood: "energized",
        setting: "indoor",
      },
      {
        id: "athletic_studio",
        name: "Yoga studio",
        description: `${descriptor} yoga studio with calm, open space${accentNote}`,
        lighting: "soft diffused light",
        mood: "focused",
        setting: "indoor",
      },
      {
        id: "athletic_outdoor",
        name: "Outdoor trail",
        description: `${descriptor} outdoor running path with open space${accentNote}`,
        lighting: "natural daylight",
        mood: "active",
        setting: "outdoor",
      },
    ]
  }

  if (style === "business") {
    return [
      {
        id: "business_office",
        name: "Office",
        description: `${descriptor} office with structured details${accentNote}`,
        lighting: "balanced daylight",
        mood: "focused",
        setting: "indoor",
      },
      {
        id: "business_lobby",
        name: "Hotel lobby",
        description: `${descriptor} hotel lobby with architectural lines${accentNote}`,
        lighting: "soft ambient light",
        mood: "polished",
        setting: "indoor",
      },
      {
        id: "business_city",
        name: "City street",
        description: `${descriptor} city street near modern buildings${accentNote}`,
        lighting: "natural daylight",
        mood: "professional",
        setting: "outdoor",
      },
    ]
  }

  if (style === "bohemian") {
    return [
      {
        id: "bohemian_studio",
        name: "Art studio",
        description: `${descriptor} art studio with textiles and natural textures${accentNote}`,
        lighting: "soft natural light",
        mood: "creative",
        setting: "indoor",
      },
      {
        id: "bohemian_market",
        name: "Market",
        description: `${descriptor} market with earthy textures${accentNote}`,
        lighting: "natural daylight",
        mood: "artful",
        setting: "outdoor",
      },
      {
        id: "bohemian_garden",
        name: "Garden",
        description: `${descriptor} garden space with organic elements${accentNote}`,
        lighting: "golden hour light",
        mood: "relaxed",
        setting: "outdoor",
      },
    ]
  }

  if (style === "classic") {
    return [
      {
        id: "classic_hotel",
        name: "Hotel lobby",
        description: `${descriptor} hotel lobby with timeless finishes${accentNote}`,
        lighting: "soft ambient light",
        mood: "refined",
        setting: "indoor",
      },
      {
        id: "classic_gallery",
        name: "Gallery",
        description: `${descriptor} gallery interior with clean lines${accentNote}`,
        lighting: "even daylight",
        mood: "elegant",
        setting: "indoor",
      },
      {
        id: "classic_street",
        name: "Historic street",
        description: `${descriptor} street with classic architecture${accentNote}`,
        lighting: "natural daylight",
        mood: "timeless",
        setting: "outdoor",
      },
    ]
  }

  if (style === "trendy") {
    return [
      {
        id: "trendy_cafe",
        name: "Modern cafe",
        description: `${descriptor} modern cafe with styled interiors${accentNote}`,
        lighting: "soft natural light",
        mood: "current",
        setting: "indoor",
      },
      {
        id: "trendy_rooftop",
        name: "Rooftop",
        description: `${descriptor} rooftop setting with city views${accentNote}`,
        lighting: "golden hour light",
        mood: "social",
        setting: "outdoor",
      },
      {
        id: "trendy_street",
        name: "City street",
        description: `${descriptor} city street with modern storefronts${accentNote}`,
        lighting: "natural daylight",
        mood: "bold",
        setting: "outdoor",
      },
    ]
  }

  return [
    {
      id: "casual_cafe",
      name: "Cafe",
      description: `${descriptor} cafe with relaxed atmosphere${accentNote}`,
      lighting: "soft natural light",
      mood: "casual",
      setting: "indoor",
    },
    {
      id: "casual_home",
      name: "Home nook",
      description: `${descriptor} home nook with cozy details${accentNote}`,
      lighting: "warm ambient light",
      mood: "comfortable",
      setting: "indoor",
    },
    {
      id: "casual_park",
      name: "Neighborhood park",
      description: `${descriptor} neighborhood park with natural light${accentNote}`,
      lighting: "natural daylight",
      mood: "easy",
      setting: "outdoor",
    },
  ]
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

  const { category: parsedCategory } = parseVibeKey(context.vibe)
  const resolvedCategory = (context.category || parsedCategory || "minimal") as VisualCategory
  const primaryAesthetics = normalizeAestheticList(context.visualAesthetics, resolvedCategory)
  const accentAesthetic = primaryAesthetics.length > 1 ? primaryAesthetics[1] : undefined
  const styleOptions = normalizeStyleList(context.fashionStyles, context.fashionStyle)
  const accentStyle = styleOptions.length > 1 ? styleOptions[1] : undefined
  const paletteDescriptor = getPaletteDescriptor(context.feedStyle, resolvedCategory)
  
  // Get items with wraparound (ensures we always have values)
  const outfit1 = outfits[outfitIndex % outfits.length]
  const outfit2 = outfits[(outfitIndex + 1) % outfits.length]
  const outfit3 = outfits[(outfitIndex + 2) % outfits.length]
  const outfit4 = outfits[(outfitIndex + 3) % outfits.length]
  
  const styleLocations = buildLocations(context.fashionStyle, resolvedCategory, accentAesthetic)
  const locations = styleLocations.length > 0 ? styleLocations : library.locations
  const location1 = locations[locationIndex % locations.length]
  const location2 = locations[(locationIndex + 1) % locations.length]
  const location3 = locations[(locationIndex + 2) % locations.length]
  
  const styleAccessories = buildAccessorySets(
    context.fashionStyle,
    paletteDescriptor,
    resolvedCategory,
    accentStyle
  )
  const accessories = styleAccessories.length > 0 ? styleAccessories : library.accessories
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
  
  const accentNote = getAccentNote(accentAesthetic, accentStyle)
  
  // Build styling notes from vibe data
  const stylingNotes = `Editorial styling with attention to ${library.textures.slice(0, 2).join(' and ')} textures. High-fashion photography aesthetic. Natural confident pose.${accentNote ? ` ${accentNote}.` : ''}`
  
  const colorPaletteNotes = `Color palette: ${library.colorPalette.slice(0, 3).join(', ')}.`
  
  const textureNotes = `Focus on textures: ${library.textures.slice(0, 2).join(', ')}.`
  
  // ✅ FIX: Filter locations by setting type FIRST, then apply rotation
  // This ensures outdoor/indoor locations rotate correctly across feeds
  const outdoorLocations = locations.filter(l => l.setting === 'outdoor')
  const indoorLocations = locations.filter(l => l.setting === 'indoor')
  
  // Apply rotation index to filtered arrays (not full array)
  // This ensures different outdoor/indoor locations are used each feed
  const outdoorIndex = outdoorLocations.length > 0 
    ? locationIndex % outdoorLocations.length 
    : 0
  const indoorIndex = indoorLocations.length > 0 
    ? locationIndex % indoorLocations.length 
    : 0
  
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
    
    // ✅ FIX: Use rotated indices for outdoor/indoor locations
    LOCATION_OUTDOOR_1: outdoorLocations.length > 0 
      ? formatLocationForFrameType(outdoorLocations[outdoorIndex], frameType)
      : formatLocationForFrameType(location1, frameType),
    LOCATION_INDOOR_1: indoorLocations.length > 0 
      ? formatLocationForFrameType(indoorLocations[indoorIndex], frameType)
      : formatLocationForFrameType(location1, frameType),
    LOCATION_INDOOR_2: indoorLocations.length > 1 
      ? formatLocationForFrameType(indoorLocations[(indoorIndex + 1) % indoorLocations.length], frameType)
      : formatLocationForFrameType(location2, frameType),
    LOCATION_INDOOR_3: indoorLocations.length > 2 
      ? formatLocationForFrameType(indoorLocations[(indoorIndex + 2) % indoorLocations.length], frameType)
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
  frameType?: 'flatlay' | 'closeup' | 'fullbody' | 'midshot',
  options?: {
    visualAesthetics?: string[]
    fashionStyles?: string[]
    feedStyle?: string
    category?: string
  }
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
    frameType,
    visualAesthetics: options?.visualAesthetics,
    fashionStyles: options?.fashionStyles,
    feedStyle: options?.feedStyle,
    category: options?.category
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
  frameType?: 'flatlay' | 'closeup' | 'fullbody' | 'midshot',
  options?: {
    visualAesthetics?: string[]
    fashionStyles?: string[]
    feedStyle?: string
    category?: string
  }
): Promise<string> {
  const placeholders = await buildPlaceholdersWithRotation(
    vibe,
    fashionStyle,
    userId,
    frameType,
    options
  )
  return replacePlaceholders(templatePrompt, placeholders)
}
