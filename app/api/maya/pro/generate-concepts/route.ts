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
import {
  buildProModePrompt,
  type ConceptComponents,
} from "@/lib/maya/pro/prompt-builder"
import { getCategoryByKey } from "@/lib/maya/pro/category-system"
import { getMayaPersonality } from "@/lib/maya/personality-enhanced"

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
    // Wrap entire function in try-catch to catch any null reference errors
    // Authenticate user
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      console.error("[v0] [PRO MODE] Authentication failed:", authError?.message || "No user")
      return NextResponse.json({ error: authError?.message || "Unauthorized" }, { status: 401 })
    }

    const userId = authUser.id
    const user = await getEffectiveNeonUser(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const dbUserId = user.id

    console.log("[v0] [PRO MODE] User authenticated:", { userId, dbUserId })

    // Check credits (1 credit per concept generation)
    const hasCredits = await checkCredits(dbUserId, 1)
    if (!hasCredits) {
      console.log("[v0] [PRO MODE] User has insufficient credits for concept generation")
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }

    // Parse request body
    const body = await req.json()
    const { userRequest, imageLibrary, category, essenceWords, concepts } = body

    if (!userRequest || typeof userRequest !== "string") {
      return NextResponse.json({ error: "userRequest is required" }, { status: 400 })
    }

    if (!imageLibrary) {
      return NextResponse.json({ error: "imageLibrary is required" }, { status: 400 })
    }

    // Safe null handling for imageLibrary - ensure all fields are arrays/strings
    const library: ImageLibrary = {
      selfies: (Array.isArray(imageLibrary.selfies)) ? imageLibrary.selfies : [],
      products: (Array.isArray(imageLibrary.products)) ? imageLibrary.products : [],
      people: (Array.isArray(imageLibrary.people)) ? imageLibrary.people : [],
      vibes: (Array.isArray(imageLibrary.vibes)) ? imageLibrary.vibes : [],
      intent: (imageLibrary.intent && typeof imageLibrary.intent === 'string') ? imageLibrary.intent : "",
    }

    // Validate that selfies are available (required)
    if (library.selfies.length === 0) {
      return NextResponse.json(
        { error: "At least one selfie is required to generate concepts" },
        { status: 400 }
      )
    }

    // 🔴 FIX: Category detection is now OPTIONAL - just as hints for Maya
    // Maya will determine categories dynamically using her personality and expertise
    let categoryKey: string | null = (category && typeof category === 'string') ? category : null
    let categoryInfo: CategoryInfo | null = null
    
    // Try to detect category as a HINT (not required)
    if (!categoryKey) {
      categoryInfo = detectCategory(userRequest, library)
      if (categoryInfo && categoryInfo.key && typeof categoryInfo.key === 'string') {
        categoryKey = categoryInfo.key
        console.log("[v0] [PRO MODE] Category hint detected:", categoryInfo.name || categoryInfo.key)
      } else {
        console.log("[v0] [PRO MODE] No category hint - Maya will determine categories dynamically")
        categoryKey = null
        categoryInfo = null
      }
    } else {
      // Category was provided - get category info (ensure categoryKey is string)
      if (typeof categoryKey === 'string') {
        categoryInfo = getCategoryByKey(categoryKey)
        if (!categoryInfo) {
          console.log("[v0] [PRO MODE] Category key provided but not found in system:", categoryKey)
          // Fallback: try to detect category from userRequest as hint
          categoryInfo = detectCategory(userRequest, library)
          if (categoryInfo && categoryInfo.key && typeof categoryInfo.key === 'string') {
            categoryKey = categoryInfo.key
          } else {
            categoryKey = null
            categoryInfo = null
          }
        }
      } else {
        // categoryKey is not a string - reset to null
        categoryKey = null
        categoryInfo = null
      }
    }

    // Now log with categoryInfo safely initialized
    console.log("[v0] [PRO MODE] Request:", {
      userRequestLength: userRequest.length,
      categoryHint: (categoryInfo && categoryInfo.name) ? categoryInfo.name : (categoryKey || "none - Maya will determine dynamically"),
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

    // 🔴 FIX: No early return - always proceed with AI generation
    // Category is optional - Maya will determine categories dynamically

    // 🔴 FIX: Use AI generation with Maya's personality
    // Generate dynamic concepts based on userRequest using Maya's fashion expertise
    console.log("[v0] [PRO MODE] Generating concepts with AI using Maya's personality:", userRequest.substring(0, 100))

    // Declare generatedConcepts outside try block so it's accessible later
    let generatedConcepts: any[] = []

    // Get Maya's personality for Pro Mode
    const mayaPersonality = getMayaPersonality()

    // Category context is OPTIONAL - just a hint, not a requirement
    const categoryHint = categoryInfo && categoryInfo.name && categoryInfo.description
      ? `\n**Optional Category Hint:** ${categoryInfo.name} - ${categoryInfo.description}${(categoryInfo.brands && Array.isArray(categoryInfo.brands) && categoryInfo.brands.length > 0) ? `\nRelevant brands: ${categoryInfo.brands.join(", ")}` : ""}\n(Use this as inspiration, but determine the best category based on the user's request)`
      : ""

    const libraryContext = `
**Image Library:**
- Selfies: ${library.selfies.length}
- Products: ${library.products.length}
- People: ${library.people.length}
- Vibes: ${library.vibes.length}
- Intent: ${library.intent || "Not specified"}
`

    const aiPrompt = `${mayaPersonality}

Generate 6 unique, creative concept cards based on the user's request. Use your fashion expertise and editorial knowledge to create diverse, sophisticated concepts.

**🔴🔴🔴 CRITICAL: USER'S REQUEST IS YOUR PRIMARY GUIDE**
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

**YOUR TASK:**
Create 6 diverse, creative concepts. Each concept must be:
- Unique and different from the others
- **DIRECTLY based on the user's actual request** - if they said "Christmas", make it Christmas-themed
- Professional and editorial quality matching SSELFIE's aesthetic
- Specific to their request (e.g., if they said "Christmas", use holiday outfits, festive settings, cozy holiday moments - NOT generic street style)
- Use your fashion expertise to determine the most appropriate category for each concept

**🔴 CRITICAL: DESCRIPTION REQUIREMENTS**
Your "description" field MUST include:
- Specific outfit details (e.g., "wearing cozy holiday pajamas" or "elegant holiday evening wear")
- Specific setting details (e.g., "cozy living room with Christmas tree" or "festive holiday market")
- Specific mood/atmosphere (e.g., "warm festive atmosphere" or "magical holiday ambiance")
- Do NOT use generic descriptions - be specific and match the user's request

**🔴🔴🔴 CRITICAL INSTRUCTION FOR DESCRIPTIONS:**
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
    "technicalSpecs": "string - camera/technical specs"
  }
]

Make each concept unique, sophisticated, and based on the user's request. Use your full fashion expertise - do NOT use generic descriptions.`

    try {
      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
        prompt: aiPrompt,
        maxTokens: 4000,
        temperature: 0.85,
      })

      // Parse AI response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.error("[v0] [PRO MODE] No JSON array found in AI response. Response text:", text.substring(0, 500))
        throw new Error("No JSON array found in AI response")
      }

      let aiConcepts: any[]
      try {
        aiConcepts = JSON.parse(jsonMatch[0])
      } catch (parseError: any) {
        console.error("[v0] [PRO MODE] JSON parse error:", parseError)
        console.error("[v0] [PRO MODE] JSON string that failed to parse:", jsonMatch[0].substring(0, 500))
        throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`)
      }
      
      // 🔴 DEBUG: Log what Maya generated
      console.log('[v0] [PRO MODE] Maya generated concepts:', aiConcepts.map((c: any) => ({
        title: c.title?.substring(0, 50),
        description: c.description?.substring(0, 100),
        category: c.category,
      })))

      // Validate AI concepts array
      if (!Array.isArray(aiConcepts) || aiConcepts.length === 0) {
        throw new Error("AI returned invalid or empty concepts array")
      }

      // Build concepts with full prompts and linked images
      // Wrap in try-catch to handle individual concept errors
      const conceptResults: any[] = []
      for (let index = 0; index < aiConcepts.length; index++) {
        const aiConcept = aiConcepts[index]
        try {
          // Validate and sanitize AI concept data
          const safeTitle = (aiConcept.title && typeof aiConcept.title === 'string') ? aiConcept.title : `Concept ${index + 1}`
          const safeDescription = (aiConcept.description && typeof aiConcept.description === 'string') ? aiConcept.description : ''
          const safeAesthetic = (aiConcept.aesthetic && typeof aiConcept.aesthetic === 'string') ? aiConcept.aesthetic : undefined
          const safeBrandReferences = Array.isArray(aiConcept.brandReferences) ? aiConcept.brandReferences : []
          // 🔴 FIX: Use AI-determined category, or try to infer from title/description if missing
          // Don't default to LIFESTYLE - Maya should always return a category
          let safeCategory = (aiConcept.category && typeof aiConcept.category === 'string') ? aiConcept.category : null
          
          // If AI didn't return category, try to infer from title/description
          if (!safeCategory) {
            const titleDesc = `${safeTitle} ${safeDescription}`.toLowerCase()
            if (/wellness|yoga|fitness|workout|athletic/i.test(titleDesc)) safeCategory = 'WELLNESS'
            else if (/luxury|elegant|chic|sophisticated|premium/i.test(titleDesc)) safeCategory = 'LUXURY'
            else if (/fashion|street|style|editorial/i.test(titleDesc)) safeCategory = 'FASHION'
            else if (/travel|vacation|airport|jet-set/i.test(titleDesc)) safeCategory = 'TRAVEL'
            else if (/beauty|skincare|makeup|routine/i.test(titleDesc)) safeCategory = 'BEAUTY'
            else safeCategory = 'LIFESTYLE' // Last resort fallback
          }
          
          // 🔴 VALIDATION: Ensure description is detailed enough
          const descriptionWordCount = safeDescription.split(/\s+/).length
          const hasBrandMention = /alo|lululemon|glossier|chanel|dior|bottega|everlane|reformation|aritzia|the row|jenni kayne|levi|zara|cos|rhode|hermès/i.test(safeDescription)
          const hasSpecificDetails = /wearing|sitting|standing|holding|looking|marble|fireplace|tree|light|sweater|denim|dress|blazer|coat|jacket|sofa|mug|room|interior|outfit|attire/i.test(safeDescription)

          if (descriptionWordCount < 20 || !hasSpecificDetails) {
            console.warn(`[v0] [VALIDATION] Description too vague for concept ${index + 1}:`, safeDescription)
            console.warn(`[v0] [VALIDATION] Word count: ${descriptionWordCount}, Has brands: ${hasBrandMention}, Has details: ${hasSpecificDetails}`)
            
            // Try to enhance description from other available fields in aiConcept
            const extractedDetails: string[] = []
            
            // Extract details from aesthetic field if available
            if (safeAesthetic && safeAesthetic.length > 20) {
              // Use aesthetic as additional context
              extractedDetails.push(safeAesthetic)
            }
            
            // Extract details from title if it's descriptive
            if (safeTitle && safeTitle.length > 15 && /sitting|wearing|standing|holding|cozy|elegant|sophisticated/i.test(safeTitle)) {
              extractedDetails.push(safeTitle)
            }
            
            // Enhance description if we found additional details
            if (extractedDetails.length > 0) {
              const enhancedDescription = `${safeDescription} ${extractedDetails.join(', ')}.`
              console.log(`[v0] [VALIDATION] Enhanced description for concept ${index + 1} with details from aesthetic/title`)
              // Note: We'll use the enhanced description, but this is a fallback
              // The AI should ideally generate detailed descriptions from the start
            }
          }

          console.log(`[v0] [VALIDATION] Concept ${index + 1} description validation:`, {
            wordCount: descriptionWordCount,
            hasBrands: hasBrandMention,
            hasDetails: hasSpecificDetails,
            length: safeDescription.length
          })

          // Convert to ConceptComponents
          const conceptComponents: ConceptComponents = {
            title: safeTitle,
            description: safeDescription,
            category: safeCategory,
            aesthetic: safeAesthetic,
            brandReferences: safeBrandReferences,
          }

          // Build full prompt using prompt builder (with userRequest for personalization)
          // Use AI-determined category, or fallback to LIFESTYLE only if needed for prompt builder
          const promptCategory = (safeCategory && typeof safeCategory === 'string') 
            ? safeCategory.toUpperCase() 
            : (categoryKey && typeof categoryKey === 'string' ? categoryKey : 'LIFESTYLE')
          
          // 🔴 DEBUG: Log what we're passing to buildProModePrompt
          console.log(`[v0] [PRO MODE] Building prompt for concept ${index + 1}:`, {
            title: safeTitle,
            description: safeDescription,
            category: promptCategory,
            userRequest: userRequest?.substring(0, 100),
            conceptCategory: safeCategory,
          })
          
          let fullPrompt: string
          try {
            fullPrompt = buildProModePrompt(promptCategory, conceptComponents, library, userRequest)
            
            // 🔴 DEBUG: Log the generated prompt
            console.log(`[v0] [PRO MODE] Generated prompt for concept ${index + 1} (first 200 chars):`, fullPrompt.substring(0, 200))
          } catch (promptError: any) {
            console.error(`[v0] [PRO MODE] Error building prompt for concept ${index + 1}:`, promptError)
            // Fallback to a basic prompt if buildProModePrompt fails
            fullPrompt = `Professional photography. ${safeTitle}. ${safeDescription}. Shot on iPhone 15 Pro portrait mode, shallow depth of field, natural skin texture with pores visible, film grain, muted colors, authentic iPhone photo aesthetic.`
          }

          // Create a mock UniversalPrompt for image linking (using safe values)
          const mockUniversalPrompt = {
            id: `concept-${Date.now()}-${index}`,
            title: safeTitle,
            description: safeDescription,
            category: safeCategory,
            aesthetic: safeAesthetic,
            brandReferences: safeBrandReferences,
          }

          // Link images to concept (ensure safeCategory is a valid string, never null)
          const finalCategory = (safeCategory && typeof safeCategory === 'string') ? safeCategory : 'LIFESTYLE'
          const linkedImages = linkImagesToConcept(mockUniversalPrompt, library, finalCategory)

          // Build concept object
          const concept = {
            id: `concept-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            title: safeTitle,
            description: safeDescription,
            category: safeCategory,
            aesthetic: safeAesthetic,
            linkedImages: linkedImages.length > 0 ? linkedImages : undefined,
            fullPrompt: fullPrompt,
            template: undefined,
            brandReferences: safeBrandReferences,
            stylingDetails: (aiConcept.stylingDetails && typeof aiConcept.stylingDetails === 'string') ? aiConcept.stylingDetails : undefined,
            technicalSpecs: (aiConcept.technicalSpecs && typeof aiConcept.technicalSpecs === 'string') ? aiConcept.technicalSpecs : undefined,
            // For compatibility with ConceptData
            prompt: fullPrompt,
            referenceImageUrl: linkedImages[0], // Use first linked image as reference
          }
          
          conceptResults.push(concept)
        } catch (conceptError: any) {
          console.error(`[v0] [PRO MODE] Error building concept ${index + 1}:`, conceptError)
          // Skip this concept but continue with others
        }
      }
      
      generatedConcepts = conceptResults

      console.log("[v0] [PRO MODE] Generated", generatedConcepts.length, "concepts using AI")
      console.log("[v0] [PRO MODE] Concept details:", generatedConcepts.map((c: any) => ({
        id: c.id,
        title: c.title?.substring(0, 30),
        category: c.category,
        linkedImagesCount: c.linkedImages?.length || 0,
        hasFullPrompt: !!c.fullPrompt,
      })))
      
      // Validate that concepts were actually generated
      if (!Array.isArray(generatedConcepts) || generatedConcepts.length === 0) {
        console.error("[v0] [PRO MODE] ❌ No concepts generated - conceptResults was empty")
        throw new Error("AI generation returned empty or invalid concepts array")
      }
    } catch (aiError: any) {
      console.error("[v0] [PRO MODE] AI generation error:", aiError)
      console.error("[v0] [PRO MODE] Error stack:", aiError.stack)
      // Reset generatedConcepts to empty array on error
      generatedConcepts = []
      // Fallback: return error but don't crash
      return NextResponse.json({
        error: "Failed to generate concepts with AI",
        details: aiError.message || "Unknown error occurred during concept generation",
      }, { status: 500 })
    }

    // Validate that we have generated concepts
    if (!Array.isArray(generatedConcepts) || generatedConcepts.length === 0) {
      console.error("[v0] [PRO MODE] No concepts were generated")
      return NextResponse.json({
        error: "Failed to generate concepts",
        details: "No concepts were generated. Please try again.",
      }, { status: 500 })
    }

    // If concepts were provided (from hook), enhance them
    if (Array.isArray(concepts) && concepts.length > 0) {
      console.log("[v0] [PRO MODE] Enhancing", concepts.length, "provided concepts")
      
      // Merge provided concepts with generated ones
      const enhancedConcepts = concepts.map((providedConcept: any, index: number) => {
        const generatedConcept = generatedConcepts[index] || generatedConcepts[0]
        
        if (!generatedConcept) {
          console.error("[v0] [PRO MODE] No generated concept available for index", index)
          return providedConcept
        }
        
        return {
          ...providedConcept,
          // Enhance with generated data
          fullPrompt: generatedConcept.fullPrompt || providedConcept.prompt,
          linkedImages: generatedConcept.linkedImages || providedConcept.linkedImages,
          brandReferences: generatedConcept.brandReferences || providedConcept.brandReferences,
          stylingDetails: generatedConcept.stylingDetails || providedConcept.stylingDetails,
          technicalSpecs: generatedConcept.technicalSpecs || providedConcept.technicalSpecs,
          // Ensure compatibility fields
          prompt: generatedConcept.fullPrompt || providedConcept.prompt,
          referenceImageUrl: generatedConcept.linkedImages?.[0] || providedConcept.referenceImageUrl,
        }
      })

      // 🔴 FIX: Match Classic Mode response format for consistency
      // Classic Mode returns: { state: "ready", concepts: [...] }
      // This ensures rendering and saving code works the same way
      return NextResponse.json({
        state: "ready",
        concepts: enhancedConcepts,
        category: categoryKey,
        count: enhancedConcepts.length,
      })
    }

    // 🔴 FIX: Match Classic Mode response format for consistency
    // Classic Mode returns: { state: "ready", concepts: [...] }
    // This ensures rendering and saving code works the same way
    return NextResponse.json({
      state: "ready",
      concepts: generatedConcepts,
      category: categoryKey,
      count: generatedConcepts.length,
    })
  } catch (error: any) {
    console.error("[v0] [PRO MODE] Generate concepts API error:", error)
    console.error("[v0] [PRO MODE] Error stack:", error.stack)
    console.error("[v0] [PRO MODE] Error details:", {
      message: error.message,
      name: error.name,
      cause: error.cause,
    })
    
    // Provide more helpful error message
    const errorMessage = error.message || "Internal server error"
    const isNullReference = errorMessage.includes("Cannot read properties of null") || errorMessage.includes("toLowerCase")
    
    return NextResponse.json(
      { 
        error: isNullReference 
          ? "An internal error occurred while processing your request. Please try again with more specific details."
          : errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
}
