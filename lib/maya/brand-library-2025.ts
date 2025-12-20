/**
 * BRAND LIBRARY 2025
 * 
 * Based on 100+ real prompts used in production.
 * Critical rules:
 * - ✅ ALWAYS brand: Alo Yoga, Lululemon, Adidas Gazelle, Nike AF1, New Balance 550, Levi's 501, UGG slippers, Bottega bags
 * - ⚡ SOMETIMES brand: Outerwear, basic tops, accessories
 * - ❌ USUALLY DON'T brand: "white sneakers", generic basics, jewelry (unless Cartier)
 * - 💎 MAX 1-2 luxury pieces per outfit (usually just the bag)
 * - 🎯 Athletic brands for athletic, casual brands for casual
 */

// ============================================================================
// BRAND DATABASE
// ============================================================================

interface BrandItem {
  brand: string
  name: string
  colors?: string[]
  details?: string[]
  variants?: string[]
}

interface BrandCollection {
  [key: string]: BrandItem[]
}

// ATHLETIC/ATHLEISURE (Primary Category - Most Used)
const ATHLETIC_BRANDS: BrandCollection = {
  'alo-yoga': [
    {
      brand: 'Alo Yoga',
      name: 'Airlift bralette',
      colors: ['black'],
      details: ['high support']
    },
    {
      brand: 'Alo Yoga',
      name: 'Airbrush leggings',
      colors: ['black'],
      details: ['sculpting high waistband']
    },
    {
      brand: 'Alo Yoga',
      name: 'Accolade sweatshirt',
    },
    {
      brand: 'Alo Yoga',
      name: 'Cropped hoodie',
      colors: ['beige', 'grey', 'sage']
    },
    {
      brand: 'Alo Yoga',
      name: 'Tennis skirt',
    },
    {
      brand: 'Alo Yoga',
      name: 'Matching sets',
    },
  ],
  'lululemon': [
    {
      brand: 'Lululemon',
      name: 'Align leggings',
      variants: ['25"', '28"'],
      colors: ['navy', 'black']
    },
    {
      brand: 'Lululemon',
      name: 'Everywhere Belt Bag',
      colors: ['grey', 'black']
    },
    {
      brand: 'Lululemon',
      name: 'Scuba Oversized hoodie',
      colors: ['heathered grey']
    },
    {
      brand: 'Lululemon',
      name: 'Define jacket',
      colors: ['black']
    },
    {
      brand: 'Lululemon',
      name: 'Wunder Train tights',
    },
    {
      brand: 'Lululemon',
      name: 'Align joggers',
    },
  ],
  'nike': [
    {
      brand: 'Nike',
      name: 'Air Force 1 Low sneakers',
      colors: ['triple white leather']
    },
    {
      brand: 'Nike',
      name: 'Air Max',
      variants: ['90', '95', '97']
    },
    {
      brand: 'Nike',
      name: 'Dunk Low',
    },
    {
      brand: 'Nike',
      name: 'Athletic wear',
      details: ['Dri-FIT']
    },
  ],
  'adidas': [
    {
      brand: 'Adidas',
      name: 'Gazelle sneakers',
      colors: ['burgundy suede', 'white leather', 'navy']
    },
    {
      brand: 'Adidas',
      name: 'Samba sneakers',
      colors: ['white with black stripes', 'cream']
    },
    {
      brand: 'Adidas',
      name: 'Stan Smith',
    },
    {
      brand: 'Adidas',
      name: 'Ultraboost',
    },
  ],
  'new-balance': [
    {
      brand: 'New Balance',
      name: '550 sneakers',
      colors: ['white and grey']
    },
    {
      brand: 'New Balance',
      name: '327',
      details: ['various colorways']
    },
    {
      brand: 'New Balance',
      name: '990 v5',
    },
  ],
}

// ACCESSIBLE FASHION
const ACCESSIBLE_BRANDS: BrandCollection = {
  'levis': [
    {
      brand: "Levi's",
      name: '501 straight-leg jeans',
      colors: ['light vintage wash', 'vintage blue wash']
    },
    {
      brand: "Levi's",
      name: 'Ribcage jeans',
      colors: ['black']
    },
    {
      brand: "Levi's",
      name: '505',
    },
    {
      brand: "Levi's",
      name: 'Wedgie fit',
    },
  ],
  'ugg': [
    {
      brand: 'UGG',
      name: 'Tasman slippers',
      colors: ['chestnut'],
      details: ['shearling lining']
    },
    {
      brand: 'UGG',
      name: 'Fluff Yeah slippers',
      colors: ['cream']
    },
    {
      brand: 'UGG',
      name: 'Classic boots',
    },
  ],
  'new-era': [
    {
      brand: 'New Era',
      name: 'Baseball cap',
      details: ['specify when branded, otherwise "black baseball cap"']
    },
  ],
}

// LUXURY ACCENTS (Use Sparingly, 1-2 per outfit max)
const LUXURY_BRANDS: BrandCollection = {
  'bottega-veneta': [
    {
      brand: 'Bottega Veneta',
      name: 'Jodie bag',
      colors: ['butter-soft caramel leather', 'cream leather']
    },
    {
      brand: 'Bottega Veneta',
      name: 'Arco tote',
      colors: ['black leather'],
      details: ['intrecciato weave']
    },
    {
      brand: 'Bottega Veneta',
      name: 'Loop Camera bag',
    },
    {
      brand: 'Bottega Veneta',
      name: 'Cassette crossbody',
    },
  ],
  'hermes': [
    {
      brand: 'Hermès',
      name: 'Birkin bag',
      colors: ['caramel leather'],
      details: ['luxury travel only']
    },
    {
      brand: 'Hermès',
      name: 'Constance bag',
    },
    {
      brand: 'Hermès',
      name: 'Belt',
    },
    {
      brand: 'Hermès',
      name: 'Scarf',
    },
  ],
  'chanel': [
    {
      brand: 'Chanel',
      name: 'Quilted bags',
      details: ['golden hardware']
    },
    {
      brand: 'Chanel',
      name: 'Tweed pieces',
      details: ['luxury fashion collection']
    },
  ],
  'louis-vuitton': [
    {
      brand: 'Louis Vuitton',
      name: 'Luggage',
      variants: ['Horizon', 'Keepall', 'Monogram']
    },
    {
      brand: 'Louis Vuitton',
      name: 'Capucines mini bag',
    },
  ],
  'cartier': [
    {
      brand: 'Cartier',
      name: 'Love bracelet',
      colors: ['yellow gold']
    },
    {
      brand: 'Cartier',
      name: 'Tank watch',
    },
    {
      brand: 'Cartier',
      name: 'Juste un Clou bracelet',
    },
  ],
  'the-row': [
    {
      brand: 'The Row',
      name: 'Oversized coat',
      colors: ['beige', 'black', 'cream']
    },
    {
      brand: 'The Row',
      name: 'Banshee bag',
      colors: ['black leather', 'beige leather']
    },
    {
      brand: 'The Row',
      name: 'Park bag',
      colors: ['black leather']
    },
    {
      brand: 'The Row',
      name: 'Tote bag',
      colors: ['black leather', 'beige leather']
    },
  ],
}

// GENERIC UNBRANDED OPTIONS (Use These Often)
const UNBRANDED_ITEMS: Record<string, string[]> = {
  shoes: [
    'white sneakers',
  ],
  accessories: [
    'black baseball cap',
    'oversized cream sweater',
    'black leather jacket',
    'white ribbed tank',
    'cream cashmere sweater',
    'structured tote bag',
    'delicate gold necklaces',
  ],
  outerwear: [
    'oversized black wool coat',
  ],
  tops: [
    'oversized cream cable knit sweater',
    'white ribbed cotton tank',
    'cream cashmere sweater',
  ],
  bottoms: [
    'matching cashmere joggers',
  ],
  jewelry: [
    'minimal gold jewelry',
    'delicate gold necklaces',
  ],
}

// ============================================================================
// ITEM TYPE MAPPING
// ============================================================================

const ITEM_TYPE_MAPPING: Record<string, string> = {
  'top': 'top',
  'bottom': 'bottom',
  'shoes': 'shoes',
  'accessory': 'accessory',
  'bag': 'bag',
  'outerwear': 'outerwear',
  'jewelry': 'jewelry',
  'leggings': 'bottom',
  'jeans': 'bottom',
  'sneakers': 'shoes',
  'hoodie': 'top',
  'jacket': 'outerwear',
  'coat': 'outerwear',
  'baseball-cap': 'accessory',
  'cap': 'accessory',
  'belt-bag': 'bag',
  'tote': 'bag',
  'crossbody': 'bag',
  'bracelet': 'jewelry',
  'watch': 'jewelry',
  'luggage': 'bag',
}

// ============================================================================
// BRANDING RULES
// ============================================================================

const ALWAYS_BRAND: Record<string, string[]> = {
  'leggings': ['alo-yoga', 'lululemon'],
  'athletic-leggings': ['alo-yoga', 'lululemon'],
  'bra': ['alo-yoga'],
  'bralette': ['alo-yoga'],
  'sports-bra': ['alo-yoga'],
  'belt-bag': ['lululemon'],
  'athletic-top': ['alo-yoga', 'lululemon'],
  'athletic-bottom': ['alo-yoga', 'lululemon'],
  'jeans': ["levis"],
  '501': ["levis"],
  'slippers': ['ugg'],
  'gazelle': ['adidas'],
  'air-force-1': ['nike'],
  'af1': ['nike'],
  '550': ['new-balance'],
  'jodie': ['bottega-veneta'],
  'jodie-bag': ['bottega-veneta'],
  'bottega-bag': ['bottega-veneta'],
}

const SOMETIMES_BRAND: Record<string, string[]> = {
  'outerwear': ['lululemon'],
  'hoodie': ['lululemon', 'alo-yoga'],
  'jacket': ['lululemon'],
  'sweatshirt': ['alo-yoga'],
}

const RARELY_BRAND: string[] = [
  'white-sneakers',
  'basic-top',
  'tank',
  'sweater',
  'necklace',
  'jewelry',
  'baseball-cap',
]

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

interface OutfitContext {
  category: string
  vibe?: string
  aesthetic?: string
  luxuryLevel?: 'none' | 'minimal' | 'max'
}

/**
 * Get a branded piece for a specific category and item type
 */
export function getBrandedPiece(
  category: string,
  item: string,
  aesthetic?: string
): string | null {
  const itemType = ITEM_TYPE_MAPPING[item.toLowerCase()] || item.toLowerCase()
  const categoryLower = category.toLowerCase()

  // Athletic/athleisure categories
  if (categoryLower === 'workout' || categoryLower === 'athletic' || categoryLower === 'gym') {
    if (itemType === 'top' || item === 'bralette' || item === 'sports-bra') {
      return getDetailedDescription('Alo Yoga', 'Airlift bralette')
      // Returns: "Alo Yoga Airlift bralette in black with high support"
    }
    if (itemType === 'bottom' || item === 'leggings') {
      return getDetailedDescription('Alo Yoga', 'Airbrush leggings')
      // Returns: "Alo Yoga Airbrush leggings in matching black with sculpting high waistband"
    }
    if (itemType === 'shoes' || item === 'sneakers') {
      return getDetailedDescription('Nike', 'Air Force 1 Low sneakers')
      // Returns: "Nike Air Force 1 Low sneakers in triple white leather"
    }
    if (itemType === 'bag' || item === 'belt-bag') {
      return getDetailedDescription('Lululemon', 'Everywhere Belt Bag')
      // Returns: "Lululemon Everywhere Belt Bag in grey" or "in black"
    }
  }

  // Casual categories
  if (categoryLower === 'casual' || categoryLower === 'coffee-run' || categoryLower === 'street-style') {
    if (itemType === 'bottom' || item === 'jeans') {
      return getDetailedDescription("Levi's", '501 straight-leg jeans')
    }
    if (itemType === 'shoes' || item === 'sneakers') {
      // Gazelle is preferred for casual
      return getDetailedDescription('Adidas', 'Gazelle sneakers')
    }
    if (itemType === 'accessory' && item === 'baseball-cap') {
      // Don't brand caps unless specifically requested
      return null
    }
  }

  // Cozy/home categories
  if (categoryLower === 'cozy' || categoryLower === 'home') {
    if (itemType === 'shoes' || item === 'slippers') {
      return getDetailedDescription('UGG', 'Tasman slippers')
    }
  }

  // Travel categories
  if (categoryLower === 'travel' || categoryLower === 'airport') {
    if (itemType === 'top' || item === 'hoodie') {
      return getDetailedDescription('Lululemon', 'Scuba Oversized hoodie')
    }
    if (itemType === 'bottom') {
      return getDetailedDescription('Lululemon', 'Align joggers')
    }
    if (itemType === 'bag' || item === 'belt-bag') {
      return getDetailedDescription('Lululemon', 'Everywhere Belt Bag')
    }
  }

  // Check always-brand rules
  const alwaysBrandKeys = Object.keys(ALWAYS_BRAND)
  for (const key of alwaysBrandKeys) {
    if (item.toLowerCase().includes(key) || itemType.includes(key)) {
      const brands = ALWAYS_BRAND[key]
      const brandKey = brands[0].replace('-', '-')
      const collection = getBrandCollection(brandKey)
      if (collection && collection.length > 0) {
        const item = collection[0]
        return getDetailedDescription(item.brand, item.name)
      }
    }
  }

  return null
}

/**
 * Determine if an item should be branded based on context
 */
export function shouldBrandItem(
  itemType: string,
  outfitContext: OutfitContext
): boolean {
  const itemLower = itemType.toLowerCase()
  const { category } = outfitContext

  // Always brand these items
  const alwaysBrandKeys = Object.keys(ALWAYS_BRAND)
  for (const key of alwaysBrandKeys) {
    if (itemLower.includes(key)) {
      return true
    }
  }

  // Never brand these items (use generic)
  if (RARELY_BRAND.some(key => itemLower.includes(key))) {
    return false
  }

  // Sometimes brand based on category
  if (category === 'workout' || category === 'athletic' || category === 'gym') {
    // Brand athletic items
    if (['top', 'bottom', 'bra', 'bralette', 'leggings', 'shoes', 'bag'].includes(itemLower)) {
      return true
    }
  }

  if (category === 'casual' || category === 'street-style') {
    // Brand jeans and sneakers, but not basic tops
    if (['jeans', 'sneakers', 'shoes'].includes(itemLower)) {
      return true
    }
    if (['top', 'sweater', 'tank'].includes(itemLower)) {
      return false // Use unbranded
    }
  }

  // Sometimes brand outerwear
  if (itemLower.includes('outerwear') || itemLower.includes('hoodie') || itemLower.includes('jacket')) {
    return outfitContext.category === 'athletic' || outfitContext.category === 'workout'
  }

  return false
}

/**
 * Generate a complete outfit with branded pieces
 */
export function generateCompleteOutfit(
  category: string,
  vibe?: string
): Record<string, string> {
  const categoryLower = category.toLowerCase()
  const outfit: Record<string, string> = {}

  if (categoryLower === 'workout' || categoryLower === 'athletic' || categoryLower === 'gym') {
    outfit.top = getDetailedDescription('Alo Yoga', 'Airlift bralette') // "Alo Yoga Airlift bralette in black with high support"
    outfit.bottom = getDetailedDescription('Alo Yoga', 'Airbrush leggings') // "Alo Yoga Airbrush leggings in matching black with sculpting high waistband"
    outfit.shoes = getDetailedDescription('Nike', 'Air Force 1 Low sneakers') // "Nike Air Force 1 Low sneakers in triple white leather"
    outfit.accessory = getDetailedDescription('Lululemon', 'Everywhere Belt Bag') // "Lululemon Everywhere Belt Bag in grey" or "in black"
    return outfit
  }

  if (categoryLower === 'casual' || categoryLower === 'coffee-run') {
    outfit.top = 'oversized cream cable knit sweater' // unbranded
    outfit.bottom = getDetailedDescription("Levi's", '501 straight-leg jeans')
    outfit.shoes = getDetailedDescription('Adidas', 'Gazelle sneakers') // Will return "Adidas Gazelle sneakers in burgundy suede"
    outfit.accessory = 'black baseball cap' // unbranded
    return outfit
  }

  if (categoryLower === 'street-style') {
    outfit.outerwear = 'oversized black wool coat' // unbranded
    outfit.top = 'white ribbed cotton tank' // unbranded
    outfit.bottom = getDetailedDescription("Levi's", '501 straight-leg jeans')
    outfit.shoes = getDetailedDescription('New Balance', '550 sneakers')
    outfit.bag = getDetailedDescription('Bottega Veneta', 'Jodie bag') // 1 luxury piece
    outfit.accessory = 'minimal gold jewelry' // unbranded
    return outfit
  }

  if (categoryLower === 'travel' || categoryLower === 'airport') {
    outfit.top = getDetailedDescription('Lululemon', 'Scuba Oversized hoodie')
    outfit.bottom = getDetailedDescription('Lululemon', 'Align joggers')
    outfit.shoes = 'white Common Projects Achilles Low sneakers'
    outfit.bag = getDetailedDescription('Lululemon', 'Everywhere Belt Bag')
    outfit.luggage = 'Away aluminum carry-on' // or 'Louis Vuitton Monogram' for luxury
    return outfit
  }

  if (categoryLower === 'cozy' || categoryLower === 'home') {
    outfit.top = 'cream cashmere sweater' // unbranded
    outfit.bottom = 'matching cashmere joggers' // unbranded
    outfit.shoes = getDetailedDescription('UGG', 'Tasman slippers')
    outfit.accessory = getDetailedDescription('Cartier', 'Love bracelet') // 1 luxury touch
    return outfit
  }

  if (categoryLower === 'luxury') {
    // Luxury category: Use The Row, Bottega, Cartier
    outfit.outerwear = getDetailedDescription('The Row', 'Oversized coat') // The Row for quiet luxury
    outfit.top = 'cream cashmere turtleneck' // unbranded but quality
    outfit.bottom = 'tailored wide-leg trousers in black' // unbranded but quality
    outfit.shoes = 'Common Projects Achilles Low sneakers in white' // Minimalist luxury
    outfit.bag = getDetailedDescription('Bottega Veneta', 'Jodie bag') // 1 luxury piece
    outfit.jewelry = getDetailedDescription('Cartier', 'Love bracelet') // 1 luxury accent
    return outfit
  }

  // Default fallback - ensure at least one brand
  if (Object.keys(outfit).length === 0) {
    // Default to casual with brands
    outfit.top = 'oversized cream cable knit sweater' // unbranded
    outfit.bottom = getDetailedDescription("Levi's", '501 straight-leg jeans')
    outfit.shoes = getDetailedDescription('Adidas', 'Gazelle sneakers')
  }
  
  return outfit
}

/**
 * Get detailed description of a branded item
 * Matches exact format from production prompts
 */
export function getDetailedDescription(brand: string, item: string): string {
  // Find item in collections
  const allCollections = { ...ATHLETIC_BRANDS, ...ACCESSIBLE_BRANDS, ...LUXURY_BRANDS }
  
  for (const collectionKey in allCollections) {
    const collection = allCollections[collectionKey]
    const brandItem = collection.find(
      bi => bi.brand === brand && bi.name.toLowerCase().includes(item.toLowerCase())
    )
    
    if (brandItem) {
      let description = `${brandItem.brand} ${brandItem.name}`
      
      // Special formatting for specific items to match production prompts
      const itemLower = brandItem.name.toLowerCase()
      
      // Leggings: "in matching black" instead of "in black" (production format)
      if (itemLower.includes('leggings') && brandItem.colors && brandItem.colors.includes('black')) {
        description += ' in matching black'
        // Add details after color for leggings
        if (brandItem.details && brandItem.details.length > 0) {
          const detail = brandItem.details[0]
          description += ` with ${detail}`
        }
        return description
      }
      // Gazelle sneakers: specify color like "in burgundy suede"
      else if (itemLower.includes('gazelle') && brandItem.colors && brandItem.colors.length > 0) {
        // Prefer burgundy suede for casual, but can use others
        const preferredColor = brandItem.colors.find(c => c.includes('burgundy')) || brandItem.colors[0]
        description += ` in ${preferredColor}`
      }
      // UGG slippers: "in chestnut with shearling lining"
      else if (itemLower.includes('tasman') && brandItem.colors && brandItem.details) {
        const color = brandItem.colors[0]
        const detail = brandItem.details[0]
        description += ` in ${color} with ${detail}`
      }
      // The Row coat: "in beige" or "in black"
      else if (itemLower.includes('coat') && brandItem.brand === 'The Row' && brandItem.colors && brandItem.colors.length > 0) {
        const color = brandItem.colors[0] // Prefer beige for quiet luxury
        description += ` in ${color}`
      }
      // Standard formatting: color first, then details
      else {
        // Add colors if available
        if (brandItem.colors && brandItem.colors.length > 0) {
          const color = brandItem.colors[0]
          description += ` in ${color}`
        }
        
        // Add details if available
        if (brandItem.details && brandItem.details.length > 0) {
          const detail = brandItem.details[0]
          description += ` with ${detail}`
        }
      }
      
      // Add variants if available (usually in parentheses)
      if (brandItem.variants && brandItem.variants.length > 0) {
        const variant = brandItem.variants[0]
        description += ` (${variant})`
      }
      
      return description
    }
  }

  // Fallback: return brand + item name
  return `${brand} ${item}`
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getBrandCollection(brandKey: string): BrandItem[] | null {
  const allCollections = { ...ATHLETIC_BRANDS, ...ACCESSIBLE_BRANDS, ...LUXURY_BRANDS }
  return allCollections[brandKey] || null
}

/**
 * Get unbranded item description
 */
export function getUnbrandedItem(itemType: string): string | null {
  const itemLower = itemType.toLowerCase()
  
  for (const category in UNBRANDED_ITEMS) {
    if (itemLower.includes(category) || category.includes(itemLower)) {
      const items = UNBRANDED_ITEMS[category]
      return items[0] // Return first option
    }
  }

  // Check specific mappings
  if (itemLower.includes('sneaker') || itemLower.includes('shoes')) {
    return 'white sneakers'
  }
  if (itemLower.includes('cap') || itemLower.includes('hat')) {
    return 'black baseball cap'
  }
  if (itemLower.includes('sweater')) {
    return 'oversized cream sweater'
  }
  if (itemLower.includes('jacket')) {
    return 'black leather jacket'
  }
  if (itemLower.includes('tank')) {
    return 'white ribbed tank'
  }

  return null
}

/**
 * Check if luxury items are allowed in this outfit context
 */
export function canAddLuxuryPiece(outfitContext: OutfitContext, existingLuxuryCount: number = 0): boolean {
  // Max 1-2 luxury pieces per outfit
  if (existingLuxuryCount >= 2) {
    return false
  }

  // Travel/airport can have luxury luggage
  if (outfitContext.category === 'travel' || outfitContext.category === 'airport') {
    return existingLuxuryCount < 1 // Usually just luggage
  }

  // Most categories allow 1 luxury piece (usually the bag)
  return existingLuxuryCount < 1
}












