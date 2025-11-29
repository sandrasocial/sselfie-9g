/**
 * Maya 3.0 Concept Engine
 *
 * Semantic parser that extracts structured meaning from user concepts
 * BEFORE mood, lighting, composition, and scenario engines run.
 *
 * This enables deeper understanding and more accurate auto-selection.
 */

export interface ConceptProfile {
  coreScene: string | null // e.g. elevator, rooftop, street, hotel, cafe, gym, car
  environment: string // e.g. indoors-metal, outdoors-urban, cozy-interior, luxury-suite
  timeOfDay: string // e.g. night, golden hour, morning, afternoon, evening
  energy: string[] // e.g. mysterious, dramatic, confident, playful, calm
  aesthetic: string[] // editorial, moody, cinematic, clean-girl, luxury
  location: string | null // city or country if detected
  materials: string[] // metal, glass, marble, neon, wood
  objects: string[] // sunglasses, mirrors, elevators, coffee, car
  keywords: string[] // fallback keyword list
  rawInput: string // original concept text
}

/**
 * Main concept analysis function
 */
export function analyzeConceptV3(conceptText: string): ConceptProfile {
  const text = conceptText.toLowerCase()
  const words = text.split(/\s+/)

  const profile: ConceptProfile = {
    coreScene: null,
    environment: "indoors-natural",
    timeOfDay: "daytime",
    energy: [],
    aesthetic: [],
    location: null,
    materials: [],
    objects: [],
    keywords: words,
    rawInput: conceptText,
  }

  // SCENE DETECTION
  profile.coreScene = detectCoreScene(text)

  // ENVIRONMENT CLASSIFICATION
  profile.environment = classifyEnvironment(text, profile.coreScene)

  // TIME OF DAY
  profile.timeOfDay = detectTimeOfDay(text)

  // ENERGY & EMOTION
  profile.energy = detectEnergy(text)

  // AESTHETIC STYLE
  profile.aesthetic = detectAesthetic(text)

  // LOCATION
  profile.location = detectLocation(text)

  // MATERIALS
  profile.materials = detectMaterials(text)

  // OBJECTS
  profile.objects = detectObjects(text)

  return profile
}

/**
 * Detect core scene type
 */
function detectCoreScene(text: string): string | null {
  const sceneMap: Record<string, string[]> = {
    elevator: ["elevator", "lift"],
    rooftop: ["rooftop", "roofto", "rooftop terrace", "skyline view"],
    cafe: ["cafe", "coffee shop", "coffee", "latte", "cappuccino"],
    gym: ["gym", "workout", "fitness", "gym mirror", "weight room"],
    car: ["car", "vehicle", "drivers seat", "car selfie"],
    beach: ["beach", "ocean", "sand", "seaside", "coast"],
    street: ["street", "sidewalk", "urban", "city street"],
    hotel: ["hotel", "hotel room", "hotel lobby", "suite"],
    bathroom: ["bathroom", "bathroom mirror", "washroom"],
    airport: ["airport", "airport lounge", "terminal", "gate"],
    bedroom: ["bedroom", "bed", "master bedroom"],
    office: ["office", "desk", "workspace", "work"],
  }

  for (const [scene, keywords] of Object.entries(sceneMap)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return scene
    }
  }

  return null
}

/**
 * Classify environment type
 */
function classifyEnvironment(text: string, coreScene: string | null): string {
  // Priority: core scene influences environment
  if (coreScene === "elevator") return "indoors-metal"
  if (coreScene === "rooftop") return "outdoors-urban"
  if (coreScene === "cafe") return "cozy-interior"
  if (coreScene === "hotel") return "luxury-suite"
  if (coreScene === "gym") return "modern-fitness"
  if (coreScene === "car") return "vehicle-interior"
  if (coreScene === "beach") return "outdoors-natural"
  if (coreScene === "street") return "outdoors-urban"

  // Fallback: detect from keywords
  if (text.includes("outdoor") || text.includes("outside")) return "outdoors-natural"
  if (text.includes("luxury") || text.includes("elegant")) return "luxury-interior"
  if (text.includes("cozy") || text.includes("warm")) return "cozy-interior"
  if (text.includes("urban") || text.includes("city")) return "outdoors-urban"
  if (text.includes("metal") || text.includes("industrial")) return "indoors-metal"

  return "indoors-natural"
}

/**
 * Detect time of day
 */
function detectTimeOfDay(text: string): string {
  if (text.includes("night") || text.includes("midnight") || text.includes("evening")) return "night"
  if (text.includes("golden hour") || text.includes("sunset") || text.includes("sunrise")) return "golden-hour"
  if (text.includes("morning") || text.includes("breakfast")) return "morning"
  if (text.includes("afternoon") || text.includes("lunch")) return "afternoon"
  if (text.includes("dusk") || text.includes("twilight")) return "dusk"

  return "daytime" // default
}

/**
 * Detect energy/emotional tone
 */
function detectEnergy(text: string): string[] {
  const energies: string[] = []

  // Mysterious / Edgy
  if (text.includes("mysterious") || text.includes("sunglasses") || text.includes("dark")) {
    energies.push("mysterious")
  }

  // Dramatic
  if (text.includes("drama") || text.includes("dramatic") || text.includes("powerful")) {
    energies.push("dramatic", "confident")
  }

  // Confident
  if (text.includes("confident") || text.includes("power") || text.includes("boss")) {
    energies.push("confident")
  }

  // Playful
  if (text.includes("playful") || text.includes("fun") || text.includes("cheerful")) {
    energies.push("playful")
  }

  // Calm / Serene
  if (text.includes("calm") || text.includes("serene") || text.includes("peaceful")) {
    energies.push("calm")
  }

  // Romantic
  if (text.includes("romantic") || text.includes("soft") || text.includes("dreamy")) {
    energies.push("romantic")
  }

  // Energetic
  if (text.includes("energetic") || text.includes("vibrant") || text.includes("lively")) {
    energies.push("energetic")
  }

  // Tired / Exhausted (useful for "expensive but tired" airport vibe)
  if (text.includes("tired") || text.includes("exhausted") || text.includes("weary")) {
    energies.push("tired")
  }

  return energies
}

/**
 * Detect aesthetic style
 */
function detectAesthetic(text: string): string[] {
  const aesthetics: string[] = []

  if (text.includes("editorial") || text.includes("magazine")) aesthetics.push("editorial")
  if (text.includes("moody") || text.includes("dark")) aesthetics.push("moody")
  if (text.includes("cinematic") || text.includes("film")) aesthetics.push("cinematic")
  if (text.includes("clean") || text.includes("minimal")) aesthetics.push("clean-girl")
  if (text.includes("luxury") || text.includes("expensive") || text.includes("boujee")) aesthetics.push("luxury")
  if (text.includes("instagram") || text.includes("glossy")) aesthetics.push("instagram-glossy")
  if (text.includes("candid") || text.includes("natural")) aesthetics.push("candid-lifestyle")

  return aesthetics
}

/**
 * Detect location/place
 */
function detectLocation(text: string): string | null {
  const locationMap: Record<string, string[]> = {
    paris: ["paris", "france", "french"],
    "new york": ["new york", "nyc", "manhattan"],
    london: ["london", "uk", "british"],
    tokyo: ["tokyo", "japan", "japanese"],
    milan: ["milan", "italy", "italian"],
    dubai: ["dubai", "uae", "emirates"],
  }

  for (const [location, keywords] of Object.entries(locationMap)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return location
    }
  }

  return null
}

/**
 * Detect materials/textures
 */
function detectMaterials(text: string): string[] {
  const materials: string[] = []

  if (text.includes("metal") || text.includes("steel")) materials.push("metal")
  if (text.includes("glass") || text.includes("window")) materials.push("glass")
  if (text.includes("marble") || text.includes("stone")) materials.push("marble")
  if (text.includes("neon") || text.includes("lights")) materials.push("neon")
  if (text.includes("wood") || text.includes("wooden")) materials.push("wood")
  if (text.includes("mirror") || text.includes("reflective")) materials.push("mirror")

  return materials
}

/**
 * Detect objects/props
 */
function detectObjects(text: string): string[] {
  const objects: string[] = []

  if (text.includes("sunglasses") || text.includes("shades")) objects.push("sunglasses")
  if (text.includes("mirror")) objects.push("mirror")
  if (text.includes("elevator")) objects.push("elevator")
  if (text.includes("coffee") || text.includes("latte")) objects.push("coffee")
  if (text.includes("car")) objects.push("car")
  if (text.includes("phone") || text.includes("iphone")) objects.push("phone")
  if (text.includes("laptop") || text.includes("computer")) objects.push("laptop")

  return objects
}
