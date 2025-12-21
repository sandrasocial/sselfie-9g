/**
 * Pro Mode Prompt Builder
 * 
 * Builds sophisticated 250-500 word prompts for Studio Pro Mode.
 * Uses real brand names, professional photography language, and specific sections.
 */

import { PRO_MODE_CATEGORIES, getCategoryByKey, ImageLibrary } from './category-system'
import { selectMixedBrands } from './prompt-architecture'
import {
  buildChristmasSetting,
  buildChristmasOutfit,
  buildNewYearsSetting,
  detectSeasonalContent,
  CHRISTMAS_INTERIORS,
  CHRISTMAS_OUTFITS,
  CHRISTMAS_DECOR,
  NEW_YEARS_CONTENT,
  SEASONAL_POSES,
  SEASONAL_PHOTOGRAPHY,
  SEASONAL_MOOD,
} from './seasonal-luxury-content'
import {
  PhotographyStyle,
  detectPhotographyStyle,
  buildSettingForStyle,
  buildLightingForStyle,
  buildCameraForStyle,
  buildMoodForStyle,
} from './photography-styles'
import {
  FramingType,
  CameraAngle,
  CameraPosition,
  CompositionRule,
  buildCameraComposition,
  detectFramingPreference,
  detectAnglePreference,
  detectCompositionPreference,
  selectCompositionForConcept,
} from './camera-composition'
import {
  buildSmartSetting,
  getSettingDetailLevel,
} from './smart-setting-builder'

export interface ConceptComponents {
  title: string
  description: string
  category: string
  aesthetic?: string
  outfit?: string | {
    top?: string
    bottom?: string
    outerwear?: string
    accessories?: string[]
    shoes?: string
  }
  pose?: string
  lighting?: string
  setting?: string
  mood?: string
  brandReferences?: string[]
}

/**
 * COORDINATED SCENE EXTRACTION
 * 
 * Extract ALL scene elements ONCE from description
 * Then build consistent, non-duplicating sections
 */
export interface SceneElements {
  // Core elements
  action: string          // What they're doing: "standing at kitchen island preparing breakfast"
  posture: string         // Body position: "standing", "sitting", "kneeling"
  activity: string        // Specific activity: "preparing breakfast", "decorating tree"
  location: string        // Where: "kitchen", "living room", "bedroom"
  locationDetails: string // Specific location details: "marble kitchen island", "tufted sofa"
  
  // Scene details
  outfit: string          // What they're wearing
  outfitBrands: string[]  // Brand names
  mood: string            // Expression/feeling: "warm smile", "laughing joyfully"
  lighting: string        // Light description
  props: string[]         // Specific items: "ceramic mug", "bowl of ornaments"
  decor: string[]         // Decorations: "garland", "Christmas tree"
  
  // Context
  timeOfDay: string       // "morning", "evening", "afternoon"
  season: string          // "Christmas", "summer", etc.
  vibe: string            // Overall aesthetic
}

/**
 * Extract complete scene from description
 * This is called ONCE, then all sections use the same data
 * CRITICAL: This prevents contradictions between sections
 */
function extractCompleteScene(description: string): SceneElements {
  
  console.log('[extractCompleteScene] Extracting from:', description.substring(0, 200))
  
  // Initialize empty scene
  const scene: SceneElements = {
    action: '',
    posture: '',
    activity: '',
    location: '',
    locationDetails: '',
    outfit: '',
    outfitBrands: [],
    mood: '',
    lighting: '',
    props: [],
    decor: [],
    timeOfDay: '',
    season: '',
    vibe: ''
  }
  
  if (!description || description.length < 30) {
    return scene
  }
  
  // ============================================
  // EXTRACT POSTURE (standing, sitting, etc.)
  // ============================================
  
  const posturePatterns = [
    /\b(standing|sitting|seated|kneeling|lying|leaning|walking|reaching|relaxed)\b/i
  ]
  
  for (const pattern of posturePatterns) {
    const match = description.match(pattern)
    if (match && match[1]) {
      scene.posture = match[1].toLowerCase()
      break
    }
  }
  
  // ============================================
  // EXTRACT LOCATION
  // ============================================
  
  const locationPatterns = [
    // Specific location with descriptor (e.g., "marble kitchen island")
    /((?:marble|granite|wooden|modern|bright|cozy|elegant|tufted|serene)\s+(?:kitchen island|kitchen counter|dining table|sofa|couch|bed|bathroom vanity|vanity|mirror))/i,
    // Room type with descriptors
    /((?:bright|modern|cozy|elegant|luxury|spacious|minimal|warm|sleek|sophisticated|intimate|festive|holiday)\s+(?:kitchen|living room|bedroom|bathroom|dining room|market|boutique|hotel|restaurant|cafe))/i,
    // Simple room type
    /(?:in|at|on)\s+(kitchen|living room|bedroom|bathroom|dining room|market|boutique|hotel|restaurant|cafe)/i,
    // Furniture
    /(sofa|couch|bed|table|counter|island|vanity|bench|mirror)/i
  ]
  
  for (const pattern of locationPatterns) {
    const match = description.match(pattern)
    if (match && match[1]) {
      const extracted = match[1].toLowerCase()
      
      // Determine room type
      if (/kitchen/i.test(extracted)) {
        scene.location = 'kitchen'
        scene.locationDetails = extracted
      } else if (/living room|sofa|couch/i.test(extracted)) {
        scene.location = 'living room'
        scene.locationDetails = extracted
      } else if (/bedroom|bed/i.test(extracted)) {
        scene.location = 'bedroom'
        scene.locationDetails = extracted
      } else if (/bathroom|vanity/i.test(extracted)) {
        scene.location = 'bathroom'
        scene.locationDetails = extracted
      } else if (/dining|table/i.test(extracted)) {
        scene.location = 'dining room'
        scene.locationDetails = extracted
      } else {
        scene.locationDetails = extracted
      }
      
      break
    }
  }
  
  // ============================================
  // EXTRACT ACTIVITY
  // ============================================
  
  const activityPatterns = [
    /(preparing\s+[^,\.]{5,40})/i,
    /(holding\s+[^,\.]{5,40})/i,
    /(reaching for\s+[^,\.]{5,40})/i,
    /(reaching\s+[^,\.]{5,40})/i,
    /(looking\s+(?:over|at|toward)[^,\.]{5,40})/i,
    /(decorating\s+[^,\.]{5,40})/i,
    /(arranging\s+[^,\.]{5,40})/i,
    /(reading\s+[^,\.]{0,40})/i,
    /(adjusting\s+[^,\.]{5,40})/i,
    /(applying\s+[^,\.]{5,40})/i,
  ]
  
  for (const pattern of activityPatterns) {
    const match = description.match(pattern)
    if (match && match[1]) {
      scene.activity = match[1].trim()
      break
    }
  }
  
  // ============================================
  // BUILD COMPLETE ACTION
  // ============================================
  
  // Combine posture + location + activity
  const actionParts: string[] = []
  if (scene.posture) actionParts.push(scene.posture)
  if (scene.locationDetails) actionParts.push(`at ${scene.locationDetails}`)
  if (scene.activity) actionParts.push(scene.activity)
  
  if (actionParts.length > 0) {
    scene.action = actionParts.join(' ')
  }
  
  // ============================================
  // EXTRACT OUTFIT
  // ============================================
  
  // Multiple patterns to catch different ways outfits are described
  const outfitPatterns = [
    // Pattern 1: "wearing [outfit details]" - most common
    /wearing\s+([^,\.]{15,200}?)(?:\s*,\s*(?:standing|sitting|with|looking|in|at|one hand|both hands|preparing|holding|adjusting)|[.,]|$)/i,
    // Pattern 2: "in [outfit]" for dresses/sets
    /\bin\s+((?:[a-z][^,\.]{10,150}?(?:dress|sweater|shirt|blouse|pants|jeans|skirt|coat|jacket|blazer|pajama|set|outfit)))(?=\s*,\s*|[.,]|$)/i,
    // Pattern 3: "dressed in [outfit]"
    /dressed\s+in\s+([^,\.]{15,200}?)(?:\s*,\s*|[.,]|$)/i,
    // Pattern 4: "styled in [outfit]"
    /styled\s+in\s+([^,\.]{15,200}?)(?:\s*,\s*|[.,]|$)/i,
  ]
  
  for (const pattern of outfitPatterns) {
    const match = description.match(pattern)
    if (match && match[1]) {
      let extractedOutfit = match[1].trim()
      
      // Stop at pose/action keywords
      extractedOutfit = extractedOutfit.replace(/,\s*(?:standing|sitting|with|looking|in|at|one hand|both hands|preparing|holding|adjusting|reaching|decorating).*$/i, '')
      
      // Validate it's actually clothing, not setting
      const settingKeywords = ['room', 'fireplace', 'tree', 'living', 'bedroom', 'kitchen', 'studio', 'sofa', 'couch', 'marble', 'countertop']
      const outfitLower = extractedOutfit.toLowerCase()
      const hasSettingKeywords = settingKeywords.some(kw => outfitLower.includes(kw))
      
      // Validate it contains clothing words or brand names
      const clothingWords = /\b(dress|sweater|shirt|blouse|pants|jeans|denim|skirt|coat|jacket|blazer|top|bottom|outerwear|shoes|heels|sneakers|boots|bag|clutch|necklace|jewelry|accessories|pajama|set|robe|tie|loosely tied)\b/i
      const hasClothingWords = clothingWords.test(extractedOutfit)
      
      if (!hasSettingKeywords && (hasClothingWords || extractedOutfit.length > 30)) {
        scene.outfit = extractedOutfit
        console.log('[extractCompleteScene] ✅ Extracted outfit:', scene.outfit.substring(0, 100))
        break
      }
    }
  }
  
  // Extract brands
  const brandPattern = /\b(Reformation|Alo|Lululemon|Set Active|Sleeper|Toteme|Khaite|The Row|Bottega Veneta|Chanel|Dior|Hermès|Jenni Kayne|Everlane|Mango|Zara|COS|Eberjey|Gianvito Rossi|Van Cleef|Bottega|Hermes)\b/gi
  const brandMatches = description.match(brandPattern)
  if (brandMatches) {
    scene.outfitBrands = Array.from(new Set(brandMatches.map(b => b.charAt(0).toUpperCase() + b.slice(1))))
  }
  
  // ============================================
  // EXTRACT MOOD/EXPRESSION
  // ============================================
  
  const moodPatterns = [
    /((?:laughing|smiling|looking)\s+(?:joyfully|warmly|peacefully|confidently|over shoulder)[^,\.]{0,40})/i,
    /(warm smile)/i,
    /(natural expression)/i,
    /(joyful)/i,
    /(peaceful)/i,
  ]
  
  for (const pattern of moodPatterns) {
    const match = description.match(pattern)
    if (match && match[1]) {
      scene.mood = match[1].trim()
      break
    }
  }
  
  // ============================================
  // EXTRACT LIGHTING
  // ============================================
  
  const lightingMatch = description.match(/((?:soft|natural|warm|bright|ambient|morning|evening|streaming|filtering)\s+(?:light|lighting|glow|sunlight|daylight)[^,\.]{0,80})/i)
  if (lightingMatch && lightingMatch[1]) {
    scene.lighting = lightingMatch[1].trim()
  }
  
  // ============================================
  // EXTRACT PROPS & DECOR (CATEGORY-AGNOSTIC)
  // ============================================
  
  // Universal approach: Extract ANY descriptive phrases that mention objects, items, or decorative elements
  // This works for ALL categories: lifestyle, fashion, beauty, wellness, travel, luxury, holiday, etc.
  
  // Pattern 1: Extract phrases with "with", "and", "on", "in", "scattered", "arranged", etc.
  // These indicate props/decor items being described
  const descriptivePhrasePatterns = [
    // Phrases with "with" (e.g., "tray with croissants", "bag with items")
    /\b[^,\.]{0,50}?\bwith\s+[^,\.]{5,70}/gi,
    
    // Phrases with "arranged", "scattered", "draped", "placed", "stacked"
    /\b[^,\.]{0,40}?\b(?:arranged|scattered|draped|placed|stacked|arranged on|scattered on|draped over|placed on)\s+[^,\.]{5,70}/gi,
    
    // Phrases with "wrapped", "tied", "decorated"
    /\b[^,\.]{0,40}?\b(?:wrapped|tied|decorated|adorned)\s+(?:in|with|on)?\s+[^,\.]{5,70}/gi,
    
    // Phrases describing items "on" surfaces (e.g., "berries on tray", "presents on bed")
    /\b[^,\.]{0,30}?\bon\s+(?:crisp|white|cream|luxury|vintage|elegant)?\s*[^,\.]{5,60}(?:bedding|bed|table|tray|counter|surface|floor|shelf|desk|vanity)/gi,
    
    // Phrases with "in" containers/materials (e.g., "wrapped in paper", "in cream box")
    /\b[^,\.]{0,30}?\bin\s+(?:cream|white|luxury|vintage|elegant|silk|brass|marble|wooden)?\s*[^,\.]{5,60}(?:paper|box|bag|basket|container|wrapping)/gi,
  ]
  
  // Extract common prop/decor keywords to identify relevant phrases
  // COMPREHENSIVE LIST: Works for ALL categories (lifestyle, fashion, beauty, wellness, travel, luxury, holiday, etc.)
  const propDecorKeywords = [
    // Food & dining
    'tray', 'breakfast', 'croissants', 'berries', 'fruit', 'coffee', 'mug', 'cup', 'bowl', 'plate', 'pastries', 'food', 'dishes', 'utensils', 'glassware',
    
    // Gift wrapping & packaging
    'presents', 'gifts', 'gift boxes', 'wrapping papers', 'ribbon', 'scissors', 'boxes', 'packaging', 'wrapping', 'tissue', 'bags',
    
    // Home & decor items
    'bedding', 'pillows', 'throws', 'blankets', 'cushions', 'tapestry', 'curtains', 'rugs', 'artwork', 'frames', 'vases', 'lamps', 'mirrors', 'tables', 'chairs',
    
    // Decorative elements
    'garland', 'ornaments', 'decorations', 'wreaths', 'candles', 'flowers', 'plants', 'eucalyptus', 'sprigs', 'branches', 'leaves', 'greenery',
    
    // Lifestyle props
    'books', 'magazines', 'notebooks', 'pens', 'accessories', 'jewelry', 'bags', 'shoes', 'sunglasses', 'hats', 'scarves', 'keys', 'phone', 'wallet',
    
    // Beauty & wellness
    'skincare', 'products', 'bottles', 'jars', 'brushes', 'tools', 'towels', 'robes', 'mirrors', 'makeup', 'serums', 'creams', 'oils', 'masks',
    
    // Travel & luxury
    'luggage', 'suitcases', 'passports', 'tickets', 'maps', 'cameras', 'watches', 'perfumes', 'travel bags', 'carry-ons', 'journals', 'itineraries',
    
    // Textiles & materials (contextual - when mentioned as props/decor, not outfits)
    'silk', 'linen', 'cashmere', 'velvet', 'cotton', 'wool', 'leather', 'brass', 'marble', 'wood', 'ceramic', 'glass', 'metal', 'stone',
    
    // Additional common items
    'trays', 'baskets', 'containers', 'organizers', 'displays', 'surfaces', 'counters', 'shelves', 'racks', 'stands', 'holders',
    
    // Seasonal/holiday (but works for any seasonal context)
    'stockings', 'ornaments', 'lights', 'tree', 'decor', 'touches', 'accents', 'details', 'elements',
  ]
  
  // Build regex pattern for keywords (separate patterns for .test() vs .match() to avoid lastIndex issues)
  const keywordsPatternForTest = new RegExp(`\\b(${propDecorKeywords.join('|')})\\b`, 'i') // No 'g' flag for .test()
  const keywordsPatternForMatch = new RegExp(`\\b(${propDecorKeywords.join('|')})\\b`, 'gi') // 'g' flag for .match()
  
  // Extract all descriptive phrases
  const allDescriptivePhrases: string[] = []
  for (const pattern of descriptivePhrasePatterns) {
    const matches = description.match(pattern)
    if (matches) {
      allDescriptivePhrases.push(...matches.map(m => m.trim()))
    }
  }
  
  // Filter phrases that contain prop/decor keywords
  for (const phrase of allDescriptivePhrases) {
    if (keywordsPatternForTest.test(phrase)) {
      // Determine if it's a prop or decor based on keywords and context
      const lowerPhrase = phrase.toLowerCase()
      
      // Decor items (decorations, aesthetic elements)
      if (/\b(garland|ornaments?|decorations?|wreaths?|candles?|flowers?|plants?|artwork|frames?|tapestry|curtains?)\b/i.test(phrase) ||
          /\bdecorated|adorned|festive|holiday|christmas\b/i.test(phrase)) {
        scene.decor.push(phrase)
      } 
      // Props (functional items, objects)
      else {
        scene.props.push(phrase)
      }
    }
  }
  
  // Also extract standalone items mentioned in the description
  const standaloneItems = description.match(keywordsPatternForMatch)
  if (standaloneItems) {
    for (const item of standaloneItems) {
      const itemLower = item.toLowerCase()
      // Add context if available (look for adjectives before the item)
      const itemContext = description.match(new RegExp(`([^,\.]{0,40}\\b${item}\\b[^,\.]{0,30})`, 'i'))
      if (itemContext && itemContext[0].split(' ').length >= 3) {
        // Use the full phrase if it's descriptive enough
        if (/\b(garland|ornaments?|decorations?|wreaths?|candles?|flowers?)\b/i.test(itemContext[0])) {
          scene.decor.push(itemContext[0].trim())
        } else {
          scene.props.push(itemContext[0].trim())
        }
      } else {
        // Just add the standalone item
        if (/\b(garland|ornaments?|decorations?|wreaths?|candles?|flowers?)\b/i.test(item)) {
          scene.decor.push(item)
        } else {
          scene.props.push(item)
        }
      }
    }
  }
  
  // Additional extraction: Catch any remaining descriptive phrases
  // This is a catch-all for phrases that describe items in detail
  const catchAllPhrasePattern = /([^,\.]{15,120}?\b(?:with|and|on|in|arranged|scattered|draped|wrapped|tied|placed|stacked|decorated|adorned)\s+[^,\.]{5,80})/gi
  
  const catchAllMatches = description.match(catchAllPhrasePattern)
  if (catchAllMatches) {
    for (const phrase of catchAllMatches) {
      const trimmedPhrase = phrase.trim()
      // Only add if it contains prop/decor keywords and isn't already captured
      if (keywordsPatternForTest.test(trimmedPhrase)) {
        const lowerPhrase = trimmedPhrase.toLowerCase()
        // Skip if it's about outfit/wearing (those are handled separately)
        if (!/\bwearing|outfit|dressed|in\s+(?:a|an|the)\s+(?:dress|sweater|shirt|pants|jeans|skirt)\b/i.test(lowerPhrase)) {
          if (/\b(garland|ornaments?|decorations?|wreaths?|candles?|flowers?|plants?|artwork)\b/i.test(trimmedPhrase)) {
            scene.decor.push(trimmedPhrase)
          } else {
            scene.props.push(trimmedPhrase)
          }
        }
      }
    }
  }
  
  // Remove duplicates and empty strings, keep longer/more descriptive phrases
  const dedupeProps = new Map<string, string>()
  scene.props.forEach(p => {
    const key = p.toLowerCase()
    // Prefer longer, more descriptive phrases
    if (!dedupeProps.has(key) || dedupeProps.get(key)!.length < p.length) {
      dedupeProps.set(key, p)
    }
  })
  scene.props = Array.from(dedupeProps.values()).filter(p => p.length > 0)
  
  const dedupeDecor = new Map<string, string>()
  scene.decor.forEach(d => {
    const key = d.toLowerCase()
    if (!dedupeDecor.has(key) || dedupeDecor.get(key)!.length < d.length) {
      dedupeDecor.set(key, d)
    }
  })
  scene.decor = Array.from(dedupeDecor.values()).filter(d => d.length > 0)
  
  console.log('[extractCompleteScene] Extracted props:', scene.props)
  console.log('[extractCompleteScene] Extracted decor:', scene.decor)
  
  // ============================================
  // EXTRACT TIME & SEASON
  // ============================================
  
  if (/morning/i.test(description)) scene.timeOfDay = 'morning'
  if (/evening/i.test(description)) scene.timeOfDay = 'evening'
  if (/afternoon/i.test(description)) scene.timeOfDay = 'afternoon'
  
  if (/christmas|holiday/i.test(description)) scene.season = 'Christmas'
  
  // ============================================
  // EXTRACT VIBE
  // ============================================
  
  if (/cozy/i.test(description)) scene.vibe = 'cozy'
  if (/elegant/i.test(description)) scene.vibe = 'elegant'
  if (/luxury/i.test(description)) scene.vibe = 'luxury'
  
  console.log('[extractCompleteScene] Extracted:', {
    action: scene.action,
    location: scene.location,
    locationDetails: scene.locationDetails,
    mood: scene.mood,
    propsCount: scene.props.length,
    decorCount: scene.decor.length
  })
  
  return scene
}

/**
 * Build pose section from extracted scene
 * CRITICAL: Don't duplicate what's in setting section
 */
function buildPoseSectionFromScene(scene: SceneElements): string {
  
  // If we have a complete action, use it
  if (scene.action && scene.action.length > 10) {
    // Clean up: Don't include full location details in pose if they'll be in setting
    // Keep the posture and activity, location details go to setting
    let pose = scene.posture || ''
    
    // Add activity if available
    if (scene.activity) {
      if (pose) {
        pose = `${pose}, ${scene.activity}`
      } else {
        pose = scene.activity
      }
    }
    
    // Add mood if available
    if (scene.mood) {
      pose = `${pose}, ${scene.mood}`
    }
    
    // Capitalize
    if (pose) {
      pose = pose.charAt(0).toUpperCase() + pose.slice(1)
      return `Pose: ${pose}, natural and authentic moment.`
    }
  }
  
  // Fallback: Build from components
  let pose = scene.posture || 'natural pose'
  
  if (scene.activity) {
    pose = `${pose}, ${scene.activity}`
  }
  
  if (scene.mood) {
    pose = `${pose}, ${scene.mood}`
  }
  
  pose = pose.charAt(0).toUpperCase() + pose.slice(1)
  
  return `Pose: ${pose}, authentic moment.`
}

/**
 * Build setting section from extracted scene
 * CRITICAL: Include ALL props and decor from Maya's description
 * Don't duplicate what's in pose section
 */
function buildSettingSectionFromScene(scene: SceneElements): string {
  
  let setting = ''
  
  // Start with location details (this is the key - location goes in setting, not pose)
  if (scene.locationDetails) {
    setting = scene.locationDetails
  } else if (scene.location) {
    setting = scene.location
  }
  
  // Build comprehensive setting description with all props and decor
  // CRITICAL: Include ALL items from Maya's description, don't limit
  const settingDetails: string[] = []
  
  // Add decor first (decorations, aesthetic elements)
  if (scene.decor.length > 0) {
    // Include all decor items (no arbitrary limit)
    // Prefer longer, more descriptive phrases
    const decorItems = scene.decor
      .sort((a, b) => b.length - a.length) // Longer phrases first
      .slice(0, 10) // Limit to top 10 to avoid overwhelming, but include more
    const decorList = decorItems.join(', ')
    settingDetails.push(`decorated with ${decorList}`)
  }
  
  // Add props (items, objects, accessories)
  // Filter out props that are mentioned in the activity/pose (to avoid duplication)
  const propsNotInPose = scene.props.filter(prop => {
    const activityLower = (scene.activity || '').toLowerCase()
    const propLower = prop.toLowerCase()
    // Don't include props that are explicitly part of the action
    if (activityLower && (activityLower.includes(propLower) || activityLower.includes(propLower.split(' ')[0]))) {
      return false
    }
    return true
  })
  
  if (propsNotInPose.length > 0) {
    // Group props intelligently (prefer detailed phrases over single words)
    const detailedProps = propsNotInPose.filter(p => p.split(' ').length > 2)
    const simpleProps = propsNotInPose.filter(p => p.split(' ').length <= 2)
    
    // Include more props (up to 8 total: 5 detailed + 3 simple)
    const propsToInclude = [...detailedProps.slice(0, 5), ...simpleProps.slice(0, 3)]
      .filter(p => p.length > 0)
      .slice(0, 8) // More comprehensive
    
    if (propsToInclude.length > 0) {
      const propList = propsToInclude.join(', ')
      settingDetails.push(`${propList} arranged and visible`)
    }
  }
  
  // Combine location with details
  if (setting && settingDetails.length > 0) {
    // Join details with appropriate connectors
    setting = `${setting} ${settingDetails.join(', ')}`
  } else if (settingDetails.length > 0) {
    // No location but have details
    setting = `Scene ${settingDetails.join(', ')}`
  } else if (setting) {
    // Just location, no details
    // Keep as is
  }
  
  // Capitalize first letter
  if (setting) {
    setting = setting.charAt(0).toUpperCase() + setting.slice(1)
    
    // Clean up any double spaces or awkward punctuation
    setting = setting.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim()
    
    console.log('[buildSettingSectionFromScene] ✅ Built setting with props/decor:', setting.substring(0, 150))
    return `Setting: ${setting}.`
  }
  
  // Fallback
  console.log('[buildSettingSectionFromScene] ⚠️ No setting details found, using fallback')
  return 'Setting: Clean, modern interior with natural light.'
}

/**
 * Build mood section from extracted scene
 */
function buildMoodSectionFromScene(scene: SceneElements, concept: ConceptComponents, userRequest?: string): string {
  const moods: string[] = []
  
  if (scene.vibe) moods.push(scene.vibe)
  if (scene.mood) moods.push(scene.mood)
  if (concept.mood) moods.push(concept.mood)
  
  if (moods.length > 0) {
    const moodText = Array.from(new Set(moods)).join(', ')
    return `Mood: ${moodText}.`
  }
  
  // Fallback to existing logic if no scene mood
  return buildMoodSection(concept, userRequest)
}

/**
 * Build outfit section from extracted scene
 * CRITICAL: Prioritize outfit extracted from Maya's description
 */
function buildOutfitSectionFromScene(
  scene: SceneElements,
  concept: ConceptComponents,
  categoryInfo: { brands: string[]; name: string },
  userRequest?: string
): string {
  
  // PRIORITY 1: Use outfit from concept.outfit if explicitly provided (highest priority)
  if (concept.outfit) {
    if (typeof concept.outfit === 'string') {
      const settingKeywords = ['room', 'fireplace', 'tree', 'living', 'bedroom', 'kitchen', 'studio', 'backdrop', 'sofa', 'couch', 'armchair', 'flooring', 'floor', 'wall', 'window', 'shelves', 'art', 'vase', 'marble', 'oak', 'countertop', 'interior', 'outdoor', 'scene']
      const outfitLower = concept.outfit.toLowerCase()
      const hasSettingKeywords = settingKeywords.some(kw => outfitLower.includes(kw))
      
      if (!hasSettingKeywords && concept.outfit.length > 10) {
        console.log('[buildOutfitSectionFromScene] ✅ Using explicit concept.outfit:', concept.outfit.substring(0, 100))
        return `Outfit: ${concept.outfit}.`
      }
    } else {
      // concept.outfit is an object - let buildOutfitSection handle it
      console.log('[buildOutfitSectionFromScene] concept.outfit is object, delegating to buildOutfitSection')
      return buildOutfitSection(concept, categoryInfo, userRequest)
    }
  }
  
  // PRIORITY 2: Use outfit extracted from scene (Maya's description from extractCompleteScene)
  if (scene.outfit && scene.outfit.length > 10) {
    // Validate it's actually clothing, not setting details
    const settingKeywords = ['room', 'fireplace', 'tree', 'living', 'bedroom', 'kitchen', 'studio', 'backdrop', 'sofa', 'couch', 'armchair', 'flooring', 'floor', 'wall', 'window', 'shelves', 'art', 'vase', 'marble', 'oak', 'countertop', 'interior', 'outdoor', 'scene']
    const outfitLower = scene.outfit.toLowerCase()
    const hasSettingKeywords = settingKeywords.some(kw => outfitLower.includes(kw))
    
    if (!hasSettingKeywords) {
      // Valid outfit from scene - use it!
      let outfit = scene.outfit.trim()
      
      // Capitalize first letter
      outfit = outfit.charAt(0).toUpperCase() + outfit.slice(1)
      
      console.log('[buildOutfitSectionFromScene] ✅ Using outfit extracted from Maya\'s description:', outfit.substring(0, 100))
      return `Outfit: ${outfit}.`
    } else {
      console.log('[buildOutfitSectionFromScene] ⚠️ Scene outfit contains setting keywords, falling back to existing logic')
    }
  }
  
  // PRIORITY 3: Fall back to existing outfit building logic (handles brand mixing, category defaults, etc.)
  console.log('[buildOutfitSectionFromScene] No valid outfit found in scene or concept, using existing buildOutfitSection logic')
  return buildOutfitSection(concept, categoryInfo, userRequest)
}

/**
 * Build lighting section from extracted scene
 */
function buildLightingSectionFromScene(scene: SceneElements): string {
  
  if (scene.lighting) {
    // Add context if available
    let lighting = scene.lighting
    
    if (scene.timeOfDay && !lighting.toLowerCase().includes(scene.timeOfDay)) {
      lighting = `${scene.timeOfDay} ${lighting}`
    }
    
    // Add mood context
    if (scene.vibe && !lighting.toLowerCase().includes(scene.vibe)) {
      lighting = `${lighting} creating ${scene.vibe} atmosphere`
    }
    
    lighting = lighting.charAt(0).toUpperCase() + lighting.slice(1)
    
    return `Lighting: ${lighting}.`
  }
  
  // Fallback based on time of day
  if (scene.timeOfDay === 'morning') {
    return 'Lighting: Soft morning light with natural warmth.'
  }
  
  if (scene.timeOfDay === 'evening') {
    return 'Lighting: Warm evening light with cozy ambiance.'
  }
  
  return 'Lighting: Natural window lighting with soft quality.'
}

/**
 * Build complete Pro Mode prompt (250-500 words)
 * 
 * Structure:
 * - Professional photography introduction
 * - Outfit section (with real brand names)
 * - Pose section
 * - Lighting section
 * - Setting section
 * - Mood section
 * - Aesthetic description
 */
export async function buildProModePrompt(
  category: string | null,
  concept: ConceptComponents,
  userImages: ImageLibrary,
  userRequest?: string,
  userPhotographyStyle?: PhotographyStyle,
  conceptIndex?: number // NEW: Which concept (0-5) for variation
): Promise<{ fullPrompt: string; category: string }> {
  // 🔴 FIX: Use concept's category if provided, otherwise use category parameter, fallback to LIFESTYLE only for prompt builder compatibility
  // The concept's category comes from Maya's AI generation, so it's the most accurate
  const conceptCategory = (concept.category && typeof concept.category === 'string') ? concept.category.toUpperCase() : null
  const safeCategory = conceptCategory || (category && typeof category === 'string' ? category.toUpperCase() : 'LIFESTYLE')
  const categoryInfo = getCategoryByKey(safeCategory) || PRO_MODE_CATEGORIES.LIFESTYLE

  // 🔴 DEBUG: Log inputs
  console.log('[buildProModePrompt] Inputs:', {
    conceptTitle: concept.title?.substring(0, 50),
    conceptDescription: concept.description?.substring(0, 50),
    conceptCategory: concept.category,
    safeCategory,
    userRequest: userRequest?.substring(0, 50),
  })

  // 🔴 CRITICAL: Extract ALL details from concept description FIRST
  // The description should already contain outfit, setting, pose, lighting details
  // Only fall back to category defaults if description lacks specific details
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  const descriptionWordCount = descText.split(/\s+/).length
  const hasDetailedDescription = descriptionWordCount >= 50 && 
    /wearing|sitting|standing|in|with|holding|looking|outfit|attire|setting|room|interior|pose|lighting/i.test(descText)

  if (hasDetailedDescription) {
    console.log('[buildProModePrompt] ✅ Using detailed description directly (description has', descriptionWordCount, 'words)')
    // Use description as primary source for all sections
    // Extract outfit, pose, setting, lighting from description
  } else {
    console.log('[buildProModePrompt] ⚠️ Description lacks detail (', descriptionWordCount, 'words), using category defaults with description as context')
    // Fall back to category defaults, but use description as context
  }

  // Extract style/aesthetic keywords from userRequest to personalize the prompt
  const userRequestLower = (userRequest || '').toLowerCase()
  const isPinterestStyle = /pinterest|curated|aesthetic|dreamy|soft|feminine/i.test(userRequest || '')
  const isEditorialStyle = /editorial|fashion|sophisticated|refined/i.test(userRequest || '')
  const isLifestyleStyle = /lifestyle|casual|everyday|authentic|real/i.test(userRequest || '')
  const isLuxuryStyle = /luxury|elegant|chic|sophisticated|premium/i.test(userRequest || '')

  // ============================================
  // 🎯 DETERMINE PHOTOGRAPHY STYLE (DSLR vs iPhone)
  // ============================================

  // Strategy: Mix cameras across 6 concepts
  // - Concepts 0, 1, 2: Professional DSLR (editorial)
  // - Concepts 3, 4, 5: Authentic iPhone (authentic)

  let photographyStyle: PhotographyStyle

  console.log('[buildProModePrompt] Determining camera style...')
  console.log('[buildProModePrompt] conceptIndex:', conceptIndex)

  // PRIORITY 1: Use conceptIndex to enforce 3 DSLR + 3 iPhone mix
  if (conceptIndex !== undefined && conceptIndex >= 0) {
    if (conceptIndex < 3) {
      photographyStyle = 'editorial' // Professional DSLR for first 3 concepts
      console.log(`[buildProModePrompt] 📸 Concept #${conceptIndex + 1}: PROFESSIONAL DSLR (editorial)`)
    } else {
      photographyStyle = 'authentic' // Authentic iPhone for last 3 concepts
      console.log(`[buildProModePrompt] 📱 Concept #${conceptIndex + 1}: AUTHENTIC iPhone (authentic)`)
    }
  } 
  // PRIORITY 2: User explicitly specified photography style
  else if (userPhotographyStyle) {
    photographyStyle = userPhotographyStyle
    console.log('[buildProModePrompt] 👤 Using user-specified photography style:', userPhotographyStyle)
  }
  // PRIORITY 3: Detect from user request/description
  else {
    const combinedTextForStyle = `${concept.title || ''} ${concept.description || ''} ${userRequest || ''}`
    const detectedStyle = detectPhotographyStyle(combinedTextForStyle)
    
    if (detectedStyle) {
      photographyStyle = detectedStyle
      console.log('[buildProModePrompt] 🔍 Detected photography style from text:', detectedStyle)
    } else {
      // Default to authentic (iPhone) as last resort
      photographyStyle = 'authentic'
      console.log('[buildProModePrompt] ⚠️ No style detected, defaulting to authentic (iPhone)')
    }
  }

  console.log('[buildProModePrompt] ✅ Final photography style:', photographyStyle)

  // 🎯 Detect user preferences for composition
  const userFraming = detectFramingPreference(userRequest || '')
  const userAngle = detectAnglePreference(userRequest || '')
  const userComposition = detectCompositionPreference(userRequest || '')

  // Select composition for this concept (with variety across 6 concepts)
  const index = conceptIndex !== undefined ? conceptIndex : 0
  const cameraComp = selectCompositionForConcept(
    index,
    userFraming,
    userAngle,
    userComposition
  )

  console.log('[buildProModePrompt] Camera composition:', {
    conceptIndex: index,
    framing: cameraComp.framing,
    angle: cameraComp.angle,
    position: cameraComp.position,
    composition: cameraComp.composition,
  })

  // ============================================
  // 🔴 COORDINATED SCENE EXTRACTION
  // ============================================
  
  console.log('[buildProModePrompt] ========== STARTING COORDINATED BUILD ==========')
  console.log('[buildProModePrompt] Concept description:', concept.description?.substring(0, 200))
  
  // STEP 1: Extract complete scene ONCE to prevent contradictions
  const scene = extractCompleteScene(concept.description || '')
  
  console.log('[buildProModePrompt] Extracted scene:', {
    action: scene.action,
    location: scene.location,
    locationDetails: scene.locationDetails,
    mood: scene.mood,
    propsCount: scene.props.length,
    decorCount: scene.decor.length
  })
  
  // STEP 2: Build coordinated sections from extracted scene
  // Use scene-extracted outfit when available (from Maya's description)
  const outfitSection = buildOutfitSectionFromScene(scene, concept, categoryInfo, userRequest)
  
  // Use coordinated builders for pose, setting, lighting
  const poseSection = buildPoseSectionFromScene(scene)
  const fullSettingSection = buildSettingSectionFromScene(scene)
  const lightingSection = buildLightingSectionFromScene(scene)
  
  console.log('[buildProModePrompt] Built coordinated sections:')
  console.log('[buildProModePrompt]   Outfit:', outfitSection.substring(0, 80))
  console.log('[buildProModePrompt]   Pose:', poseSection.substring(0, 80))
  console.log('[buildProModePrompt]   Setting:', fullSettingSection.substring(0, 80))
  console.log('[buildProModePrompt]   Lighting:', lightingSection.substring(0, 80))
  
  // Use coordinated setting (no calibration needed - scene extraction handles it)
  const settingSection = fullSettingSection
  
  // Build mood from scene
  const moodSection = buildMoodSectionFromScene(scene, concept, userRequest)
  const aestheticSection = buildAestheticDescription(categoryInfo, concept, userRequest)

  // Build camera composition description
  const cameraDescription = buildCameraComposition(
    cameraComp.framing,
    cameraComp.angle,
    cameraComp.position,
    cameraComp.composition,
    photographyStyle
  )

  // 🔴 DEBUG: Log generated sections
  console.log('[buildProModePrompt] Generated sections:', {
    outfit: outfitSection.substring(0, 50),
    pose: poseSection.substring(0, 50),
    setting: settingSection.substring(0, 50),
  })

  // Determine camera specs - always use photography style (which is now determined by conceptIndex or user preference)
  // 🎯 Always use photography style function (photographyStyle is always set from conceptIndex, user preference, or default)
  // This ensures DSLR vs iPhone distinction is properly applied
  const cameraSpecs = buildCameraForStyle(photographyStyle)
  console.log('[buildProModePrompt] Using photography style camera specs:', cameraSpecs.substring(0, 100))

  const prompt = `Professional photography. ${isPinterestStyle ? 'Pinterest-style' : isEditorialStyle ? 'Editorial' : 'Influencer'} portrait. Reference images attached: use these reference images to maintain exactly the same physical characteristics, facial features, and body proportions as shown in the attached reference images. Editorial quality, professional photography aesthetic.

${outfitSection}

${poseSection}

${settingSection}

${lightingSection}

Camera Composition: ${cameraDescription}.

${moodSection}

Aesthetic: ${aestheticSection}

${cameraSpecs}`

  return {
    fullPrompt: prompt.trim(),
    category: safeCategory,
  }
}

/**
 * Build outfit section with real brand names
 * 
 * Uses category-specific brands and specific item descriptions.
 * NO generic "stylish outfit" - always specific brand items.
 * Personalizes based on userRequest when available.
 * Uses mixed-brand strategy: 1-2 accessible brands + 1 luxury accent max.
 */
function buildOutfitSection(
  concept: ConceptComponents,
  categoryInfo: { brands: string[]; name: string },
  userRequest?: string
): string {
  // 🔴 VALIDATION: Setting keywords to detect when outfit descriptions contain setting details
  const settingKeywords = ['room', 'fireplace', 'tree', 'living', 'bedroom', 'kitchen', 'studio', 'backdrop', 'sofa', 'couch', 'armchair', 'flooring', 'floor', 'wall', 'window', 'shelves', 'art', 'vase', 'marble', 'oak', 'countertop', 'interior', 'outdoor', 'scene', 'elegant living room', 'with fireplace']
  
  const category = (categoryInfo.name && typeof categoryInfo.name === 'string')
    ? categoryInfo.name.toLowerCase()
    : 'lifestyle'

  // If concept has specific outfit details, use them
  if (concept.outfit) {
    // 🔴 FIX 1.1: Handle case where outfit might be a string (from extraction/API)
    if (typeof concept.outfit === 'string') {
      const outfitLower = concept.outfit.toLowerCase()
      const hasSettingKeywords = settingKeywords.some(kw => outfitLower.includes(kw))
      
      if (hasSettingKeywords) {
        console.warn('[buildOutfitSection] ⚠️ Detected setting in outfit field (string), ignoring:', concept.outfit.substring(0, 80))
        // Skip broken outfit, build fresh one - fall through to outfit building below
      } else {
        // Valid outfit string - return it
        return `Outfit: ${concept.outfit}.`
      }
    }
    
    // 🔴 VALIDATION: Check each outfit part to ensure it's actually clothing, not setting
    // (outfit is an object with top, bottom, etc.)
    // Type guard: ensure outfit is an object, not a string
    if (typeof concept.outfit !== 'object' || concept.outfit === null) {
      // Not an object, skip to building outfit from other sources
      // This handles edge cases where outfit might be null or other types
    } else {
      const parts: string[] = []
      const invalidParts: string[] = []
      
      // Validate each outfit part individually
      if (concept.outfit.top) {
        const topLower = concept.outfit.top.toLowerCase()
        if (settingKeywords.some(kw => topLower.includes(kw))) {
          console.warn('[buildOutfitSection] ⚠️ Outfit.top contains setting keywords, skipping:', concept.outfit.top.substring(0, 60))
          invalidParts.push('top')
        } else {
          parts.push(concept.outfit.top)
        }
      }
      
      if (concept.outfit.bottom) {
        const bottomLower = concept.outfit.bottom.toLowerCase()
        if (settingKeywords.some(kw => bottomLower.includes(kw))) {
          console.warn('[buildOutfitSection] ⚠️ Outfit.bottom contains setting keywords, skipping:', concept.outfit.bottom.substring(0, 60))
          invalidParts.push('bottom')
        } else {
          parts.push(concept.outfit.bottom)
        }
      }
      
      if (concept.outfit.outerwear) {
        const outerwearLower = concept.outfit.outerwear.toLowerCase()
        if (settingKeywords.some(kw => outerwearLower.includes(kw))) {
          console.warn('[buildOutfitSection] ⚠️ Outfit.outerwear contains setting keywords, skipping:', concept.outfit.outerwear.substring(0, 60))
          invalidParts.push('outerwear')
        } else {
          parts.push(concept.outfit.outerwear)
        }
      }
      
      if (concept.outfit.accessories && concept.outfit.accessories.length > 0) {
        const accessoriesText = concept.outfit.accessories.join(', ')
        const accessoriesLower = accessoriesText.toLowerCase()
        if (settingKeywords.some(kw => accessoriesLower.includes(kw))) {
          console.warn('[buildOutfitSection] ⚠️ Outfit.accessories contains setting keywords, skipping')
          invalidParts.push('accessories')
        } else {
          parts.push(accessoriesText)
        }
      }
      
      if (concept.outfit.shoes) {
        const shoesLower = concept.outfit.shoes.toLowerCase()
        if (settingKeywords.some(kw => shoesLower.includes(kw))) {
          console.warn('[buildOutfitSection] ⚠️ Outfit.shoes contains setting keywords, skipping:', concept.outfit.shoes.substring(0, 60))
          invalidParts.push('shoes')
        } else {
          parts.push(concept.outfit.shoes)
        }
      }

      // If any part had invalid content (setting keywords), skip the entire outfit object
      // This ensures we don't mix valid clothing with invalid setting descriptions
      if (invalidParts.length > 0) {
        console.warn('[buildOutfitSection] ⚠️ Outfit object contained setting descriptions in:', invalidParts.join(', '), '- building fresh outfit instead')
        // Fall through to build proper outfit below
      } else if (parts.length > 0) {
        // All parts are valid clothing descriptions
        return `Outfit: ${parts.join(', ')}.`
      }
    }
  }

  // Extract context from all available sources
  const titleText = (concept.title && typeof concept.title === 'string') ? concept.title : ''
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  const aestheticText = (concept.aesthetic && typeof concept.aesthetic === 'string') ? concept.aesthetic : ''
  const requestText = userRequest || ''
  const combinedText = `${titleText} ${descText} ${aestheticText} ${requestText}`.toLowerCase()

  // 🔴 PRIORITY 1: Try to extract outfit from description FIRST (Maya's vision)
  // This ensures we use Maya's specific outfit details from her description
  // This MUST happen before seasonal/category defaults to preserve Maya's vision
  if (descText && descText.length > 30) {
    console.log('[buildOutfitSection] 🔍 Attempting to extract outfit from Maya\'s description (length:', descText.length, ')')
    // Multiple patterns to catch different ways outfits are described
    const outfitPatterns = [
      // Pattern 1: "wearing [outfit details]" - capture until pose action or sentence end
      // Example: "wearing Reformation slip dress in champagne silk, adjusting necklace"
      // Should capture: "Reformation slip dress in champagne silk"
      // Use non-greedy match with lookahead for pose actions
      /wearing\s+((?:(?!,\s*(?:adjusting|smoothing|holding|looking|standing|sitting|walking|one hand|both hands|touching|putting|before|in front of|beside))[^.,]){10,250}?)(?:\s*,\s*(?:adjusting|smoothing|holding|looking|standing|sitting|walking|one hand|both hands|touching|putting)|[.,]|$)/i,
      // Pattern 2: Simpler pattern - capture after "wearing" until comma+action or period
      /wearing\s+([^.,]{15,250}?)(?=\s*,\s*(?:adjusting|smoothing|holding|looking|one hand|both hands|touching|putting|standing|sitting|walking)|[.,]|$)/i,
      // Pattern 3: "in [outfit]" for dress/skirt (but not "in [room]")
      // Example: "in Reformation slip dress"
      /\bin\s+([a-z][^.,]{10,150}?(?:dress|sweater|shirt|blouse|pants|jeans|skirt|coat|jacket|blazer))(?=\s*,\s*|[.,]|$)/i,
      // Pattern 4: Explicit outfit mentions
      /(?:outfit|dressed in|styled in|attire)\s*:?\s*([^.]{15,200})/i,
    ]

    for (const outfitPattern of outfitPatterns) {
      const match = descText.match(outfitPattern)
      if (match && match[1] && match[1].length > 10) {
        let extractedOutfit = match[1].trim()
        
        // 🔴 CLEANUP: Stop at pose/action keywords that indicate we've moved to pose section
        // Stop at: "adjusting", "smoothing", "holding", "one hand", "both hands", pose verbs
        const poseActionPattern = /\s*,\s*\b(adjusting|smoothing|holding|touching|putting|standing|sitting|walking|looking|gazing|one hand|both hands)\b/i
        const poseMatch = extractedOutfit.match(poseActionPattern)
        if (poseMatch && poseMatch.index !== undefined) {
          extractedOutfit = extractedOutfit.substring(0, poseMatch.index).trim()
        }
        
        // Remove trailing commas and clean up
        extractedOutfit = extractedOutfit.replace(/[,\.\s]+$/, '').trim()
        
        // 🔴 FIX 1.1: VALIDATION - Make sure we're building CLOTHING, not setting
        const extractedOutfitLower = extractedOutfit.toLowerCase()
        const hasSettingKeywords = settingKeywords.some(kw => extractedOutfitLower.includes(kw))
        
        if (hasSettingKeywords) {
          console.warn('[buildOutfitSection] ⚠️ Detected setting in extracted outfit field, skipping:', extractedOutfit.substring(0, 80))
          continue // Try next pattern - don't use this broken outfit description
        }
        
        // Validate it contains actual clothing words or brand names (luxury brands count as clothing indicators)
        const clothingWords = /\b(dress|sweater|shirt|blouse|pants|jeans|denim|skirt|coat|jacket|blazer|top|bottom|outerwear|shoes|heels|sneakers|boots|bag|clutch|necklace|jewelry|accessories|Reformation|Jenni Kayne|Bottega Veneta|Van Cleef|Gianvito Rossi|The Row|Chanel|Dior)\b/i
        if (!clothingWords.test(extractedOutfit) && extractedOutfit.length < 50) {
          console.warn('[buildOutfitSection] ⚠️ Extracted text doesn\'t seem to be clothing, skipping:', extractedOutfit.substring(0, 80))
          continue // Try next pattern
        }
        
        // Valid outfit description - return it immediately (don't fall through to seasonal/category defaults)
        console.log('[buildOutfitSection] ✅ Extracted outfit from Maya\'s description:', extractedOutfit.substring(0, 100))
        return `Outfit: ${extractedOutfit}.`
      }
    }
    console.log('[buildOutfitSection] ⚠️ Could not extract outfit from description, falling back to seasonal/category defaults')
  }

  // 🎄 Check for seasonal outfits (only if description extraction failed)
  const seasonal = detectSeasonalContent(combinedText)
  
  if (seasonal.season === 'christmas' && seasonal.outfit) {
    console.log('[buildOutfitSection] ✅ Detected Christmas outfit request')
    
    const colorTheme = /red|burgundy/i.test(combinedText) ? 'burgundy' :
                       /traditional|classic/i.test(combinedText) ? 'holiday' : 'neutral'
    
    const christmasOutfit = buildChristmasOutfit(seasonal.outfit, colorTheme)
    return `Outfit: ${christmasOutfit}.`
  }
  
  if (seasonal.season === 'new-years') {
    console.log('[buildOutfitSection] ✅ Detected New Years outfit request')
    
    // New Years outfits from NEW_YEARS_CONTENT.OUTFITS
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
    
    if (seasonal.style === 'party') {
      const outfit = pick(NEW_YEARS_CONTENT.OUTFITS.PARTY_GLAMOUR)
      const accessories = pick(NEW_YEARS_CONTENT.OUTFITS.ACCESSORIES)
      return `Outfit: ${outfit}, ${accessories}.`
    } else {
      const outfit = pick(NEW_YEARS_CONTENT.OUTFITS.COZY_CELEBRATION)
      return `Outfit: ${outfit}.`
    }
  }

  // Detect theme from combined context
  const theme = detectThemeFromText(combinedText)
  
  // Select mixed brands dynamically (1-2 accessible + 1 luxury max)
  const { accessible, luxury } = selectMixedBrands(category, theme, userRequest)

  // Build outfit based on category and theme
  let outfitDescription = 'Outfit: '

  // WELLNESS/FITNESS
  if (category.includes('wellness') || category.includes('fitness') || theme.includes('workout')) {
    const accessibleBrand = accessible[0] || 'Alo Yoga'
    outfitDescription += `${accessibleBrand} high-waisted leggings in neutral tone, matching cropped sports bra, lightweight jacket`
    if (luxury) outfitDescription += `, ${luxury} minimal tote as subtle luxury accent`
    outfitDescription += ', athletic sneakers, minimal jewelry.'
  }
  // LUXURY
  else if (category.includes('luxury') || theme.includes('luxury')) {
    const luxuryBrand = luxury || 'The Row'
    outfitDescription += `${luxuryBrand} tailored blazer in neutral tone, silk camisole, wide-leg trousers`
    if (accessible.length > 0) outfitDescription += `, ${accessible[0]} minimal accessories`
    outfitDescription += ', pointed-toe pumps, understated jewelry.'
  }
  // LIFESTYLE
  else if (category.includes('lifestyle')) {
    // 🔴 FIX 1.3: Diversified knitwear (not always Jenni Kayne)
    const KNITWEAR_OPTIONS = [
      'oversized cashmere crewneck in cream (Jenni Kayne, Quince, Everlane)',
      'chunky cable knit sweater in oatmeal (& Other Stories, COS)',
      'ribbed turtleneck in black (Uniqlo, Wolford)',
      'cashmere v-neck in camel (Everlane, Naadam)',
      'oversized cardigan in grey (Toteme, Mango)',
      'cropped cashmere hoodie in taupe (Reformation, Zara)',
      'fine merino knit in ivory (COS, Arket)',
      'chunky turtleneck in charcoal (& Other Stories, Toteme)',
    ]
    const selectedKnitwear = KNITWEAR_OPTIONS[Math.floor(Math.random() * KNITWEAR_OPTIONS.length)]
    
    // 🔴 FIX 1.2: Baggy/wide-leg jeans (NOT skinny/fitted)
    const JEANS_OPTIONS = [
      'baggy straight-leg jeans in light wash',
      'wide-leg jeans in medium wash with relaxed fit',
      'relaxed straight denim in vintage blue',
      '90s-inspired baggy jeans in light wash',
      'barrel jeans in medium wash',
      'wide-leg denim with relaxed straight fit',
    ]
    const selectedJeans = JEANS_OPTIONS[Math.floor(Math.random() * JEANS_OPTIONS.length)]
    
    outfitDescription += `${selectedKnitwear}, ${selectedJeans}`
    if (luxury) outfitDescription += `, ${luxury} leather bag as luxury accent`
    else if (accessible[1]) outfitDescription += `, ${accessible[1]} crossbody bag`
    outfitDescription += ', white sneakers, minimal gold jewelry.'
  }
  // FASHION
  else if (category.includes('fashion')) {
    const accessibleBrand = accessible[0] || 'Reformation'
    outfitDescription += `${accessibleBrand} midi dress in neutral tone, oversized leather blazer`
    if (luxury) outfitDescription += `, ${luxury} structured bag as statement piece`
    outfitDescription += ', ankle boots, minimal accessories.'
  }
  // TRAVEL
  else if (category.includes('travel')) {
    outfitDescription += 'Oversized cream trench coat, black turtleneck, high-waisted trousers'
    if (luxury) outfitDescription += `, ${luxury} leather tote`
    else outfitDescription += ', Everlane leather tote'
    outfitDescription += ', comfortable loafers, minimal jewelry.'
  }
  // BEAUTY
  else if (category.includes('beauty')) {
    const beautyBrand = accessible[0] || 'Glossier'
    outfitDescription += `White ribbed tank top, ${beautyBrand} products visible, cream linen pants, natural makeup, glowing skin.`
  }
  // DEFAULT
  else {
    outfitDescription += 'Sophisticated neutral ensemble, tailored pieces'
    if (luxury) outfitDescription += `, ${luxury} as subtle luxury accent`
    outfitDescription += ', minimal accessories.'
  }

  return outfitDescription
}

// Helper function to detect theme from text
function detectThemeFromText(text: string): string {
  if (/christmas|holiday|festive|winter|cozy.*holiday/i.test(text)) return 'christmas'
  if (/beach|coastal|ocean|resort|tropical/i.test(text)) return 'beach'
  if (/workout|gym|fitness|athletic|yoga/i.test(text)) return 'workout'
  if (/luxury|elegant|chic|sophisticated|premium/i.test(text)) return 'luxury'
  if (/travel|airport|vacation|destination/i.test(text)) return 'travel'
  if (/casual|everyday|lifestyle|relatable/i.test(text)) return 'casual'
  return 'lifestyle'
}

/**
 * Build pose section from concept description
 * 
 * CRITICAL: Extract actual pose from AI-generated description
 * DO NOT use hardcoded templates that ignore the description
 * 
 * Natural, authentic poses - no "striking poses"
 * Personalizes based on userRequest when available.
 */
export function buildPoseSection(
  concept: ConceptComponents,
  userRequest?: string,
  settingSection?: string
): string {
  
  console.log('[buildPoseSection] Starting pose extraction')
  console.log('[buildPoseSection] Description:', concept.description?.substring(0, 200))
  
  // If concept already has explicit pose, use it
  if (concept.pose) {
    console.log('[buildPoseSection] Using explicit pose from concept')
    return `Pose: ${concept.pose}.`
  }

  const description = concept.description || ''
  
  // ============================================
  // STEP 1: Extract pose directly from description
  // ============================================
  
  if (description && description.length > 30) {
    
    // Pattern 1: Standing/Sitting/Relaxed + location/action
    const standingSittingPattern = /((?:standing|sitting|seated|kneeling|lying|leaning|walking|relaxed)\s+(?:in|at|on|before|near|beside|by|against)\s+[^,\.]{10,80}(?:,\s*(?:wearing|holding|with|preparing|looking|adjusting|touching|reaching|reading)[^,\.]{0,50})?)/i
    
    let match = description.match(standingSittingPattern)
    if (match && match[1]) {
      let extractedPose = match[1].trim()
      
      // Clean up: Stop before outfit details
      extractedPose = extractedPose.replace(/,?\s*wearing\s+(?:Eberjey|Alo|Lululemon|The Row|Toteme|Khaite|cashmere|silk|cotton|linen|velvet|satin).*$/i, '')
      
      // Stop at setting if it comes after action
      if (extractedPose.length > 100) {
        const settingMarkers = /,\s*(?:bright|modern|cozy|elegant|luxury|spacious|minimal|warm)\s+(?:kitchen|living room|bedroom|bathroom)/i
        const settingMatch = extractedPose.match(settingMarkers)
        if (settingMatch && settingMatch.index !== undefined) {
          extractedPose = extractedPose.substring(0, settingMatch.index)
        }
      }
      
      // Clean trailing punctuation
      extractedPose = extractedPose.replace(/[,\.]$/, '').trim()
      
      // Capitalize first letter
      extractedPose = extractedPose.charAt(0).toUpperCase() + extractedPose.slice(1)
      
      if (extractedPose.length >= 15 && extractedPose.length <= 150) {
        console.log('[buildPoseSection] ✅ Extracted pose from description:', extractedPose)
        return `Pose: ${extractedPose}, natural and authentic moment.`
      }
    }
    
    // Pattern 1.5: Preposition-starting descriptions (e.g., "In elegant marble bathroom")
    const prepositionPattern = /((?:in|at|on|by|near)\s+(?:[^,\.]{5,100}?)(?:\s+with|\s+applying|\s+before|\s+at)[^,\.]{0,50})/i
    
    match = description.match(prepositionPattern)
    if (match && match[1]) {
      let extractedPose = match[1].trim()
      
      // Check if there's a location detail after a comma (e.g., "applying skincare at vanity")
      const afterMatch = description.substring((match.index || 0) + match[0].length)
      const locationAfterComma = afterMatch.match(/,\s*(?:applying|at|by|near|before)\s+([^,\.]{5,50})/i)
      if (locationAfterComma && locationAfterComma[1]) {
        extractedPose += ', ' + locationAfterComma[1].trim()
      }
      
      // Clean trailing punctuation
      extractedPose = extractedPose.replace(/[,\.]$/, '').trim()
      
      // Capitalize first letter
      extractedPose = extractedPose.charAt(0).toUpperCase() + extractedPose.slice(1)
      
      if (extractedPose.length >= 15 && extractedPose.length <= 150) {
        console.log('[buildPoseSection] ✅ Extracted preposition pose from description:', extractedPose)
        return `Pose: ${extractedPose}, natural and authentic moment.`
      }
    }
    
    // Pattern 2: Action verb + object (including reading)
    const actionPattern = /((?:preparing|holding|adjusting|touching|looking at|reaching for|smoothing|pouring|mixing|stirring|arranging|setting|reading|applying)\s+[^,\.]{5,60})/i
    
    match = description.match(actionPattern)
    if (match && match[1]) {
      let extractedPose = match[1].trim()
      
      // Add context if available
      const contextPattern = /(?:in|at|on|near|beside)\s+([^,]{5,40})/i
      const contextMatch = description.match(contextPattern)
      if (contextMatch) {
        extractedPose = `${extractedPose}, ${contextMatch[0].trim()}`
      }
      
      // Capitalize and format
      extractedPose = extractedPose.charAt(0).toUpperCase() + extractedPose.slice(1)
      
      if (extractedPose.length >= 10 && extractedPose.length <= 120) {
        console.log('[buildPoseSection] ✅ Extracted action pose from description:', extractedPose)
        return `Pose: ${extractedPose}, authentic moment.`
      }
    }
    
    // Pattern 3: Posture/position details
    const posturePattern = /(with\s+(?:hands|arms|legs|back|head|body)\s+[^,\.]{5,60})/i
    
    match = description.match(posturePattern)
    if (match && match[1]) {
      const postureDetail = match[1].trim()
      console.log('[buildPoseSection] ✅ Extracted posture detail:', postureDetail)
      return `Pose: Natural, relaxed posture, ${postureDetail}.`
    }
  }
  
  // ============================================
  // STEP 2: Fallback - infer from keywords (NOT hardcoded scenes)
  // ============================================
  
  console.log('[buildPoseSection] ⚠️ No explicit pose found in description, using keyword inference')
  
  const combinedText = `${concept.title || ''} ${description} ${userRequest || ''}`.toLowerCase()
  
  // Infer general pose type from keywords (but keep generic, not specific scenes)
  if (/breakfast|coffee|tea|morning|drink/i.test(combinedText)) {
    if (/kitchen|counter|island/i.test(combinedText)) {
      return 'Pose: Standing at counter or kitchen island, natural breakfast moment.'
    } else if (/table|dining/i.test(combinedText)) {
      return 'Pose: Seated at table, comfortable morning moment.'
    }
    return 'Pose: Comfortable breakfast setting, natural and relaxed.'
  }
  
  if (/workout|fitness|yoga|exercise|athletic/i.test(combinedText)) {
    return 'Pose: Active fitness moment, natural movement and energy.'
  }
  
  if (/cozy|lounge|relax/i.test(combinedText)) {
    return 'Pose: Relaxed and comfortable, natural cozy moment.'
  }
  
  // Final fallback - neutral natural pose
  console.log('[buildPoseSection] Using neutral fallback pose')
  return 'Pose: Natural, relaxed posture, authentic moment.'
}

/**
 * Build lighting section
 * 
 * Realistic, authentic lighting - no "perfect lighting"
 * Personalizes based on userRequest when available.
 */
function buildLightingSection(
  concept: ConceptComponents, 
  userRequest?: string,
  poseSection?: string,
  settingSection?: string
): string {
  if (concept.lighting) {
    return `Lighting: ${concept.lighting}.`
  }

  // 🔴 COORDINATION: Check pose and setting to match lighting context
  const poseText = poseSection ? poseSection.toLowerCase() : ''
  const settingText = settingSection ? settingSection.toLowerCase() : ''
  
  // 🔴 CRITICAL: Extract lighting from description FIRST if it contains detailed lighting information
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  
  // Extract combinedText for later use
  const combinedText = `${concept.title || ''} ${concept.description || ''} ${userRequest || ''}`.toLowerCase()
  
  // 🔴 COORDINATION: If pose/setting mention market, use market lighting (check early)
  if ((/market|shopping|outdoor/i.test(poseText) || /market|shopping|outdoor/i.test(settingText)) && /christmas|holiday/i.test(combinedText)) {
    return 'Lighting: String lights overhead, wooden market stalls with evergreen garlands, warm golden hour light casting festive shadows, magical holiday market atmosphere.'
  }
  
  if (descText && descText.length > 30) {
    // Look for lighting patterns in description
    const lightingPatterns = [
      /(?:morning|evening|soft|warm|natural|ambient|twinkling|fireplace|glow|streaming).{0,50}(?:light|lighting|illumination|glow|sunlight|daylight)[^\.]{0,100}/i,
      /(?:light|lighting).{0,50}(?:streaming|filtering|glowing|shining|warm|soft|natural|morning|evening)[^\.]{0,100}/i,
    ]

    for (const pattern of lightingPatterns) {
      const match = descText.match(pattern)
      if (match && match[0] && match[0].length > 20) {
        let extractedLighting = match[0].trim()
        
        // 🔴 CLEANUP: Remove setting details that might have been captured
        // Stop at setting keywords if they appear
        const settingStopWords = /\b(market|stall|sofa|couch|room|fireplace|tree|living|bedroom|kitchen)\s+/i
        const settingMatch = extractedLighting.match(settingStopWords)
        if (settingMatch && settingMatch.index !== undefined && settingMatch.index > 50) {
          extractedLighting = extractedLighting.substring(0, settingMatch.index).trim()
        }
        
        // Extract a more complete sentence if possible, but only if it's about lighting
        const sentences = descText.split(/[\.!?]/)
        for (const sentence of sentences) {
          if (sentence.includes(match[0].substring(0, 20))) {
            if (sentence.length > 30 && sentence.length < 200 && /light|lighting|glow|illumination/i.test(sentence)) {
              // Check if sentence is primarily about lighting, not setting
              const lightingWords = (sentence.match(/\b(light|lighting|glow|illumination|bright|dark|shade|shadow|sun|daylight|ambient)\b/gi) || []).length
              const settingWords = (sentence.match(/\b(market|stall|sofa|room|fireplace|tree|table|chair)\b/gi) || []).length
              if (lightingWords >= settingWords) {
                console.log('[buildLightingSection] ✅ Extracted lighting from description:', sentence.substring(0, 80))
                return `Lighting: ${sentence.trim()}.`
              }
            }
          }
        }
        if (extractedLighting.length > 20 && extractedLighting.length < 200) {
          console.log('[buildLightingSection] ✅ Extracted lighting from description:', extractedLighting.substring(0, 80))
          return `Lighting: ${extractedLighting}.`
        }
      }
    }
  }

  // 🔴 CRITICAL: Use concept title/description and userRequest to infer lighting
  // This ensures prompts match Maya's vision from her chat response
  
  // Check for specific themes in concept/request (e.g., Christmas, holiday, cozy)
  if (/christmas|holiday|festive|winter|cozy.*holiday|holiday.*cozy/i.test(combinedText)) {
    if (/morning|coffee|breakfast/i.test(combinedText)) {
      return 'Lighting: Warm morning light streaming through windows, soft holiday glow, twinkling Christmas tree lights in background, cozy festive atmosphere.'
    } else if (/fireplace|evening|night/i.test(combinedText)) {
      return 'Lighting: Warm fireplace glow, twinkling Christmas tree lights, soft evening lighting, magical holiday atmosphere, cozy festive ambiance.'
    } else {
      return 'Lighting: Warm festive lighting, twinkling holiday lights, soft natural glow, magical Christmas atmosphere, cozy holiday ambiance.'
    }
  }

  // Realistic lighting options (only if no specific theme detected)
  const lightingOptions = [
    'Uneven natural lighting with mixed color temperatures',
    'Natural window light with shadows and slight unevenness',
    'Overcast daylight with natural shadows',
    'Ambient lighting with mixed sources',
    'Natural light with cool and warm mix',
  ]

  const randomLighting = lightingOptions[Math.floor(Math.random() * lightingOptions.length)]
  return `Lighting: ${randomLighting}.`
}

/**
 * Build setting section from concept description
 * 
 * CRITICAL: Extract actual setting from AI-generated description
 * DO NOT use hardcoded settings that ignore the description
 */
export function buildSettingSection(
  concept: ConceptComponents,
  userRequest?: string,
  poseSection?: string
): string {
  
  console.log('[buildSettingSection] Starting setting extraction')
  console.log('[buildSettingSection] Description:', concept.description?.substring(0, 200))
  
  // If concept already has explicit setting, use it
  if (concept.setting) {
    console.log('[buildSettingSection] Using explicit setting from concept')
    return `Setting: ${concept.setting}.`
  }

  const description = concept.description || ''
  
  // ============================================
  // STEP 1: Extract setting from description
  // ============================================
  
  if (description && description.length > 30) {
    
    // Pattern 1: Room type with descriptors (including materials like "marble bathroom")
    // Also includes optional "with" details (e.g., "bathroom with brass fixtures")
    const roomPattern = /((?:bright|modern|cozy|elegant|luxury|spacious|minimal|warm|sleek|sophisticated|intimate|festive|holiday)\s+(?:(?:marble|granite|wood|wooden|stone|brick|glass|concrete)\s+)?(?:kitchen|living room|bedroom|bathroom|dining room|dining table|office|studio|hotel room|restaurant|cafe|boutique|market|outdoor space|patio|terrace|sofa)(?:\s+with\s+[^,\.]{0,80})?[^,\.]{0,50})/i
    
    let match = description.match(roomPattern)
    if (match && match[1]) {
      let extractedSetting = match[1].trim()
      
      // Check if there are holiday details in the remaining part of description
      // Do this BEFORE cleanup so we can preserve them
      // Handle cases like "reading by Christmas tree" - look for "by Christmas tree" after any text
      const afterMatch = description.substring((match.index || 0) + match[0].length)
      const holidayDetailMatch = afterMatch.match(/(?:,\s*)?(?:[^,\.]*?\s+)?(?:by|with|featuring)\s+(?:christmas tree|garland|lights|ornaments|wreaths|stockings)/i)
      if (holidayDetailMatch) {
        // Extract just the holiday part (e.g., "by Christmas tree")
        const holidayPart = holidayDetailMatch[0].match(/(?:by|with|featuring)\s+(?:christmas tree|garland|lights|ornaments|wreaths|stockings)/i)
        if (holidayPart) {
          extractedSetting += ', ' + holidayPart[0].trim()
        }
      }
      
      // Clean up - stop before pose/action starts, but preserve holiday details
      // Split on pose actions, but keep anything before them if it contains holiday elements
      const poseActionPattern = /(?:,\s*)?(?:standing|sitting|wearing|preparing|holding|looking|reading|applying|adjusting|touching)/
      const poseActionMatch = extractedSetting.match(poseActionPattern)
      if (poseActionMatch && poseActionMatch.index !== undefined) {
        const beforeAction = extractedSetting.substring(0, poseActionMatch.index)
        // If before the action contains holiday elements, keep it; otherwise remove from action onwards
        if (!/(?:christmas|holiday|festive|tree|garland)/i.test(beforeAction)) {
          extractedSetting = beforeAction.trim()
        }
      }
      
      // Clean trailing punctuation
      extractedSetting = extractedSetting.replace(/[,\.]$/, '').trim()
      
      if (extractedSetting.length >= 15 && extractedSetting.length <= 150) {
        console.log('[buildSettingSection] ✅ Extracted setting from description:', extractedSetting)
        return `Setting: ${extractedSetting}.`
      }
    }
    
    // Pattern 2: "with" details (marble countertops, brass fixtures, festive decorations, etc.)
    // Check this AFTER Pattern 1 to catch "with" details that follow room descriptions
    const detailsPattern = /with\s+((?:(?:marble|granite|wood|wooden|stone|brick|glass|stainless steel|concrete|tile|brass|copper|gold|silver)\s+(?:countertops?|floors?|tables?|walls?|surfaces?|fixtures?|accents?|hardware)|festive\s+decorations?|soft\s+throw\s+blanket?|christmas\s+tree)[^,\.]{0,80})/i
    
    match = description.match(detailsPattern)
    if (match && match[1]) {
      let details = match[1].trim()
      
      // Try to get room type before this
      const beforeDetails = description.substring(0, match.index || 0)
      const roomMatch = beforeDetails.match(/(?:kitchen|living room|bedroom|bathroom|dining room|dining table|office|studio|space|sofa)/i)
      
      if (roomMatch) {
        const room = roomMatch[0]
        console.log('[buildSettingSection] ✅ Extracted setting with details:', `${room} with ${details}`)
        return `Setting: ${room} with ${details}.`
      } else {
        console.log('[buildSettingSection] ✅ Extracted setting details:', details)
        return `Setting: Interior space with ${details}.`
      }
    }
    
    // Pattern 2.5: "before", "by", "at", "near", or "beside" location details (mirror, vanity, etc.)
    const locationPattern = /(?:before|by|near|beside|at)\s+((?:(?:full-length|full\s+length|large|elegant|antique|vintage)\s+)?(?:mirror|vanity)[^,\.]{0,50})/i
    
    match = description.match(locationPattern)
    if (match && match[1]) {
      const locationDetail = match[1].trim()
      
      // Try to get room type
      const beforeLocation = description.substring(0, match.index || 0)
      const roomMatch = beforeLocation.match(/(?:kitchen|living room|bedroom|bathroom|dining room|office|studio)/i)
      
      if (roomMatch) {
        const room = roomMatch[0]
        console.log('[buildSettingSection] ✅ Extracted setting with location:', `${room} with ${locationDetail}`)
        return `Setting: ${room} with ${locationDetail}.`
      } else {
        console.log('[buildSettingSection] ✅ Extracted location detail:', locationDetail)
        return `Setting: Interior space with ${locationDetail}.`
      }
    }
    
    // Pattern 3: Simple room mention (including "dining table")
    const simpleRoomPattern = /(?:in|at)\s+((?:kitchen|living room|bedroom|bathroom|dining room|dining table|office|studio|hotel|restaurant|cafe|boutique|market|sofa)[^,\.]{0,50})/i
    
    match = description.match(simpleRoomPattern)
    if (match && match[1]) {
      let extractedSetting = match[1].trim().replace(/[,\.]$/, '')
      
      // If we found "dining table", try to get additional context
      // BUT only if "with" is not already in the extracted setting (to prevent duplication)
      if (extractedSetting.includes('dining table') && !extractedSetting.includes(' with ')) {
        const tableContext = description.match(/dining\s+table\s+with\s+([^,\.]{0,50})/i)
        if (tableContext && tableContext[1]) {
          extractedSetting = `${extractedSetting} with ${tableContext[1].trim()}`
        }
      }
      
      console.log('[buildSettingSection] ✅ Extracted simple setting:', extractedSetting)
      return `Setting: ${extractedSetting}.`
    }
    
    // Pattern 4: Christmas/Holiday specific settings (including "by Christmas tree")
    if (/christmas|holiday|festive/i.test(description)) {
      const holidayPattern = /((?:with|featuring|decorated with|adorned with|illuminated by|by)\s+(?:christmas tree|garland|lights|candles|ornaments|wreaths|stockings|presents)[^,\.]{0,80})/i
      
      match = description.match(holidayPattern)
      if (match && match[1]) {
        const holidayDetails = match[1].trim()
        
        // Get room if available (check before and after the holiday mention)
        const beforeHoliday = description.substring(0, match.index || 0)
        const afterHoliday = description.substring((match.index || 0) + match[0].length)
        const fullContext = beforeHoliday + ' ' + afterHoliday
        const roomMatch = fullContext.match(/(?:kitchen|living room|bedroom|dining room|sofa|cozy\s+sofa)/i)
        
        let room = 'festive space'
        if (roomMatch) {
          room = roomMatch[0]
          // If we found "sofa", include "cozy" if it's nearby
          if (room === 'sofa' && /cozy/i.test(beforeHoliday.substring(Math.max(0, beforeHoliday.length - 30)))) {
            room = 'cozy sofa'
          }
        }
        
        console.log('[buildSettingSection] ✅ Extracted holiday setting:', `${room} ${holidayDetails}`)
        return `Setting: ${room} ${holidayDetails}.`
      }
    }
  }
  
  // ============================================
  // STEP 2: Fallback - infer from keywords
  // ============================================
  
  console.log('[buildSettingSection] ⚠️ No explicit setting found, using keyword inference')
  
  const combinedText = `${concept.title || ''} ${description} ${userRequest || ''}`.toLowerCase()
  
  // Infer setting type from keywords
  if (/kitchen|cooking|preparing|counter|island|stove|oven/i.test(combinedText)) {
    return 'Setting: Modern kitchen with clean surfaces and natural light.'
  }
  
  if (/living room|sofa|couch|fireplace/i.test(combinedText)) {
    return 'Setting: Comfortable living room with cozy atmosphere.'
  }
  
  if (/bedroom|bed|nightstand|dresser/i.test(combinedText)) {
    return 'Setting: Serene bedroom with soft, calming ambiance.'
  }
  
  if (/dining|table|dinner|meal/i.test(combinedText)) {
    return 'Setting: Elegant dining area with welcoming atmosphere.'
  }
  
  if (/bathroom|vanity|mirror|sink/i.test(combinedText)) {
    return 'Setting: Spa-like bathroom with clean, modern aesthetic.'
  }
  
  if (/outdoor|garden|patio|terrace|park/i.test(combinedText)) {
    return 'Setting: Outdoor space with natural surroundings.'
  }
  
  // Final fallback
  console.log('[buildSettingSection] Using neutral fallback setting')
  return 'Setting: Clean, modern interior with natural light.'
}

/**
 * Build mood section
 * 
 * Authentic mood descriptions
 * Personalizes based on userRequest when available.
 */
function buildMoodSection(concept: ConceptComponents, userRequest?: string): string {
  if (concept.mood) {
    return `Mood: ${concept.mood}.`
  }

  // 🔴 CRITICAL: Use concept title/description and userRequest to infer mood
  // This ensures prompts match Maya's vision from her chat response
  const combinedText = `${concept.title || ''} ${concept.description || ''} ${userRequest || ''}`.toLowerCase()
  
  // Check for specific themes in concept/request (e.g., Christmas, holiday, cozy)
  if (/christmas|holiday|festive|winter|cozy.*holiday|holiday.*cozy/i.test(combinedText)) {
    if (/cozy|warm|comfortable|relaxed/i.test(combinedText)) {
      return 'Mood: Cozy, warm, festive, magical holiday atmosphere, peaceful and joyful.'
    } else if (/elegant|sophisticated|refined|evening/i.test(combinedText)) {
      return 'Mood: Elegant, sophisticated, refined holiday spirit, festive and graceful.'
    } else {
      return 'Mood: Festive, joyful, warm holiday atmosphere, magical and cozy.'
    }
  }

  // Category-specific moods (only if no specific theme detected)
  const moodOptions: Record<string, string[]> = {
    WELLNESS: ['Calm, centered, peaceful', 'Energetic, motivated, fresh', 'Relaxed, mindful, present'],
    LUXURY: ['Sophisticated, refined, elegant', 'Confident, poised, editorial', 'Quiet luxury, understated elegance'],
    LIFESTYLE: ['Effortless, relaxed, authentic', 'Cozy, comfortable, lived-in', 'Clean, minimal, intentional'],
    FASHION: ['Confident, street-style, authentic', 'Editorial, fashion-forward, modern', 'Scandi minimal, clean lines'],
    TRAVEL: ['Jet-set, sophisticated, wanderlust', 'Adventurous, free-spirited, ready', 'Elegant travel, refined packing'],
    BEAUTY: ['Fresh, glowing, natural', 'Ritual-focused, self-care, intentional', 'Morning routine, peaceful, centered'],
  }

  const conceptCategory = (concept.category && typeof concept.category === 'string') ? concept.category.toUpperCase() : 'LIFESTYLE'
  const categoryMoods = moodOptions[conceptCategory] || moodOptions.LIFESTYLE
  const randomMood = categoryMoods[Math.floor(Math.random() * categoryMoods.length)]
  return `Mood: ${randomMood}.`
}

/**
 * Build aesthetic description
 * 
 * Combines category description with concept aesthetic
 * Personalizes based on userRequest when available.
 */
function buildAestheticDescription(
  categoryInfo: { description: string; name: string },
  concept: ConceptComponents,
  userRequest?: string
): string {
  const baseAesthetic = categoryInfo.description
  const userRequestLower = (userRequest || '').toLowerCase()

  // Extract context for luxury detection
  const titleText = (concept.title && typeof concept.title === 'string') ? concept.title : ''
  const descText = (concept.description && typeof concept.description === 'string') ? concept.description : ''
  const aestheticText = (concept.aesthetic && typeof concept.aesthetic === 'string') ? concept.aesthetic : ''
  const requestText = userRequest || ''
  const combinedText = `${titleText} ${descText} ${aestheticText} ${requestText}`.toLowerCase()

  // Extract aesthetic keywords from userRequest
  const aestheticKeywords: string[] = []
  if (/pinterest|curated|dreamy|soft|feminine|aspirational/i.test(userRequest || '')) {
    aestheticKeywords.push('Pinterest-curated', 'dreamy aesthetic', 'aspirational moments')
  }
  if (/editorial|fashion|sophisticated|refined|elegant/i.test(userRequest || '')) {
    aestheticKeywords.push('editorial sophistication', 'fashion-forward', 'refined elegance')
  }
  if (/lifestyle|casual|everyday|authentic|real|natural/i.test(userRequest || '')) {
    aestheticKeywords.push('authentic lifestyle', 'everyday moments', 'natural authenticity')
  }
  if (/luxury|chic|premium|high-end/i.test(userRequest || '')) {
    aestheticKeywords.push('quiet luxury', 'premium aesthetic', 'sophisticated elegance')
  }

  // Combine concept aesthetic with user request keywords
  let finalAesthetic = concept.aesthetic || ''
  if (aestheticKeywords.length > 0) {
    finalAesthetic = finalAesthetic 
      ? `${finalAesthetic}, ${aestheticKeywords.join(', ')}`
      : aestheticKeywords.join(', ')
  }

  if (finalAesthetic) {
    return `${finalAesthetic}, ${baseAesthetic}`
  }

  // Enhanced aesthetic based on category
  const aestheticEnhancements: string[] = [
    'editorial quality',
    'authentic moment',
    'sophisticated simplicity',
    'timeless appeal',
    'luxurious materials',
    'refined elegance',
    'quiet luxury',
    'effortless sophistication',
    'understated opulence',
  ]

  // Add luxury-specific enhancements based on category/theme
  if (/luxury|elegant|sophisticated|premium|high-end/i.test(combinedText)) {
    aestheticEnhancements.push(
      'cashmere textures',
      'silk details',
      'leather accents',
      'marble surfaces',
      'architectural refinement',
      'premium materials'
    )
  }

  const categoryAesthetics: Record<string, string> = {
    WELLNESS: 'Coastal wellness, clean beauty, morning ritual, natural glow',
    LUXURY: 'Quiet luxury, editorial sophistication, timeless elegance',
    LIFESTYLE: 'Coastal living, clean aesthetic, everyday moments, authentic',
    FASHION: 'Street style, Scandi minimalism, modern editorial, clean lines',
    TRAVEL: 'Jet-set aesthetic, sophisticated packing, wanderlust, refined',
    BEAUTY: 'Coastal wellness, clean beauty, morning ritual, self-care',
  }

  const baseCategoryAesthetic = categoryAesthetics[categoryInfo.name] || baseAesthetic
  return `${baseCategoryAesthetic}, ${aestheticEnhancements.slice(0, 4).join(', ')}`
}

/**
 * Helper: Get random brand from category
 */
function getRandomBrand(categoryInfo: { brands: string[] }): string | null {
  if (categoryInfo.brands.length === 0) return null
  return categoryInfo.brands[Math.floor(Math.random() * categoryInfo.brands.length)]
}

/**
 * Helper: Build brand-specific item description
 */
function buildBrandItem(brand: string, itemType: string, category: string): string {
  const brandLower = brand.toLowerCase()

  // Category-specific brand items
  if (category === 'WELLNESS') {
    if (brandLower.includes('alo')) {
      return `butter-soft ${brand} high-waisted leggings`
    } else if (brandLower.includes('lululemon')) {
      return `${brand} Align leggings`
    }
  } else if (category === 'LUXURY') {
    if (brandLower.includes('chanel')) {
      return `${brand} headband`
    } else if (brandLower.includes('dior')) {
      return `${brand} accessories`
    }
  } else if (category === 'BEAUTY') {
    if (brandLower.includes('rhode')) {
      return `${brand} Peptide Treatment`
    } else if (brandLower.includes('glossier')) {
      return `${brand} products`
    }
  }

  return `${brand} ${itemType}`
}
