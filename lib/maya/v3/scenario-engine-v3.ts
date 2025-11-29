/**
 * Maya 3.0 Scenario Engine
 *
 * Creates rich environmental scenarios with props, atmosphere,
 * motion suggestions, and styling hints.
 */

export interface ScenarioBlock {
  name: string
  description: string
  environment: string
  props: string[]
  atmosphere: string
  motionSuggestions: string[]
  stylingHints: string[]
  keywords: string[]
  tags: string[] // Added tags for concept-engine matching
}

const SCENARIO_LIBRARY: Record<string, ScenarioBlock> = {
  cafe: {
    name: "Cafe Scene",
    description: "Modern coffee shop with warm inviting atmosphere",
    environment: "Contemporary cafe interior with natural light, wooden tables, plants",
    props: ["coffee cup", "laptop", "magazine", "phone", "pastry", "latte art"],
    atmosphere: "Warm, social, creative, urban lifestyle",
    motionSuggestions: ["sipping coffee", "working on laptop", "reading", "casual conversation"],
    stylingHints: ["casual chic", "elevated basics", "comfortable but polished", "layered accessories"],
    keywords: ["cafe interior", "coffee shop aesthetic", "urban lifestyle", "natural indoor light"],
    tags: ["cafe", "coffee", "interior", "warm", "social"],
  },

  rooftop: {
    name: "Rooftop",
    description: "Urban rooftop with city skyline backdrop",
    environment: "Modern rooftop terrace with city views, golden hour or blue hour lighting",
    props: ["city skyline", "rooftop railing", "urban architecture", "string lights"],
    atmosphere: "Aspirational, urban chic, elevated lifestyle",
    motionSuggestions: ["looking at view", "wind in hair", "leaning on railing", "confident stance"],
    stylingHints: ["sophisticated casual", "statement pieces", "bold accessories", "city-chic outfit"],
    keywords: ["rooftop view", "city skyline", "urban backdrop", "elevated perspective"],
    tags: ["rooftop", "city", "skyline", "urban", "chic", "elevated"],
  },

  workspace: {
    name: "Workspace",
    description: "Professional home office or creative studio",
    environment: "Clean modern workspace with natural light, organized desk setup",
    props: ["desk", "computer", "notebook", "coffee", "plants", "books", "organized supplies"],
    atmosphere: "Professional, focused, creative, entrepreneurial",
    motionSuggestions: ["working at desk", "brainstorming", "on video call", "organizing"],
    stylingHints: ["business casual", "comfortable professional", "polished but practical", "signature pieces"],
    keywords: ["home office", "workspace aesthetic", "professional environment", "desk setup"],
    tags: ["workspace", "office", "professional", "focused", "creative", "entrepreneurial"],
  },

  "bedroom-cozy": {
    name: "Bedroom Cozy",
    description: "Intimate bedroom setting with morning or evening light",
    environment: "Soft bedroom interior with natural window light, cozy textiles",
    props: ["bed linens", "throw pillows", "book", "coffee cup", "candles", "soft blankets"],
    atmosphere: "Intimate, relaxed, authentic, morning routine",
    motionSuggestions: ["reading in bed", "morning stretch", "enjoying coffee", "relaxed pose"],
    stylingHints: ["loungewear chic", "natural makeup", "effortless beauty", "cozy layers"],
    keywords: ["bedroom interior", "cozy atmosphere", "morning light", "intimate setting"],
    tags: ["bedroom", "cozy", "intimate", "relaxed", "authentic", "morning"],
  },

  "boutique-store": {
    name: "Boutique Store",
    description: "Upscale retail boutique with luxury shopping atmosphere",
    environment: "Elegant boutique interior with warm lighting, designer displays",
    props: ["clothing racks", "shopping bags", "mirrors", "luxury packaging", "designer pieces"],
    atmosphere: "Luxury, aspirational, sophisticated shopping experience",
    motionSuggestions: ["browsing clothes", "trying on items", "checking mirror", "shopping moment"],
    stylingHints: ["elevated style", "fashion-forward", "accessorized", "boutique-ready"],
    keywords: ["boutique interior", "luxury retail", "shopping atmosphere", "upscale environment"],
    tags: ["boutique", "store", "luxury", "upscale", "shopping", "sophisticated"],
  },

  "street-style": {
    name: "Street Style",
    description: "Urban street setting for fashion and lifestyle content",
    environment: "City street with interesting architecture, urban textures, natural daylight",
    props: ["urban walls", "street art", "architectural details", "city elements"],
    atmosphere: "Edgy, fashion-forward, authentic urban life",
    motionSuggestions: ["walking", "casual movement", "leaning against wall", "confident stride"],
    stylingHints: ["street fashion", "statement outfit", "bold accessories", "trend-conscious"],
    keywords: ["street photography", "urban fashion", "city backdrop", "architectural elements"],
    tags: ["street", "style", "urban", "fashion", "authentic", "city"],
  },

  "gym-lifestyle": {
    name: "Gym Lifestyle",
    description: "Modern fitness studio or gym setting",
    environment: "Clean gym space with mirrors, natural light, fitness equipment",
    props: ["yoga mat", "water bottle", "dumbbells", "resistance bands", "gym equipment"],
    atmosphere: "Energetic, healthy, aspirational fitness lifestyle",
    motionSuggestions: ["workout pose", "stretching", "active movement", "strength pose"],
    stylingHints: ["activewear", "athletic style", "functional fashion", "fitness-focused"],
    keywords: ["gym environment", "fitness lifestyle", "active wear", "workout setting"],
    tags: ["gym", "fitness", "lifestyle", "energetic", "healthy", "aspirational"],
  },

  beach: {
    name: "Beach",
    description: "Coastal beach setting with natural oceanside atmosphere",
    environment: "Sandy beach with ocean backdrop, natural daylight or golden hour",
    props: ["ocean waves", "sand", "beach towel", "sunglasses", "hat"],
    atmosphere: "Carefree, vacation, natural beauty, coastal lifestyle",
    motionSuggestions: ["walking on beach", "wind in hair", "looking at ocean", "relaxed pose"],
    stylingHints: ["resort wear", "beachy casual", "natural beauty", "vacation style"],
    keywords: ["beach setting", "ocean backdrop", "coastal atmosphere", "natural outdoor"],
    tags: ["beach", "ocean", "coastal", "natural", "vacation"],
  },

  airport: {
    name: "Airport",
    description: "Modern airport terminal for travel and lifestyle content",
    environment: "Contemporary airport interior with clean lines, travel atmosphere",
    props: ["luggage", "passport", "boarding pass", "coffee cup", "travel accessories"],
    atmosphere: "Jet-setter lifestyle, travel glamour, on-the-go",
    motionSuggestions: ["walking with luggage", "checking phone", "at gate", "travel mode"],
    stylingHints: ["travel chic", "comfortable elegance", "layered outfit", "practical style"],
    keywords: ["airport terminal", "travel lifestyle", "jet-setter aesthetic", "modern interior"],
    tags: ["airport", "travel", "jet-setter", "modern", "terminal"],
  },

  "home-office": {
    name: "Home Office",
    description: "Personalized home office with professional setup",
    environment: "Organized home office with personal touches, good natural light",
    props: ["desk", "computer", "notebooks", "coffee", "plants", "books", "personal items"],
    atmosphere: "Professional at home, creative workspace, entrepreneur lifestyle",
    motionSuggestions: ["working", "video call", "brainstorming", "organized workflow"],
    stylingHints: ["work from home chic", "comfortable professional", "polished casual", "personal style"],
    keywords: ["home office", "remote work", "professional home setup", "workspace design"],
    tags: ["home", "office", "professional", "remote", "work", "workspace", "design"],
  },

  "luxury-interior": {
    name: "Luxury Interior",
    description: "High-end interior space with sophisticated design",
    environment: "Elegant modern interior with designer furnishings, perfect lighting",
    props: ["designer furniture", "art pieces", "luxury decor", "high-end materials"],
    atmosphere: "Sophisticated, luxurious, aspirational lifestyle",
    motionSuggestions: ["relaxed elegance", "confident pose", "enjoying space", "refined presence"],
    stylingHints: ["luxury casual", "elevated style", "designer pieces", "sophisticated look"],
    keywords: ["luxury interior", "high-end design", "sophisticated space", "elegant environment"],
    tags: ["luxury", "interior", "high-end", "sophisticated", "elegant", "design"],
  },

  "elevator-scene": {
    name: "Elevator Scene",
    description: "Modern elevator interior with metallic surfaces and dramatic lighting",
    environment: "Sleek elevator with mirrors, metal panels, ambient lighting",
    props: ["elevator buttons", "mirror panels", "metal surfaces", "ambient LED lights"],
    atmosphere: "Intimate, confined luxury, modern sophistication",
    motionSuggestions: ["checking mirror", "leaning on wall", "casual stance", "confident pose"],
    stylingHints: ["sleek evening wear", "bold accessories", "statement pieces", "elevated casual"],
    keywords: ["elevator interior", "mirror selfie", "confined space", "metal textures"],
    tags: ["elevator", "mirror", "interior", "luxury", "modern", "confined"],
  },

  "hotel-bathroom-vanity": {
    name: "Hotel Bathroom Vanity",
    description: "Luxury hotel bathroom with marble and perfect lighting",
    environment: "High-end hotel bathroom with marble counters, designer fixtures, flattering lighting",
    props: ["marble counter", "designer fixtures", "luxury amenities", "mirror", "soft towels"],
    atmosphere: "Luxurious intimacy, spa-like elegance, refined comfort",
    motionSuggestions: ["applying makeup", "bathroom mirror selfie", "morning routine", "getting ready"],
    stylingHints: ["robe chic", "natural beauty", "fresh faced", "luxury loungewear"],
    keywords: ["hotel bathroom", "vanity lighting", "marble luxury", "spa atmosphere"],
    tags: ["hotel", "bathroom", "vanity", "luxury", "mirror", "interior"],
  },

  "luxury-hotel-hallway": {
    name: "Luxury Hotel Hallway",
    description: "Elegant hotel corridor with sophisticated lighting and design",
    environment: "Upscale hotel hallway with refined decor, warm lighting, luxury finishes",
    props: ["elegant doors", "artwork", "plush carpets", "wall sconces", "architectural details"],
    atmosphere: "Sophisticated elegance, five-star hospitality, refined luxury",
    motionSuggestions: ["walking down hallway", "entering room", "elegant stride", "confident presence"],
    stylingHints: ["evening elegance", "sophisticated casual", "upscale style", "refined fashion"],
    keywords: ["hotel hallway", "luxury corridor", "elegant interior", "upscale hospitality"],
    tags: ["hotel", "hallway", "luxury", "elegant", "interior"],
  },

  "rooftop-city-lights": {
    name: "Rooftop with City Lights",
    description: "Urban rooftop at night with glowing city skyline backdrop",
    environment: "Modern rooftop terrace with city lights, urban skyline, evening atmosphere",
    props: ["city skyline", "rooftop railing", "string lights", "urban architecture", "night sky"],
    atmosphere: "Urban luxury, nighttime glamour, cosmopolitan energy",
    motionSuggestions: ["looking at city", "leaning on railing", "confident stance", "wind in hair"],
    stylingHints: ["evening chic", "urban elegance", "statement outfit", "night-out style"],
    keywords: ["rooftop night", "city lights", "urban skyline", "nighttime backdrop"],
    tags: ["rooftop", "night", "cityscape", "urban", "luxury"],
  },

  "parisian-street-night": {
    name: "Parisian Street Night",
    description: "Romantic Parisian street at night with warm streetlights",
    environment: "Classic Paris street with cobblestones, cafe lights, romantic ambiance",
    props: ["street lamps", "cafe awnings", "cobblestones", "Parisian architecture"],
    atmosphere: "Romantic, sophisticated, European elegance",
    motionSuggestions: ["walking on street", "leaning on building", "cafe candid", "romantic stroll"],
    stylingHints: ["Parisian chic", "timeless elegance", "romantic style", "European fashion"],
    keywords: ["paris street", "romantic night", "european aesthetic", "street photography"],
    tags: ["paris", "street", "night", "romantic", "european"],
  },

  "cafe-night-interior": {
    name: "Cafe Night Interior",
    description: "Moody evening cafe with dim warm lighting and intimate atmosphere",
    environment: "Cozy cafe at night with warm pendant lights, dark wood, intimate seating",
    props: ["coffee cup", "dim lighting", "warm bulbs", "cozy corners", "evening ambiance"],
    atmosphere: "Intimate, moody, warm evening energy",
    motionSuggestions: ["sipping drink", "reading book", "candid conversation", "relaxed pose"],
    stylingHints: ["evening casual", "cozy chic", "relaxed style", "warm layers"],
    keywords: ["night cafe", "moody interior", "warm evening", "intimate atmosphere"],
    tags: ["cafe", "night", "interior", "moody", "warm", "intimate"],
  },

  "airport-lounge-editorial": {
    name: "Airport Lounge",
    description: "Modern airport lounge with clean lines and travel luxury",
    environment: "Contemporary airport lounge with modern furniture, clean design, travel atmosphere",
    props: ["luggage", "boarding pass", "coffee cup", "travel documents", "modern seating"],
    atmosphere: "Jet-setter lifestyle, cosmopolitan travel, modern luxury",
    motionSuggestions: ["working on laptop", "checking phone", "travel ready", "lounge relaxing"],
    stylingHints: ["travel chic", "comfortable elegance", "layered outfit", "jet-setter style"],
    keywords: ["airport lounge", "travel lifestyle", "modern interior", "jet setter"],
    tags: ["airport", "lounge", "travel", "modern", "professional"],
  },

  "gym-mirror-bay": {
    name: "Gym Mirror Bay",
    description: "Modern fitness studio with full-length mirrors and clean lighting",
    environment: "Contemporary gym with mirror walls, clean design, fitness equipment backdrop",
    props: ["gym mirrors", "workout equipment", "water bottle", "fitness accessories"],
    atmosphere: "Active lifestyle, fitness dedication, modern wellness",
    motionSuggestions: ["workout pose", "mirror check", "stretching", "fitness stance"],
    stylingHints: ["activewear", "athletic style", "functional fashion", "fitness aesthetic"],
    keywords: ["gym mirror", "fitness studio", "workout setting", "athletic environment"],
    tags: ["gym", "mirror", "fitness", "athletic", "interior"],
  },

  "walk-in-closet": {
    name: "Walk-in Closet",
    description: "Luxury dressing room with organized designer wardrobe",
    environment: "Elegant walk-in closet with organized shelves, soft lighting, luxury fashion",
    props: ["designer clothes", "shoe displays", "handbag collection", "jewelry organizers", "full-length mirror"],
    atmosphere: "Personal luxury, fashion sanctuary, curated style",
    motionSuggestions: ["choosing outfit", "trying on accessories", "getting ready", "fashion moment"],
    stylingHints: ["getting ready style", "fashion editorial", "luxury pieces", "personal style"],
    keywords: ["walk-in closet", "dressing room", "fashion sanctuary", "luxury wardrobe"],
    tags: ["closet", "interior", "fashion", "luxury", "personal"],
  },

  "car-interior-selfie": {
    name: "Car Interior",
    description: "Luxury car interior with leather seats and dashboard lighting",
    environment: "High-end car interior with leather, dashboard glow, intimate space",
    props: ["steering wheel", "leather seats", "dashboard", "car lighting", "luxury interior"],
    atmosphere: "Intimate vehicle moment, luxury lifestyle, personal space",
    motionSuggestions: ["driver seat pose", "casual check", "car selfie", "on-the-go moment"],
    stylingHints: ["car selfie casual", "on-the-go style", "effortless chic", "luxury casual"],
    keywords: ["car interior", "vehicle selfie", "luxury car", "intimate space"],
    tags: ["car", "vehicle", "interior", "luxury", "intimate"],
  },

  "high-end-office-lobby": {
    name: "High-End Office Lobby",
    description: "Corporate luxury with modern architecture and professional atmosphere",
    environment: "Sleek office lobby with modern design, marble floors, professional aesthetic",
    props: ["modern furniture", "marble floors", "architectural details", "corporate art"],
    atmosphere: "Professional luxury, corporate sophistication, modern business",
    motionSuggestions: ["confident walk", "professional stance", "business moment", "power pose"],
    stylingHints: ["business professional", "power dressing", "corporate chic", "executive style"],
    keywords: ["office lobby", "corporate luxury", "professional setting", "modern business"],
    tags: ["office", "professional", "lobby", "corporate", "modern"],
  },

  "shopping-mall-glass": {
    name: "Shopping Mall Glass Reflections",
    description: "Modern mall with glass storefronts and urban shopping atmosphere",
    environment: "Contemporary shopping center with glass facades, modern lighting, retail energy",
    props: ["shopping bags", "glass reflections", "modern architecture", "retail displays"],
    atmosphere: "Shopping lifestyle, urban retail, modern consumer culture",
    motionSuggestions: ["shopping moment", "window browsing", "retail pause", "fashion showcase"],
    stylingHints: ["shopping chic", "trendy style", "fashion forward", "retail ready"],
    keywords: ["shopping mall", "glass reflections", "retail interior", "urban shopping"],
    tags: ["mall", "shopping", "retail", "glass", "urban"],
  },

  "metro-platform": {
    name: "Metro Platform",
    description: "Urban subway station with city transit atmosphere",
    environment: "Clean modern metro station with tiles, lighting, urban transit feel",
    props: ["subway tiles", "platform lights", "transit signs", "urban architecture"],
    atmosphere: "Urban life, city energy, cosmopolitan movement",
    motionSuggestions: ["waiting on platform", "casual stance", "city commute", "urban moment"],
    stylingHints: ["street style", "urban fashion", "commuter chic", "city casual"],
    keywords: ["metro station", "subway platform", "urban transit", "city environment"],
    tags: ["metro", "subway", "urban", "transit", "street"],
  },

  "outdoor-balcony-golden": {
    name: "Outdoor Balcony Golden Hour",
    description: "Private balcony with golden hour sunlight and outdoor atmosphere",
    environment: "Balcony or terrace with golden hour light, outdoor furniture, open air",
    props: ["outdoor furniture", "plants", "railing", "golden sunlight", "outdoor decor"],
    atmosphere: "Relaxed elegance, outdoor luxury, golden hour magic",
    motionSuggestions: ["enjoying sunset", "relaxing outdoors", "casual pose", "golden hour moment"],
    stylingHints: ["outdoor casual", "resort style", "relaxed elegance", "sunset chic"],
    keywords: ["balcony golden hour", "outdoor terrace", "sunset moment", "outdoor living"],
    tags: ["balcony", "outdoor", "golden-hour", "terrace", "sunset"],
  },

  "nightclub-neon": {
    name: "Nightclub Neon Lighting",
    description: "Club atmosphere with colorful neon lights and nightlife energy",
    environment: "Modern nightclub with neon lights, dramatic shadows, party atmosphere",
    props: ["neon signs", "club lights", "bar elements", "party atmosphere"],
    atmosphere: "Nightlife energy, bold party vibes, dramatic lighting",
    motionSuggestions: ["dancing", "party pose", "night out energy", "confident stance"],
    stylingHints: ["night out glamour", "party style", "bold fashion", "club attire"],
    keywords: ["nightclub lights", "neon atmosphere", "party setting", "nightlife"],
    tags: ["nightclub", "neon", "night", "party", "dramatic"],
  },

  "minimalist-apartment": {
    name: "Minimalist Apartment",
    description: "Clean modern apartment with minimalist design and natural light",
    environment: "Minimalist interior with clean lines, natural light, simple elegance",
    props: ["minimal furniture", "clean surfaces", "natural light", "simple decor"],
    atmosphere: "Calm simplicity, modern living, peaceful elegance",
    motionSuggestions: ["relaxed at home", "casual moment", "natural pose", "comfortable living"],
    stylingHints: ["minimalist chic", "clean style", "simple elegance", "modern casual"],
    keywords: ["minimalist interior", "clean apartment", "modern living", "simple design"],
    tags: ["apartment", "minimalist", "clean", "modern", "interior"],
  },

  "scandinavian-interior": {
    name: "Scandinavian Interior",
    description: "Nordic-inspired space with natural materials and soft lighting",
    environment: "Scandinavian design with wood tones, white walls, natural textures, soft light",
    props: ["wooden furniture", "plants", "natural textiles", "minimalist decor"],
    atmosphere: "Calm Nordic elegance, natural simplicity, peaceful comfort",
    motionSuggestions: ["relaxing at home", "cozy moment", "natural pose", "peaceful living"],
    stylingHints: ["nordic minimalist", "natural style", "cozy chic", "Scandinavian fashion"],
    keywords: ["scandinavian design", "nordic interior", "natural living", "minimalist comfort"],
    tags: ["scandinavian", "nordic", "interior", "minimalist", "natural"],
  },

  "restaurant-bar-booth": {
    name: "Restaurant Bar Booth",
    description: "Upscale restaurant booth with ambient lighting and dining atmosphere",
    environment: "Elegant restaurant setting with booth seating, warm lighting, dining ambiance",
    props: ["table setting", "ambient lighting", "booth seating", "restaurant decor"],
    atmosphere: "Dining elegance, social luxury, culinary sophistication",
    motionSuggestions: ["dining moment", "social interaction", "elegant pose", "restaurant casual"],
    stylingHints: ["dinner elegance", "restaurant chic", "evening style", "dining fashion"],
    keywords: ["restaurant interior", "dining atmosphere", "booth setting", "upscale dining"],
    tags: ["restaurant", "dining", "booth", "interior", "elegant"],
  },

  "marble-lobby": {
    name: "Marble Lobby",
    description: "Luxury building lobby with marble floors and architectural elegance",
    environment: "Grand lobby with marble surfaces, high ceilings, luxury architecture",
    props: ["marble floors", "architectural columns", "luxury fixtures", "grand design"],
    atmosphere: "Architectural luxury, grand elegance, sophisticated space",
    motionSuggestions: ["walking through lobby", "elegant stride", "architectural moment", "confident presence"],
    stylingHints: ["architectural chic", "luxury style", "sophisticated fashion", "grand entrance"],
    keywords: ["marble interior", "luxury lobby", "architectural space", "grand entrance"],
    tags: ["marble", "lobby", "luxury", "architectural", "grand"],
  },

  "beauty-studio-vanity": {
    name: "Beauty Studio Vanity",
    description: "Professional beauty studio with perfect lighting and mirrors",
    environment: "Beauty studio with ring lights, mirrors, professional setup, perfect illumination",
    props: ["ring light", "vanity mirror", "beauty products", "professional lighting"],
    atmosphere: "Professional beauty, perfect lighting, studio quality",
    motionSuggestions: ["getting ready", "makeup application", "beauty moment", "studio pose"],
    stylingHints: ["beauty editorial", "flawless style", "professional polish", "studio ready"],
    keywords: ["beauty studio", "vanity lighting", "professional setup", "perfect illumination"],
    tags: ["beauty", "studio", "vanity", "professional", "mirror"],
  },
}

export function getScenarioBlock(scene: string, userContext?: any): ScenarioBlock {
  const sceneKey = scene.toLowerCase().replace(/\s+/g, "-")
  const scenario = SCENARIO_LIBRARY[sceneKey] || SCENARIO_LIBRARY["cafe"]

  return scenario
}

export function getAvailableScenarios(): string[] {
  return Object.keys(SCENARIO_LIBRARY).map((key) =>
    key
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
  )
}

export function getScenarioKeywords(scene: string): string[] {
  const block = getScenarioBlock(scene)
  return block.keywords
}

export function scoreScenarioWithTags(scenarioKey: string, conceptTags: string[]): number {
  const block = SCENARIO_LIBRARY[scenarioKey]
  if (!block) return 0

  let score = 0
  for (const tag of conceptTags) {
    if (block.tags.includes(tag)) {
      score += 5 // Tag match = +5 points
    }
  }
  return score
}
