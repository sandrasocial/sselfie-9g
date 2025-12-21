/**
 * Outdoor Environment Enhancement System
 * 
 * Detailed outdoor settings with mood and atmosphere
 */

/**
 * Coastal Outdoor Environments
 */
export const COASTAL_OUTDOOR = {
  BEACH_SETTINGS: [
    'pristine white sand beach with turquoise ocean, gentle waves lapping shore, driftwood scattered naturally, soft coastal breeze, golden hour warmth',
    'secluded coastal cove with smooth pebbles, clear azure water, weathered rock formations, natural windswept grasses, serene isolated atmosphere',
    'wide sandy beach at sunset, pastel sky reflecting on wet sand, distant sailboats on horizon, peaceful evening coastal mood',
    'rocky coastline with tide pools, smooth grey stones, ocean spray mist, dramatic coastal cliffs in background, wild natural beauty',
  ],
  
  BEACH_DETAILS: {
    SAND: ['pristine white sand', 'golden beach sand', 'soft powdery sand', 'textured beach sand with shell fragments'],
    WATER: ['turquoise ocean water', 'clear azure sea', 'gentle rolling waves', 'calm crystalline water', 'foamy white caps on waves'],
    SKY: ['pastel sunset sky', 'soft blue sky with wispy clouds', 'golden hour glow', 'overcast coastal sky with soft light'],
    ELEMENTS: ['driftwood pieces', 'smooth beach stones', 'natural sea grass', 'weathered rope', 'scattered shells'],
  },
  
  COASTAL_PROMENADE: [
    'coastal boardwalk with weathered wooden planks, ocean views stretching to horizon, salt-weathered railings, seabirds in distance, fresh sea air atmosphere',
    'beachfront path with native coastal plants, sand dunes, ocean breeze moving through grass, natural undisturbed landscape',
    'seaside cliff walk with dramatic ocean vistas, wild coastal vegetation, windswept cypress trees, rugged natural beauty',
  ],
}

/**
 * Urban Outdoor Environments
 */
export const URBAN_OUTDOOR = {
  CITY_STREETS: [
    'cobblestone European street with historic architecture, wrought iron balconies, cafe tables, morning light on aged facades, quiet urban charm',
    'modern city street with clean minimalist architecture, geometric shadows, glass reflections, contemporary urban aesthetic',
    'tree-lined boulevard with dappled shade, elegant townhouses, subtle urban sophistication, leafy city atmosphere',
    'narrow alleyway with textured brick walls, vintage street lamps, atmospheric urban mood, European city character',
  ],
  
  ROOFTOP_TERRACE: [
    'private rooftop terrace with wooden deck, potted olive trees, city skyline views, modern outdoor furniture, urban oasis atmosphere',
    'penthouse terrace with stone flooring, minimalist landscaping, panoramic city views, luxury urban outdoor space',
    'rooftop garden with native grasses, weathered wood furniture, sunset city views, sophisticated urban retreat',
  ],
  
  PARKS_GARDENS: [
    'manicured park with ancient oak trees, dappled sunlight through leaves, winding gravel paths, serene green space',
    'botanical garden with structured hedges, stone pathways, classical statuary, refined garden atmosphere',
    'urban park with wildflower meadow, natural landscaping, soft afternoon light, peaceful city escape',
  ],
}

/**
 * Natural Landscape Environments
 */
export const NATURAL_LANDSCAPES = {
  COUNTRYSIDE: [
    'rolling hillside with wild grasses swaying, distant mountains, golden afternoon light, peaceful pastoral mood',
    'open meadow with wildflowers, tall grasses, blue sky with white clouds, natural untouched landscape',
    'vineyard hillside with ordered rows, Tuscan countryside views, warm earth tones, agricultural beauty',
  ],
  
  FOREST_WOODLAND: [
    'sun-dappled forest path with ancient trees, filtered light through canopy, moss-covered ground, serene woodland atmosphere',
    'coastal forest with wind-sculpted trees, natural undergrowth, soft diffused light, wild natural setting',
    'birch forest with white bark, filtered sunlight, peaceful natural environment, Scandinavian woodland feel',
  ],
  
  WATER_FEATURES: [
    'tranquil lake with mirror-like water, mountain reflections, morning mist, peaceful natural scene',
    'rocky stream with smooth stones, gentle water flow, lush greenery, natural water sounds implied',
    'infinity pool edge overlooking ocean, seamless water transition, luxury resort aesthetic',
  ],
}

/**
 * Architectural Outdoor Spaces
 */
export const ARCHITECTURAL_OUTDOOR = {
  MODERN_ARCHITECTURE: [
    'minimalist concrete courtyard with geometric pool, native plantings, clean architectural lines, contemporary luxury',
    'glass-walled pavilion opening to nature, seamless indoor-outdoor flow, modern architectural statement',
    'sculptural outdoor space with curved walls, water features, artistic landscape design',
  ],
  
  TRADITIONAL_CHARM: [
    'Mediterranean courtyard with terracotta tiles, climbing vines, rustic wood beams, Old World charm',
    'English cottage garden with stone pathways, climbing roses, vintage garden furniture, romantic setting',
    'Japanese-inspired garden with raked gravel, stepping stones, minimal plantings, zen atmosphere',
  ],
  
  COASTAL_ARCHITECTURE: [
    'modern beach house deck with weathered wood, ocean views, native coastal plants, casual luxury',
    'Mediterranean villa terrace with white stucco, blue shutters, ocean panorama, classic elegance',
    'Scandinavian summerhouse porch with natural wood, simple furnishings, coastal landscape views',
  ],
}

/**
 * Atmospheric Conditions & Mood
 */
export const OUTDOOR_ATMOSPHERE = {
  WEATHER_LIGHT: [
    'soft morning mist creating ethereal atmosphere',
    'golden hour light warming everything it touches',
    'bright clear day with crisp shadows',
    'overcast sky with soft even lighting',
    'dramatic clouds breaking to reveal sunbeams',
  ],
  
  SEASONAL: [
    'spring freshness with new blooms and green growth',
    'summer warmth with lush full vegetation',
    'autumn richness with warm golden tones',
    'winter clarity with crisp air and bare branches',
  ],
  
  MOOD: [
    'peaceful solitude in natural surroundings',
    'invigorating fresh air and open space',
    'romantic golden hour atmosphere',
    'dramatic natural beauty and grandeur',
    'serene contemplative outdoor moment',
  ],
}

/**
 * Build complete outdoor environment
 */
export function buildOutdoorEnvironment(
  type: 'coastal' | 'urban' | 'natural' | 'architectural',
  timeOfDay: 'morning' | 'afternoon' | 'evening' = 'afternoon',
  mood: 'peaceful' | 'dramatic' | 'romantic' | 'invigorating' = 'peaceful'
): string {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

  let environment = ''
  let atmosphere = ''

  // Select atmosphere
  if (timeOfDay === 'morning') {
    atmosphere = pick(['soft morning mist creating ethereal atmosphere', 'golden morning light warming the landscape', 'fresh morning air with crisp clarity'])
  } else if (timeOfDay === 'evening') {
    atmosphere = pick(['golden hour light warming everything', 'romantic sunset atmosphere', 'evening glow creating long shadows'])
  } else {
    atmosphere = pick(['bright afternoon light with clear shadows', 'soft afternoon glow', 'natural daylight illuminating the scene'])
  }

  // Build based on type
  switch (type) {
    case 'coastal':
      const coastalSetting = pick(COASTAL_OUTDOOR.BEACH_SETTINGS)
      environment = `${coastalSetting}, ${atmosphere}, ${pick(OUTDOOR_ATMOSPHERE.MOOD)}`
      break

    case 'urban':
      const urbanSetting = pick(URBAN_OUTDOOR.CITY_STREETS)
      environment = `${urbanSetting}, ${atmosphere}, sophisticated urban mood`
      break

    case 'natural':
      const naturalSetting = pick(NATURAL_LANDSCAPES.COUNTRYSIDE)
      environment = `${naturalSetting}, ${atmosphere}, ${pick(OUTDOOR_ATMOSPHERE.MOOD)}`
      break

    case 'architectural':
      const archSetting = pick(ARCHITECTURAL_OUTDOOR.MODERN_ARCHITECTURE)
      environment = `${archSetting}, ${atmosphere}, refined architectural atmosphere`
      break
  }

  return environment
}

/**
 * Detect outdoor type from context
 */
export function detectOutdoorType(text: string): 'coastal' | 'urban' | 'natural' | 'architectural' | null {
  const textLower = text.toLowerCase()

  if (/beach|ocean|seaside|coastal|shore|sand|waves/i.test(textLower)) return 'coastal'
  if (/city|street|urban|rooftop|terrace|alley|building/i.test(textLower)) return 'urban'
  if (/countryside|meadow|forest|woodland|lake|nature|hills|mountains/i.test(textLower)) return 'natural'
  if (/courtyard|pavilion|deck|porch|architectural|villa|modern/i.test(textLower)) return 'architectural'

  return null
}
