/**
 * PRO MODE CONCEPT GENERATION API
 *
 * PURPOSE: Generates concepts for Pro Mode (Nano Banana Pro) image generation.
 *
 * FLOW:
 * 1. User requests concepts in Pro Mode
 * 2. System uses Maya's AI personality to generate natural language prompts
 * 3. System prompt instructs Maya to use brand-library-2025.ts for brand variety
 * 4. Post-processing removes markdown, ensures identity preservation phrase
 * 5. Output: 150-400 word natural language prompts with linked images
 *
 * KEY FEATURES:
 * - Identity preservation phrase (required for Nano Banana Pro)
 * - Brand intelligence via brand-library-2025.ts (dynamic variety)
 * - Natural flowing sentences (no markdown)
 * - Editorial, Pinterest-style format
 * - Image linking (3-5 images per concept)
 *
 * DIFFERENCES FROM CLASSIC MODE:
 * - No trigger words (Nano Banana Pro doesn't need them)
 * - Identity preservation phrase instead
 * - Longer, more detailed prompts (150-400 words)
 * - Natural language only (no technical specs)
 *
 * Last Updated: January 4, 2026 (Post-cleanup: Added brand intelligence, fixed prompts)
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { checkCredits } from "@/lib/credits"
import { generateText } from "ai"
import {
  detectCategory,
  type ImageLibrary,
  type CategoryInfo,
} from "@/lib/maya/pro/category-system"
import { getCategoryByKey } from "@/lib/maya/pro/category-system"
import { getMayaSystemPrompt, MAYA_PRO_CONFIG } from "@/lib/maya/mode-adapters"
import {
  mergeGuidePromptWithImages,
  extractPromptElements,
  createVariationFromGuidePrompt,
  type ReferenceImages,
} from "@/lib/maya/prompt-builders/guide-prompt-handler"
import { generateCompleteOutfit } from "@/lib/maya/brand-library-2025"
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"

export const maxDuration = 120 // Increased to 2 minutes to handle slow AI responses


/**
 * Link images to concept based on category and concept type
 * 🔴 ENHANCED: Intelligent image linking with smart multi-image selection
 * Uses concept analysis to link 3-5 relevant images per concept
 */
function linkImagesToConcept(
  concept: { title?: string | null; description?: string | null; brandReferences?: string[] | null; aesthetic?: string | null },
  imageLibrary: ImageLibrary,
  category: string | null
): string[] {
  const linkedImages: string[] = []
  // Safe null/undefined handling
  // Handle null category gracefully - link images based on concept content, not category
  const categoryLower = (category && typeof category === 'string') ? category.toLowerCase() : ''
  const titleLower = (concept.title && typeof concept.title === 'string') ? concept.title.toLowerCase() : ''
  const descLower = (concept.description && typeof concept.description === 'string') ? concept.description.toLowerCase() : ''
  const aestheticLower = (concept.aesthetic && typeof concept.aesthetic === 'string') ? concept.aesthetic.toLowerCase() : ''

  // Combine all text for keyword analysis
  const combinedText = `${titleLower} ${descLower} ${aestheticLower}`.toLowerCase()

  // ============================================
  // STEP 1: ALWAYS INCLUDE SELFIES (Required)
  // ============================================
  // Prioritize selfies for character consistency - use up to 4 selfies when available
  // This improves character consistency for Nano Banana Pro generation
  if (imageLibrary.selfies.length > 0) {
    // Always include at least one selfie (required for identity preservation)
    linkedImages.push(imageLibrary.selfies[0])

    // Use multiple selfies when available (up to 4 for better character consistency)
    // This is especially important for Nano Banana Pro which benefits from multiple reference images
    const maxSelfies = Math.min(imageLibrary.selfies.length, 4)
    for (let i = 1; i < maxSelfies; i++) {
      if (!linkedImages.includes(imageLibrary.selfies[i])) {
        linkedImages.push(imageLibrary.selfies[i])
      }
    }
  }

  // ============================================
  // STEP 2: INTELLIGENT PRODUCT LINKING
  // ============================================
  const hasBrandReferences = concept.brandReferences && concept.brandReferences.length > 0
  const productKeywords = [
    'product', 'brand', 'partnership', 'collaboration', 'sponsored',
    'skincare', 'makeup', 'beauty product', 'wellness product',
    'fashion', 'outfit', 'clothing', 'accessories', 'jewelry',
    'bag', 'shoes', 'sunglasses', 'watch', 'perfume'
  ]

  const mentionsProducts = productKeywords.some(keyword =>
    combinedText.includes(keyword)
  ) || hasBrandReferences ||
    categoryLower === 'beauty' ||
    categoryLower === 'wellness' ||
    categoryLower === 'fashion' ||
    categoryLower === 'luxury'

  if (mentionsProducts && imageLibrary.products.length > 0) {
    // Determine how many products to link based on concept focus
    let productCount = 1
    if (categoryLower === 'beauty' || titleLower.includes('product') || descLower.includes('product')) {
      productCount = 2 // Beauty/product-focused: link 2 products
    } else if (hasBrandReferences && concept.brandReferences!.length > 1) {
      productCount = 2 // Multiple brands: link 2 products
    }

    // Link products
    imageLibrary.products.slice(0, productCount).forEach(product => {
      if (!linkedImages.includes(product) && linkedImages.length < 5) {
        linkedImages.push(product)
      }
    })
  }

  // ============================================
  // STEP 3: INTELLIGENT PEOPLE/LIFESTYLE LINKING
  // ============================================
  const lifestyleKeywords = [
    'lifestyle', 'portrait', 'moment', 'group', 'people', 'friends',
    'together', 'social', 'community', 'gathering', 'event',
    'party', 'celebration', 'dinner', 'brunch', 'coffee', 'cafe'
  ]

  const isLifestyle = lifestyleKeywords.some(keyword =>
    combinedText.includes(keyword)
  ) || categoryLower === 'lifestyle' ||
    categoryLower === 'travel' ||
    categoryLower === 'casual-lifestyle'

  if (isLifestyle && imageLibrary.people.length > 0) {
    // Link 1-2 people images for lifestyle concepts
    const peopleCount = (descLower.includes('group') || descLower.includes('friends') || descLower.includes('together')) ? 2 : 1
    imageLibrary.people.slice(0, peopleCount).forEach(person => {
      if (!linkedImages.includes(person) && linkedImages.length < 5) {
        linkedImages.push(person)
      }
    })
  }

  // ============================================
  // STEP 4: INTELLIGENT VIBE/AESTHETIC LINKING
  // ============================================
  const vibeKeywords = [
    'aesthetic', 'mood', 'inspiration', 'style', 'vibe', 'curated',
    'editorial', 'dreamy', 'minimal', 'luxury', 'feminine', 'soft',
    'pinterest', 'instagram', 'aspirational', 'inspo', 'mood board',
    'visual', 'atmosphere', 'ambiance', 'feeling', 'energy'
  ]

  const hasVibeKeywords = vibeKeywords.some(keyword =>
    combinedText.includes(keyword)
  )

  const isAestheticFocused = hasVibeKeywords ||
    categoryLower === 'fashion' ||
    categoryLower === 'luxury' ||
    titleLower.includes('aesthetic') ||
    titleLower.includes('mood') ||
    titleLower.includes('style') ||
    descLower.includes('aesthetic') ||
    descLower.includes('mood') ||
    descLower.includes('vibe')

  if (isAestheticFocused && imageLibrary.vibes.length > 0) {
    // Link 1-2 vibe images for aesthetic-focused concepts
    const vibeCount = (hasVibeKeywords && imageLibrary.vibes.length > 1) ? 2 : 1
    imageLibrary.vibes.slice(0, vibeCount).forEach(vibe => {
      if (!linkedImages.includes(vibe) && linkedImages.length < 5) {
        linkedImages.push(vibe)
      }
    })
  }

  // ============================================
  // STEP 5: CATEGORY-SPECIFIC ENHANCEMENTS
  // ============================================
  if (categoryLower === 'wellness' || categoryLower === 'alo-workout') {
    // Wellness/workout: ensure products are linked (for workout gear, supplements, etc.)
    if (imageLibrary.products.length > 0 && !linkedImages.includes(imageLibrary.products[0]) && linkedImages.length < 5) {
      linkedImages.push(imageLibrary.products[0])
    }
    // Add vibe for wellness aesthetic
    if (imageLibrary.vibes.length > 0 && !linkedImages.includes(imageLibrary.vibes[0]) && linkedImages.length < 5) {
      linkedImages.push(imageLibrary.vibes[0])
    }
  } else if (categoryLower === 'luxury' || categoryLower === 'luxury-fashion') {
    // Luxury: prioritize products and vibes
    if (imageLibrary.products.length > 0 && !linkedImages.includes(imageLibrary.products[0]) && linkedImages.length < 5) {
      linkedImages.push(imageLibrary.products[0])
    }
    if (imageLibrary.vibes.length > 0 && !linkedImages.includes(imageLibrary.vibes[0]) && linkedImages.length < 5) {
      linkedImages.push(imageLibrary.vibes[0])
    }
  } else if (categoryLower === 'travel' || categoryLower === 'travel-airport') {
    // Travel: prioritize people and vibes
    if (imageLibrary.people.length > 0 && !linkedImages.includes(imageLibrary.people[0]) && linkedImages.length < 5) {
      linkedImages.push(imageLibrary.people[0])
    }
    if (imageLibrary.vibes.length > 0 && !linkedImages.includes(imageLibrary.vibes[0]) && linkedImages.length < 5) {
      linkedImages.push(imageLibrary.vibes[0])
    }
  } else if (categoryLower === 'beauty') {
    // Beauty: prioritize products and additional selfies
    if (imageLibrary.products.length > 0 && !linkedImages.includes(imageLibrary.products[0]) && linkedImages.length < 5) {
      linkedImages.push(imageLibrary.products[0])
    }
    // Add second product if available
    if (imageLibrary.products.length > 1 && !linkedImages.includes(imageLibrary.products[1]) && linkedImages.length < 5) {
      linkedImages.push(imageLibrary.products[1])
    }
  } else if (categoryLower === 'lifestyle' || categoryLower === 'casual-lifestyle') {
    // Lifestyle: add people and vibes if not already linked
    if (imageLibrary.people.length > 0 && !linkedImages.includes(imageLibrary.people[0]) && linkedImages.length < 5) {
      linkedImages.push(imageLibrary.people[0])
    }
    if (imageLibrary.vibes.length > 0 && !linkedImages.includes(imageLibrary.vibes[0]) && linkedImages.length < 5) {
      linkedImages.push(imageLibrary.vibes[0])
    }
  }

  // ============================================
  // STEP 6: FILL REMAINING SLOTS (up to 5 images total)
  // ============================================
  // Add more selfies if available (better character consistency), then other types
  // Prioritize: more selfies > products > people > vibes
  if (linkedImages.length < 5) {
    // Add remaining selfies if we haven't used all available ones
    const usedSelfies = linkedImages.filter(img => imageLibrary.selfies.includes(img))
    if (imageLibrary.selfies.length > usedSelfies.length) {
      const remainingSelfies = imageLibrary.selfies.filter(selfie => !usedSelfies.includes(selfie))
      for (const selfie of remainingSelfies) {
        if (linkedImages.length >= 5) break
        linkedImages.push(selfie)
      }
    }

    // Then add other image types if slots remain
    const availableTypes = [
      { type: 'products', images: imageLibrary.products },
      { type: 'people', images: imageLibrary.people },
      { type: 'vibes', images: imageLibrary.vibes },
    ]

    for (const { images } of availableTypes) {
      if (linkedImages.length >= 5) break

      for (const image of images) {
        if (!linkedImages.includes(image) && linkedImages.length < 5) {
          linkedImages.push(image)
          if (linkedImages.length >= 5) break
        }
      }
    }
  }

  // Remove duplicates and limit to max 5 images per concept
  const uniqueImages = [...new Set(linkedImages)]
  return uniqueImages.slice(0, 5)
}


// ─────────────────────────────────────────────────────────────────────────────
// Helpers extracted from POST to reduce cyclomatic complexity
// ─────────────────────────────────────────────────────────────────────────────

const IDENTITY_PRESERVATION_PHRASE =
  "Maintain exactly the characteristics of the person in the attachment (face, visual identity). Do not copy the original photo."

/** Normalise a raw imageLibrary body payload to a safe ImageLibrary with non-null arrays. */
function normalizeImageLibrary(raw: any): ImageLibrary {
  return {
    selfies: Array.isArray(raw.selfies) ? raw.selfies : [],
    products: Array.isArray(raw.products) ? raw.products : [],
    people: Array.isArray(raw.people) ? raw.people : [],
    vibes: Array.isArray(raw.vibes) ? raw.vibes : [],
    intent: raw.intent && typeof raw.intent === "string" ? raw.intent : "",
  }
}

/** Resolve a categoryKey + categoryInfo from an optional hint + userRequest fallback detection. */
function resolveCategory(
  categoryInput: string | null | undefined,
  userRequest: string,
  library: ImageLibrary,
): { categoryKey: string | null; categoryInfo: CategoryInfo | null } {
  let categoryKey: string | null = (categoryInput && typeof categoryInput === "string") ? categoryInput : null
  let categoryInfo: CategoryInfo | null = null

  if (!categoryKey) {
    categoryInfo = detectCategory(userRequest, library)
    if (categoryInfo && categoryInfo.key && typeof categoryInfo.key === "string") {
      categoryKey = categoryInfo.key
      console.log("[v0] [PRO MODE] Category hint detected:", categoryInfo.name || categoryInfo.key)
    } else {
      console.log("[v0] [PRO MODE] No category hint - Maya will determine categories dynamically")
      categoryKey = null
      categoryInfo = null
    }
  } else {
    if (typeof categoryKey === "string") {
      categoryInfo = getCategoryByKey(categoryKey)
      if (!categoryInfo) {
        console.log("[v0] [PRO MODE] Category key provided but not found in system:", categoryKey)
        categoryInfo = detectCategory(userRequest, library)
        if (categoryInfo && categoryInfo.key && typeof categoryInfo.key === "string") {
          categoryKey = categoryInfo.key
        } else {
          categoryKey = null
          categoryInfo = null
        }
      }
    } else {
      categoryKey = null
      categoryInfo = null
    }
  }

  return { categoryKey, categoryInfo }
}

/** Map a Pro Mode category key to the brand-library category name. */
function mapProCategoryToBrandLibrary(proCategory: string | null): string | null {
  if (!proCategory) return null
  const categoryLower = proCategory.toLowerCase()

  if (categoryLower === "wellness" || categoryLower === "alo-workout" || categoryLower.includes("workout") || categoryLower.includes("athletic")) {
    return "workout"
  }
  if (categoryLower === "luxury" || categoryLower === "luxury-fashion") {
    return "luxury"
  }
  if (categoryLower === "casual" || categoryLower === "casual-lifestyle" || categoryLower === "lifestyle") {
    return "casual"
  }
  if (categoryLower === "travel" || categoryLower === "travel-airport") {
    return "travel"
  }
  if (categoryLower.includes("cozy") || categoryLower === "home") {
    return "cozy"
  }
  if (categoryLower === "street-style" || categoryLower === "fashion") {
    return "street-style"
  }

  return "casual"
}

/** Build the full AI prompt for Pro Mode concept generation. */
function buildAiPrompt(params: {
  mayaPersonality: string
  userRequest: string
  categoryInfo: CategoryInfo | null
  categoryKey: string | null
  library: ImageLibrary
  essenceWords: string | undefined
  outfitSuggestions: Record<string, any>
}): string {
  const { mayaPersonality, userRequest, categoryInfo, categoryKey, library, essenceWords, outfitSuggestions } = params

  const categoryHint =
    categoryInfo?.name && categoryInfo?.description
      ? `\n**Optional Category Hint:** ${categoryInfo.name} - ${categoryInfo.description}\n(Use this as inspiration, but determine the best category based on the user's request)`
      : ""

  const libraryContext = `
**Image Library:**
- Selfies: ${library.selfies.length}
- Products: ${library.products.length}
- People: ${library.people.length}
- Vibes: ${library.vibes.length}
- Intent: ${library.intent || "Not specified"}
`

  return `${mayaPersonality}

Generate 6 unique, creative concept cards based on the user's request. Use your fashion expertise and editorial knowledge to create diverse, sophisticated concepts.

**CRITICAL: USER'S REQUEST IS YOUR PRIMARY GUIDE**
**USER'S REQUEST:**
${userRequest}

**YOUR RESPONSIBILITY:**
The user has explicitly requested: "${userRequest}"
- Your concept titles, descriptions, and all details MUST reflect this request
- If the user asks for "Christmas", create Christmas-themed concepts (holiday outfits, festive settings, cozy holiday moments)
- If the user asks for "beach", create beach-themed concepts (coastal outfits, ocean settings, beach vibes)
- Do NOT use generic defaults that ignore the user's request
- Every concept should clearly show you understood and are delivering on their specific request

${categoryHint}

${libraryContext}

**ESSENCE WORDS:** ${essenceWords || "None provided"}

**VARIETY GUIDANCE:**
The user wants VARIETY across concepts:
- Create DIFFERENT outfits for each concept (different styles, brands, colors)
- Create DIFFERENT locations and settings
- Vary poses, angles, lighting, and moods
- Think: "diverse portfolio of looks"
Example: Concept 1 might be Alo athleisure at yoga studio, concept 2 might be The Row luxury at rooftop, etc.

**YOUR TASK:**
Create 6 diverse, creative concepts. Each concept must be:
- Unique and different from the others
- **DIRECTLY based on the user's actual request** - if they said "Christmas", make it Christmas-themed
- Professional and editorial quality matching SSELFIE's aesthetic
- Specific to their request (e.g., if they said "Christmas", use holiday outfits, festive settings, cozy holiday moments - NOT generic street style)
- Use your fashion expertise to determine the most appropriate category for each concept

**SELFIE CONCEPTS (When Appropriate):**
SSELFIE Studio celebrates authentic selfie content. Consider including selfie concepts when they naturally fit the user's request:
- If user requests selfies, create selfie concepts with iPhone front camera framing
- For wellness/fitness: post-workout selfies, gym mirror selfies
- For fashion: mirror selfies showcasing outfits, fitting room selfies
- For beauty: skincare routine mirror selfies, makeup application selfies
- For lifestyle: coffee shop selfies, morning routine mirror selfies
- Mix professional shots with authentic selfie moments for variety when appropriate
- If user prefers professional/editorial only, focus on DSLR/editorial concepts

When creating selfie concepts, describe them naturally: "iPhone front camera selfie", "mirror selfie reflection", "handheld selfie", etc. Maintain same quality and luxury as professional concepts.


**CRITICAL: DESCRIPTION REQUIREMENTS**
Your "description" field MUST include:
- Specific outfit details (e.g., "wearing cozy holiday pajamas" or "elegant holiday evening wear")
- Specific setting details (e.g., "cozy living room with Christmas tree" or "festive holiday market")
- Specific mood/atmosphere (e.g., "warm festive atmosphere" or "magical holiday ambiance")
- Do NOT use generic descriptions - be specific and match the user's request

**CRITICAL INSTRUCTION FOR DESCRIPTIONS:**
Your description field must be EXACTLY what will appear in the final prompt. The description you write will be used directly to build the image generation prompt, so it must include:

1. SPECIFIC OUTFIT DETAILS: Not "cozy outfit" but "cream cashmere sweater, high-waisted denim, Bottega Veneta leather bag"
2. SPECIFIC SETTING DETAILS: Not "cozy setting" but "living room with marble fireplace, Christmas tree with warm lights"
3. SPECIFIC POSE DETAILS: Not "relaxed pose" but "sitting on sofa, holding warm mug, looking at Christmas tree"
4. BRAND NAMES: Include 1-2 accessible brands + max 1 luxury brand woven naturally into descriptions
5. MOOD & LIGHTING: Specific lighting conditions and mood descriptors

The description must be detailed enough that a prompt builder can use it verbatim without adding generic defaults.

Example of GOOD description:
"Cozy Christmas morning moment: sitting comfortably on cream sofa in elegant living room, wearing Jenni Kayne cashmere sweater in warm cream, Levi's high-waisted denim, holding ceramic mug with both hands, looking peacefully at decorated Christmas tree with twinkling lights, Bottega Veneta crossbody bag resting beside her. Soft morning light streaming through windows, warm fireplace glow, festive holiday atmosphere, quiet luxury aesthetic."

Example of BAD description (too generic):
"Cozy Christmas morning in living room wearing festive outfit."

Remember: Your description IS the prompt. Make it detailed, specific, and complete.

**EXAMPLE for Christmas request:**
- Title: "Christmas Morning Cozy"
- Description: "Cozy holiday morning moment, wearing soft cashmere sweater in festive colors, sitting by decorated Christmas tree with warm fireplace, holding warm mug, peaceful and joyful holiday atmosphere, soft morning light through windows, twinkling Christmas tree lights in background"
- Category: "Lifestyle" or "Seasonal" (not generic "Fashion")

**EXAMPLE for beach request:**
- Title: "Coastal Beach Moment"
- Description: "Beach setting, wearing flowy resort wear or swimwear, ocean views, soft coastal light, beach atmosphere, natural textures"
- Category: "Travel" or "Lifestyle" (not generic "Fashion")

**CATEGORY DETERMINATION:**
You have full creative freedom to determine categories based on:
- **The user's request and intent (PRIMARY)** - if they say "Christmas", the category should reflect holiday/seasonal themes
- Your fashion expertise and knowledge of current trends
- The aesthetic and style of each concept
- Available categories: Wellness, Luxury, Lifestyle, Fashion, Travel, Beauty, or create new categories that fit

Do NOT default to "Lifestyle" unless it truly fits. Use your expertise to determine the best category for each concept.

Return ONLY a valid JSON array of 6 concepts:
[
  {
    "title": "string - unique concept title that reflects the user's request (e.g., if user said 'Christmas', use 'Christmas Morning Cozy' or 'Holiday Fireplace Reading')",
    "description": "string - detailed description that MUST include specific outfit details, setting, and mood that match the user's request. If user said 'Christmas', describe Christmas outfits, holiday settings, festive atmosphere. Include outfit details like 'wearing cozy holiday pajamas' or 'elegant holiday evening wear'.",
    "category": "string - category you determine based on the concept (Wellness, Luxury, Lifestyle, Fashion, Travel, Beauty, or your own). If user said 'Christmas', use a category that reflects holiday/seasonal themes.",
    "aesthetic": "string - aesthetic description matching SSELFIE's clean, feminine, modern aesthetic AND the user's request",
    "brandReferences": ["string"] - array of relevant brand names that fit the concept,
    "stylingDetails": "string - specific styling details that match the user's request",
    "technicalSpecs": "string - camera/technical specs",
    "prompt": "COMPLETE STRUCTURED PROMPT for Nano Banana Pro (150-400 words) - see format below"
  }
]

**CRITICAL: PROMPT FIELD REQUIREMENTS**

The "prompt" field must be a COMPLETE, STRUCTURED PROMPT ready for Nano Banana Pro. Generate this directly - do not generate a description that needs transformation.

**DIVERSITY & VARIETY:**
- Create naturally diverse concepts with varied settings, poses, and moments
- Avoid repetitive scenarios (no "sitting on couch with mug" in multiple concepts)
- Mix indoor/outdoor, static/active, cozy/energetic, casual/sophisticated
- Include variety in:
  * Settings: home, outdoor, urban, nature, work, social venues
  * Poses: sitting, standing, walking, working, active, relaxed, social
  * Moments: daily life, work, travel, wellness, social, creative pursuits
  * Props: naturally varied (not just mugs/books/phones)
  * Times: morning, afternoon, evening, golden hour, blue hour
- Draw from your 2026 luxury influencer knowledge for current, fresh scenarios
- Trust your creativity - no templates or forced patterns

**AVOID REPETITION:**
- ❌ Don't create multiple "sitting on sofa" concepts
- ❌ Don't default to "holding mug/teacup" repeatedly
- ❌ Don't use "reading book" in multiple concepts
- ✅ Create fresh, unique moments for each concept
- ✅ Show variety in activities and settings
- ✅ Make each concept feel distinct

**PROMPT FORMAT (Pro Mode - Natural Flowing Sentences):**

MANDATORY: EVERY prompt MUST start with this EXACT phrase:
"Maintain exactly the characteristics of the person in the attachment (face, visual identity). Do not copy the original photo."

This is REQUIRED for Pro Mode (NanoBanana) - DO NOT skip it or use variations.

Generate prompts as NATURAL FLOWING SENTENCES, not structured sections. NO markdown formatting (**Outfit:**, **Pose:**, etc.).

**PROMPT LENGTH REQUIREMENT:**
- Minimum 150 words (optimal 200-400 words)
- Include detailed outfit descriptions with ALL pieces, materials, colors, and brands
- Include detailed setting/environment descriptions
- Include detailed pose and body language
- Include detailed lighting descriptions
- Include camera specifications
- Include mood and aesthetic descriptions

Format: [MANDATORY IDENTITY PRESERVATION PHRASE] → Photography style → Character consistency → Detailed outfit → Detailed pose → Detailed setting → Detailed lighting → Camera specs → Mood → Aesthetic

**For concepts 0-2 (Editorial - first 3 concepts):**

Example GOOD format (200+ words):
"Maintain exactly the characteristics of the person in the attachment (face, visual identity). Do not copy the original photo. Professional editorial photography. Pinterest-style fashion portrait. Character consistency with provided reference images. Woman wearing oversized black wool blazer from The Row, charcoal wide-leg trousers from Toteme, chunky leather platform boots from Bottega Veneta. Standing confidently against industrial concrete wall, one hand in pocket, other adjusting blazer collar, strong architectural pose. Urban cityscape background with modern buildings and clean lines. Dramatic directional lighting creating angular shadows, late afternoon golden light. Shot with Canon EOS R5, 85mm f/1.4 lens, shallow depth of field. High-fashion editorial aesthetic, urban sophistication, contemporary street style elegance."

Example BAD format (DO NOT USE - too short, missing identity phrase):
"Professional photography. Character consistency. Woman wearing The Row blazer. Standing by window. Shot with Canon EOS R5."

**For concepts 3-5 (Authentic iPhone - last 3 concepts):**

Example GOOD format (200+ words):
"Maintain exactly the characteristics of the person in the attachment (face, visual identity). Do not copy the original photo. Authentic influencer content. Pinterest-style portrait. Character consistency with provided reference images. Woman wearing black wool blazer from The Row, charcoal trousers from Toteme, minimal leather accessories. Standing confidently against concrete wall, weight shifted to one leg, hands in pockets, relaxed but strong posture. Urban street setting with architectural details and natural city backdrop. Dramatic directional lighting creating angular shadows, late afternoon light with warm tones. Shot with iPhone 15 Pro portrait mode, 77mm equivalent, natural bokeh effect, shallow depth of field. Dark minimalist editorial aesthetic, contemporary street style, urban sophistication."

Example BAD format (DO NOT USE - too short, missing identity phrase):
"Authentic influencer content. Woman wearing The Row blazer. Standing confidently. Shot with iPhone 15 Pro."

**CRITICAL REQUIREMENTS:**
- MUST start with: "Maintain exactly the characteristics of the person in the attachment (face, visual identity). Do not copy the original photo."
- Minimum 150 words (optimal 200-400 words)
- Write as natural flowing sentences, NOT structured sections
- NO markdown formatting (**Outfit:**, **Pose:**, **Setting:**, etc.)
- NO section labels or headers
- Natural language flow from identity preservation → photography style → character consistency → detailed outfit → detailed pose → detailed setting → detailed lighting → camera → mood → aesthetic
- Each concept should read like a complete, natural description with ALL details

**SELFIE HANDLING:**
If the concept is a selfie (description mentions "selfie", "front camera", "mirror selfie"):
- Use iPhone front camera specifications (not DSLR)
- Include selfie-specific framing details (arm extended, mirror reflection, etc.)
- Maintain same quality and luxury as professional concepts
- Use "iPhone 15 Pro front camera selfie" or "iPhone 15 Pro mirror selfie" in Camera Composition section

**BRAND INTELLIGENCE:**

Use brand-library-2025.ts to select VARIED brands based on category and request. The brand library provides intelligent brand selection based on context:

Example outfit from brand library: ${JSON.stringify(outfitSuggestions)}

**CRITICAL BRAND VARIETY RULES:**
- Choose DIFFERENT brands for each concept (don't repeat same brands across all 6 concepts)
- Match brands to the specific request:
  * Workout/Wellness → Alo Yoga, Lululemon, Nike, Adidas
  * Luxury → The Row, Bottega Veneta, Toteme, Khaite, Brunello Cucinelli, Cartier, Hermès
  * Casual → Levi's, Adidas, New Balance, Everlane, COS
  * Travel → Lululemon, Away, Louis Vuitton (for luxury travel)
  * Cozy → UGG, Cartier (minimal luxury accent)
- Use brand names naturally in descriptions (not as labels)
- Vary brand combinations: Concept 1 might use The Row + Toteme, Concept 2 might use Khaite + Bottega Veneta, Concept 3 might use Brunello Cucinelli + Hermès
- No "MANDATORY" language - natural integration only
- Copy brands/products EXACTLY (The Row → "The Row", not "luxury brand")
- No vague language ("elegant sweater" → "The Row cream cashmere turtleneck")
- Include ALL brands/items mentioned in description

**CRITICAL:**
- This prompt field should be COMPLETE and ready for Nano Banana Pro - no transformation needed
- Generate the complete structured prompt directly - do not generate a description that needs to be transformed
- The prompt must be usable as-is for image generation
- Every brand in description must appear in prompt
- No OR statements - if description says ONE item, write ONE item
- All sentences must be complete (no fragments)

Make each concept unique, sophisticated, and based on the user's request. Use your full fashion expertise - do NOT use generic descriptions.`
}

/** Parse the raw AI response text into a validated concept array. Throws on failure. */
function parseAiConcepts(text: string): any[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    console.error("[v0] [PRO MODE] No JSON array found in AI response. Response text:", text.substring(0, 500))
    throw new Error("No JSON array found in AI response")
  }
  let parsed: any[]
  try {
    const raw = JSON.parse(jsonMatch[0])
    parsed = Array.isArray(raw)
      ? raw.filter((c: any) => {
          const valid = c && typeof c === "object" && typeof c.title === "string" && typeof c.prompt === "string"
          if (!valid) console.warn("[v0] [PRO MODE] Dropping malformed concept card:", c)
          return valid
        })
      : []
  } catch (parseError: any) {
    console.error("[v0] [PRO MODE] JSON parse error:", parseError)
    console.error("[v0] [PRO MODE] JSON string that failed to parse:", jsonMatch[0].substring(0, 500))
    throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`)
  }
  if (parsed.length === 0) {
    console.error("[v0] [PRO MODE] ❌ No valid concept cards after schema filter")
    throw new Error("No valid concept cards in AI response")
  }
  return parsed
}

/** Infer a category string from concept title + description keywords. */
function inferCategoryFromContent(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase()
  if (/wellness|yoga|fitness|workout|athletic/i.test(text)) return "WELLNESS"
  if (/luxury|elegant|chic|sophisticated|premium/i.test(text)) return "LUXURY"
  if (/fashion|street|style|editorial/i.test(text)) return "FASHION"
  if (/travel|vacation|airport|jet-set/i.test(text)) return "TRAVEL"
  if (/beauty|skincare|makeup|routine/i.test(text)) return "BEAUTY"
  return "LIFESTYLE"
}

/** Clean a raw Pro Mode prompt: inject identity phrase if missing, strip markdown, normalise whitespace. */
function sanitizeProPrompt(rawPrompt: string, fallbackTitle: string, fallbackDescription: string, index: number): string {
  let prompt = rawPrompt.trim().length > 0
    ? rawPrompt
    : `${IDENTITY_PRESERVATION_PHRASE} Professional photography. ${fallbackTitle}. ${fallbackDescription}. Shot on iPhone 15 Pro portrait mode, shallow depth of field, natural skin texture with pores visible, film grain, muted colors, authentic iPhone photo aesthetic.`

  if (!prompt.toLowerCase().includes("maintain exactly the characteristics")) {
    console.warn(`[v0] [PRO MODE] Concept ${index + 1} missing identity preservation phrase, adding it`)
    prompt = `${IDENTITY_PRESERVATION_PHRASE} ${prompt}`
  }

  const wordCount = prompt.split(/\s+/).length
  if (wordCount < 150) {
    console.warn(`[v0] [PRO MODE] Concept ${index + 1} prompt is too short (${wordCount} words, minimum 150). Maya should generate longer prompts.`)
  }

  prompt = prompt.replace(/\*\*/g, "")
  prompt = prompt
    .replace(/Outfit:\s*/gi, "")
    .replace(/Pose:\s*/gi, "")
    .replace(/Setting:\s*/gi, "")
    .replace(/Lighting:\s*/gi, "")
    .replace(/Camera Composition:\s*/gi, "")
    .replace(/Mood:\s*/gi, "")
    .replace(/Aesthetic:\s*/gi, "")
    .replace(/Camera:\s*/gi, "")
  prompt = prompt.replace(/\n{3,}/g, "\n\n")
  prompt = prompt.replace(/[ \t]+/g, " ")
  prompt = prompt.replace(/^\s+|\s+$/gm, "")
  prompt = prompt.replace(/\n\s*\n/g, "\n")
  return prompt.trim()
}

/** Build a single concept result object from raw AI data. Returns concept or throws. */
function buildConceptFromAiData(
  aiConcept: any,
  index: number,
  library: ImageLibrary,
  categoryKey: string | null,
): any {
  const safeTitle = aiConcept.title && typeof aiConcept.title === "string" ? aiConcept.title : `Concept ${index + 1}`
  const safeDescription = aiConcept.description && typeof aiConcept.description === "string" ? aiConcept.description : ""
  const safeAesthetic = aiConcept.aesthetic && typeof aiConcept.aesthetic === "string" ? aiConcept.aesthetic : undefined
  const safeBrandReferences = Array.isArray(aiConcept.brandReferences) ? aiConcept.brandReferences : []

  let safeCategory = aiConcept.category && typeof aiConcept.category === "string" ? aiConcept.category : null
  if (!safeCategory) safeCategory = inferCategoryFromContent(safeTitle, safeDescription)

  const promptCategory =
    safeCategory && typeof safeCategory === "string"
      ? safeCategory.toUpperCase()
      : categoryKey && typeof categoryKey === "string"
        ? categoryKey
        : "LIFESTYLE"

  const rawPrompt = aiConcept.prompt && typeof aiConcept.prompt === "string" ? aiConcept.prompt : ""
  const fullPrompt = sanitizeProPrompt(rawPrompt, safeTitle, safeDescription, index)

  console.log(`[v0] [PRO MODE] Using Maya's prompt for concept ${index + 1} (${fullPrompt.length} chars)`)
  console.log(`[v0] [PRO MODE] Cleaned prompt preview:`, fullPrompt.substring(0, 200))

  const mockUniversalPrompt = {
    id: `concept-${Date.now()}-${index}`,
    title: safeTitle,
    description: safeDescription,
    category: safeCategory,
    aesthetic: safeAesthetic,
    brandReferences: safeBrandReferences,
  }

  const categoryForLinking =
    promptCategory && typeof promptCategory === "string"
      ? promptCategory
      : safeCategory && typeof safeCategory === "string"
        ? safeCategory
        : "LIFESTYLE"
  const linkedImages = linkImagesToConcept(mockUniversalPrompt, library, categoryForLinking)

  return {
    id: `concept-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
    title: safeTitle,
    description: safeDescription,
    category: safeCategory,
    aesthetic: safeAesthetic,
    linkedImages: linkedImages.length > 0 ? linkedImages : undefined,
    fullPrompt,
    template: undefined,
    brandReferences: safeBrandReferences,
    stylingDetails: aiConcept.stylingDetails && typeof aiConcept.stylingDetails === "string" ? aiConcept.stylingDetails : undefined,
    technicalSpecs: aiConcept.technicalSpecs && typeof aiConcept.technicalSpecs === "string" ? aiConcept.technicalSpecs : undefined,
    prompt: fullPrompt,
    referenceImageUrl: linkedImages[0],
  }
}

/** If caller provided existing concepts, merge them with newly generated ones. */
function mergeWithProvidedConcepts(generated: any[], provided: any[]): any[] {
  return provided.map((providedConcept: any, index: number) => {
    const gen = generated[index] ?? generated[0]
    if (!gen) {
      console.error("[v0] [PRO MODE] No generated concept available for index", index)
      return providedConcept
    }
    return {
      ...providedConcept,
      fullPrompt: gen.fullPrompt ?? providedConcept.prompt,
      linkedImages: gen.linkedImages ?? providedConcept.linkedImages,
      brandReferences: gen.brandReferences ?? providedConcept.brandReferences,
      stylingDetails: gen.stylingDetails ?? providedConcept.stylingDetails,
      technicalSpecs: gen.technicalSpecs ?? providedConcept.technicalSpecs,
      prompt: gen.fullPrompt ?? providedConcept.prompt,
      referenceImageUrl: gen.linkedImages?.[0] ?? providedConcept.referenceImageUrl,
    }
  })
}


/**
 * Pro Mode Generate Concepts API Route
 *
 * Generates concepts for Studio Pro Mode using:
 * - Category detection
 * - Universal Prompts
 * - Prompt builder for full prompts
 * - Image linking logic
 */
export async function POST(req: NextRequest) {
  console.log("[v0] [PRO MODE] Generate concepts API called")

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      console.error("[v0] [PRO MODE] Authentication failed:", authError?.message || "No user")
      return NextResponse.json({ error: authError?.message || "Unauthorized" }, { status: 401 })
    }

    const user = await getEffectiveNeonUser(authUser.id)
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    console.log("[v0] [PRO MODE] User authenticated:", { userId: authUser.id, dbUserId: user.id })

    const hasCredits = await checkCredits(user.id, 1)
    if (!hasCredits) {
      console.log("[v0] [PRO MODE] User has insufficient credits for concept generation")
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }

    // ── Request parsing ────────────────────────────────────────────────────
    const body = await req.json()
    const { userRequest, imageLibrary, category, essenceWords, concepts } = body

    if (!userRequest || typeof userRequest !== "string") {
      return NextResponse.json({ error: "userRequest is required" }, { status: 400 })
    }
    if (!imageLibrary) {
      return NextResponse.json({ error: "imageLibrary is required" }, { status: 400 })
    }

    const library = normalizeImageLibrary(imageLibrary)
    if (library.selfies.length === 0) {
      return NextResponse.json(
        { error: "At least one selfie is required to generate concepts" },
        { status: 400 },
      )
    }

    // ── Category resolution ────────────────────────────────────────────────
    const { categoryKey, categoryInfo } = resolveCategory(category, userRequest, library)

    console.log("[v0] [PRO MODE] Request:", {
      userRequestLength: userRequest.length,
      categoryHint: categoryInfo?.name ?? categoryKey ?? "none - Maya will determine dynamically",
      essenceWords: essenceWords || "none",
      hasConcepts: !!concepts,
      conceptsCount: Array.isArray(concepts) ? concepts.length : 0,
      imageLibraryCounts: {
        selfies: library.selfies.length,
        products: library.products.length,
        people: library.people.length,
        vibes: library.vibes.length,
      },
    })

    // ── Brand intelligence ─────────────────────────────────────────────────
    const brandLibraryCategory = mapProCategoryToBrandLibrary(categoryKey)
    const outfitSuggestions = brandLibraryCategory
      ? generateCompleteOutfit(brandLibraryCategory, categoryInfo?.name?.toLowerCase() ?? "")
      : generateCompleteOutfit("casual", "")

    // ── AI generation ──────────────────────────────────────────────────────
    const mayaPersonality = getMayaSystemPrompt(MAYA_PRO_CONFIG)
    const aiPrompt = buildAiPrompt({
      mayaPersonality,
      userRequest,
      categoryInfo,
      categoryKey,
      library,
      essenceWords,
      outfitSuggestions,
    })

    console.log(
      "[v0] [PRO MODE] Generating concepts with AI using Maya's personality:",
      userRequest.substring(0, 100),
    )

    let generatedConcepts: any[] = []
    try {
      const { text } = await generateText({
        model: createMayaOpenRouterModel("chat_pro"),
        prompt: aiPrompt,
        temperature: 0.85,
      })

      const aiConcepts = parseAiConcepts(text)

      console.log(
        "[v0] [PRO MODE] Maya generated concepts:",
        aiConcepts.map((c: any) => ({
          title: c.title?.substring(0, 50),
          description: c.description?.substring(0, 100),
          category: c.category,
        })),
      )

      const conceptResults = aiConcepts.flatMap((aiConcept: any, index: number) => {
        try {
          return [buildConceptFromAiData(aiConcept, index, library, categoryKey)]
        } catch (conceptError: any) {
          console.error(`[v0] [PRO MODE] Error building concept ${index + 1}:`, conceptError)
          return []
        }
      })

      if (conceptResults.length === 0) {
        throw new Error("AI generation returned empty or invalid concepts array")
      }

      generatedConcepts = conceptResults

      console.log("[v0] [PRO MODE] Generated", generatedConcepts.length, "concepts using AI")
      console.log(
        "[v0] [PRO MODE] Concept details:",
        generatedConcepts.map((c: any) => ({
          id: c.id,
          title: c.title?.substring(0, 30),
          category: c.category,
          linkedImagesCount: c.linkedImages?.length || 0,
          hasFullPrompt: !!c.fullPrompt,
        })),
      )
    } catch (aiError: any) {
      console.error("[v0] [PRO MODE] AI generation error:", aiError)
      console.error("[v0] [PRO MODE] Error stack:", aiError.stack)
      return NextResponse.json(
        {
          error: "Failed to generate concepts with AI",
          details: aiError.message || "Unknown error occurred during concept generation",
        },
        { status: 500 },
      )
    }

    // ── Response ───────────────────────────────────────────────────────────
    let finalConcepts: any[]
    if (Array.isArray(concepts) && concepts.length > 0) {
      console.log("[v0] [PRO MODE] Enhancing", concepts.length, "provided concepts")
      finalConcepts = mergeWithProvidedConcepts(generatedConcepts, concepts)
    } else {
      finalConcepts = generatedConcepts
    }

    return NextResponse.json({
      state: "ready",
      concepts: finalConcepts,
      category: categoryKey,
      count: finalConcepts.length,
    })
  } catch (error: any) {
    console.error("[v0] [PRO MODE] Generate concepts API error:", error)
    console.error("[v0] [PRO MODE] Error stack:", error.stack)
    console.error("[v0] [PRO MODE] Error details:", {
      message: error.message,
      name: error.name,
      cause: error.cause,
    })

    const errorMessage = error.message || "Internal server error"
    const isNullReference =
      errorMessage.includes("Cannot read properties of null") || errorMessage.includes("toLowerCase")

    return NextResponse.json(
      {
        error: isNullReference
          ? "An internal error occurred while processing your request. Please try again with more specific details."
          : errorMessage,
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    )
  }
}
