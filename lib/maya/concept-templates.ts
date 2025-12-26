// Shared concept templates for Studio Pro upload module
// This ensures consistency between the upload module and message building

export interface ConceptTemplate {
  value: string
  label: string
  prompt: string
}

export const CONCEPT_TEMPLATES: Record<string, ConceptTemplate[]> = {
  "brand-content": [
    { value: "alo-workout", label: "Alo Yoga Workout", prompt: "Alo Yoga style workout photos — premium athletic outfits, neutral colors, natural movement" },
    { value: "alo-wellness", label: "Alo Wellness", prompt: "Alo Yoga wellness content — yoga, stretching, calm movement in soft neutral environments" },
    { value: "lululemon-active", label: "Lululemon Active", prompt: "Lululemon performance wear — technical leggings, urban workout aesthetic" },
    { value: "athletic-lifestyle", label: "Athletic Lifestyle", prompt: "Athletic lifestyle content — active wear, movement, natural settings" },
  ],
  "beauty-self-care": [
    { value: "skincare-routine", label: "Skincare Routine", prompt: "Beauty skincare routine morning glow — dewy skin, natural light, clean girl aesthetic" },
    { value: "makeup-look", label: "Makeup Look", prompt: "Clean girl makeup look — natural, minimal, glowing skin" },
    { value: "beauty-ritual", label: "Beauty Ritual", prompt: "Beauty self-care ritual — spa-like, luxurious, wellness-focused" },
    { value: "glossier-aesthetic", label: "Glossier Style", prompt: "Glossier clean girl aesthetic — skin-first, dewy, minimal makeup" },
  ],
  "selfie-styles": [
    { value: "mirror-selfie", label: "Mirror Selfie", prompt: "Mirror selfie golden hour — natural beauty, soft lighting" },
    { value: "window-selfie", label: "Window Selfie", prompt: "Window selfie with natural light — clean, minimal aesthetic" },
    { value: "car-selfie", label: "Car Selfie", prompt: "Car selfie — casual, authentic, lifestyle moment" },
    { value: "bedroom-selfie", label: "Bedroom Selfie", prompt: "Bedroom selfie — cozy, intimate, natural setting" },
  ],
  "travel-lifestyle": [
    { value: "airport-it-girl", label: "Airport It Girl", prompt: "Airport it girl travel photo — lounge or gate setting with suitcase, headphones and coffee" },
    { value: "travel-destination", label: "Travel Destination", prompt: "Travel destination content — scenic locations, vacation vibes" },
    { value: "hotel-lifestyle", label: "Hotel Lifestyle", prompt: "Hotel lifestyle — luxury accommodation, travel moments" },
    { value: "travel-outfit", label: "Travel Outfit", prompt: "Travel outfit content — airport fashion, comfortable yet stylish" },
  ],
  "tech-work": [
    { value: "home-office", label: "Home Office", prompt: "Tech home office productivity content — modern workspace, laptop, coffee, professional vibes" },
    { value: "coffee-shop-work", label: "Coffee Shop Work", prompt: "Coffee shop work session — laptop, coffee, productive atmosphere" },
    { value: "tech-unboxing", label: "Tech Unboxing", prompt: "Tech product unboxing — new device, clean aesthetic" },
    { value: "digital-nomad", label: "Digital Nomad", prompt: "Digital nomad lifestyle — remote work, travel, tech setup" },
  ],
  "fashion-editorial": [
    { value: "chanel-luxury", label: "Chanel Luxury", prompt: "Chanel luxury fashion editorial — sophisticated, elegant, timeless aesthetic" },
    { value: "editorial-portrait", label: "Editorial Portrait", prompt: "Fashion editorial portrait — high-end, magazine-style" },
    { value: "street-style", label: "Street Style", prompt: "Street style fashion — urban, contemporary, trend-forward" },
    { value: "runway-inspired", label: "Runway Inspired", prompt: "Runway-inspired fashion — bold, editorial, high-fashion" },
  ],
  "wellness-content": [
    { value: "yoga-practice", label: "Yoga Practice", prompt: "Yoga practice content — peaceful, mindful, wellness-focused" },
    { value: "meditation-moment", label: "Meditation Moment", prompt: "Meditation and mindfulness — calm, serene, spiritual" },
    { value: "wellness-retreat", label: "Wellness Retreat", prompt: "Wellness retreat aesthetic — spa-like, luxurious, rejuvenating" },
    { value: "active-recovery", label: "Active Recovery", prompt: "Active recovery content — stretching, self-care, balance" },
  ],
  "seasonal-holiday": [
    { value: "christmas-cozy", label: "Christmas Cozy", prompt: "Christmas holiday cozy vibes — warm lighting, festive atmosphere, elegant winter aesthetic" },
    { value: "holiday-party", label: "Holiday Party", prompt: "Christmas holiday party content — festive, elegant, celebratory, Christmas decorations, holiday atmosphere, Christmas tree, twinkling lights, warm holiday ambiance" },
    { value: "winter-lifestyle", label: "Winter Lifestyle", prompt: "Winter lifestyle — cozy, warm, seasonal aesthetic" },
    { value: "new-year", label: "New Year", prompt: "New Year content — celebration, fresh start, elegant" },
  ],
  "luxury-travel": [
    { value: "venice-destination", label: "Venice", prompt: "Venice luxury destination — canals, historic architecture, sophisticated travel" },
    { value: "thailand-beach", label: "Thailand Beach", prompt: "Thailand beach destination — tropical, luxury, resort aesthetic" },
    { value: "paris-luxury", label: "Paris Luxury", prompt: "Paris luxury travel — sophisticated, elegant, timeless" },
    { value: "tropical-resort", label: "Tropical Resort", prompt: "Tropical resort lifestyle — luxury, relaxation, paradise" },
  ],
  "carousels-reels": [
    { value: "pinterest-carousel", label: "Pinterest Carousel", prompt: "Pinterest-style Instagram carousel — modern, minimal, ready for Studio Pro" },
    { value: "reel-cover", label: "Reel Cover", prompt: "Reel cover design — bold, scroll-stopping, text overlay" },
    { value: "story-highlight", label: "Story Highlight", prompt: "Story highlight cover — clean, branded, cohesive" },
    { value: "feed-post", label: "Feed Post", prompt: "Instagram feed post — curated, aesthetic, on-brand" },
  ],
}

// Helper function to get concept prompt by category and concept value
export function getConceptPrompt(category: string, conceptValue: string): string | null {
  const templates = CONCEPT_TEMPLATES[category]
  if (!templates) return null
  
  const concept = templates.find(c => c.value === conceptValue)
  return concept ? concept.prompt : null
}

// Helper function to get all concepts for a category
export function getConceptsForCategory(category: string): ConceptTemplate[] {
  return CONCEPT_TEMPLATES[category] || []
}



























