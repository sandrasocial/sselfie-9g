/**
 * Generation Helpers
 * 
 * Reusable helper functions for feed planner prompt generation.
 * Extracted from app/api/feed/[feedId]/generate-single/route.ts to eliminate duplication.
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

interface PersonalBrand {
  visual_aesthetic?: string | unknown[] | null
  fashion_style?: string | unknown[] | null
  settings_preference?: string | unknown[] | null
}

interface BlueprintSubscriber {
  form_data?: { vibe?: string } | null
  feed_style?: string | null
}

interface FeedLayout {
  id?: string | number
  feed_style?: string | null
}

interface User {
  id: string | number
}

interface GetCategoryAndMoodOptions {
  /**
   * Whether to check settings_preference (SECONDARY source)
   * Default: true
   */
  checkSettingsPreference?: boolean
  
  /**
   * Whether to check blueprint_subscribers (FALLBACK for legacy)
   * Default: true
   */
  checkBlueprintSubscribers?: boolean
  
  /**
   * Whether to track and log source used
   * Default: false
   */
  trackSource?: boolean
  
  /**
   * Order by field for user_personal_brand query
   * 'created_at' for free users, 'updated_at' for paid blueprint users
   * Default: 'created_at'
   */
  orderBy?: 'created_at' | 'updated_at'
  
  /**
   * Default category when no brand context exists
   * 'minimal' for lifestyle/neutral aesthetic (default for all users)
   * Only use 'professional' when explicitly required
   * Default: 'minimal'
   */
  defaultCategory?: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
}

interface GetCategoryAndMoodResult {
  category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
  mood: "luxury" | "minimal" | "beige"
  visualAesthetic?: string // Raw user choice (e.g., "Warm & Cozy", "Clean & Minimalistic")
  sourceUsed?: string
}

/**
 * Phase 1C: Map visual aesthetic string to category with partial matching
 * Phase 1D: Extended with explicit allowlist for known onboarding variants
 * 
 * Supports partial matching to handle values like "beige feed", "beige aesthetic", etc.
 * 
 * @param aesthetic - Raw visual aesthetic string (e.g., "beige feed", "luxury minimal")
 * @returns Category string or null if no match found
 */
export function mapVisualAestheticToCategory(aesthetic: string | null | undefined): "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" | null {
  if (!aesthetic) return null
  
  const normalized = aesthetic.toLowerCase().trim()
  
  // Phase 1D: Explicit allowlist for known onboarding variants (deterministic)
  // These are proven to exist in UI/onboarding flows
  const explicitMappings: Record<string, "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"> = {
    // Beige variants
    'beige feed': 'beige',
    'beige aesthetic': 'beige',
    'beige creamy': 'beige',
    'beige': 'beige',
    
    // Minimal variants
    'minimalist': 'minimal',
    'minimalist & clean': 'minimal',
    'minimal': 'minimal',
    'editorial monochrome': 'minimal',
    'clean girl': 'minimal',
    'clean': 'minimal',
    
    // Luxury variants
    'luxurious': 'luxury',
    'luxurious & polished': 'luxury',
    'luxury': 'luxury',
    
    // Warm variants
    'warm': 'warm',
    'warm & terracotta': 'warm',
    'warm terracotta': 'warm',
    
    // Edgy variants
    'edgy': 'edgy',
    'edgy & modern': 'edgy',
    
    // Professional variants
    'professional': 'professional',
    'business': 'professional',
    'corporate': 'professional',
    'business professional': 'professional',
  }
  
  // Check explicit mappings first (exact match)
  if (explicitMappings[normalized]) {
    return explicitMappings[normalized]
  }
  
  // Phase 1C: Partial contains matching (order matters - check more specific first)
  if (normalized.includes('beige')) return 'beige'
  if (normalized.includes('minimal')) return 'minimal'
  if (normalized.includes('luxury') || normalized.includes('luxurious')) return 'luxury'
  if (normalized.includes('warm')) return 'warm'
  if (normalized.includes('edgy')) return 'edgy'
  if (normalized.includes('professional') || normalized.includes('business') || normalized.includes('corporate')) {
    return 'professional'
  }
  
  // No match found
  return null
}

/**
 * Get category and mood for template selection
 * 
 * Priority order:
 * 1. feed_layouts.feed_style (PRIMARY) - Per-feed style selection
 * 2. user_personal_brand.settings_preference[0] (SECONDARY) - Synced from feed style modal
 * 3. user_personal_brand.visual_aesthetic[0] (for category only)
 * 4. blueprint_subscribers (FALLBACK) - Legacy blueprint wizard (if enabled)
 * 5. Default: "professional" / "minimal"
 * 
 * @param feedLayout - Feed layout with feed_style
 * @param user - User object with id
 * @param options - Options to control fallback behavior
 * @returns Category and mood with optional source tracking
 */
export async function getCategoryAndMood(
  feedLayout: FeedLayout | null | undefined,
  user: User,
  options: GetCategoryAndMoodOptions = {}
): Promise<GetCategoryAndMoodResult> {
  const {
    checkSettingsPreference = true,
    checkBlueprintSubscribers = true,
    trackSource = false,
    orderBy = 'created_at',
    defaultCategory = 'minimal'  // Changed from 'professional' - neutral lifestyle default
  } = options

  let category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" = defaultCategory
  let mood: "luxury" | "minimal" | "beige" = "minimal"
  let visualAesthetic: string | undefined
  let sourceUsed = "default"

  // PRIMARY SOURCE 1: feed_layouts.visual_aesthetic (feed-specific override, highest priority)
  // This is feed-specific and should always take priority over personal brand
  if (feedLayout?.visual_aesthetic) {
    try {
      const feedVisualAesthetic = Array.isArray(feedLayout.visual_aesthetic)
        ? feedLayout.visual_aesthetic
        : JSON.parse(feedLayout.visual_aesthetic)
      
      if (Array.isArray(feedVisualAesthetic) && feedVisualAesthetic.length > 0) {
        const firstAesthetic = feedVisualAesthetic[0]
        const firstAestheticLower = typeof firstAesthetic === 'string' ? firstAesthetic.toLowerCase().trim() : String(firstAesthetic).toLowerCase().trim()
        const validCategories = ["luxury", "minimal", "beige", "warm", "edgy", "professional"]
        
        if (validCategories.includes(firstAestheticLower)) {
          category = firstAestheticLower as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
          visualAesthetic = typeof firstAesthetic === 'string' ? firstAesthetic : String(firstAesthetic)
          sourceUsed = "feed_visual_aesthetic"
          if (trackSource) {
            console.log(`[v0] [GENERATE-SINGLE] ✅ Using feed-specific visual_aesthetic (PRIORITY 1): ${category}`)
          }
        }
      }
    } catch (e) {
      console.warn(`[v0] [GENERATE-SINGLE] Failed to parse feed visual_aesthetic:`, e)
    }
  }

  // PRIMARY SOURCE 2: feed_layouts.feed_style (per-feed style selection from modal)
  // This is feed-specific and should take priority over personal brand
  if (feedLayout?.feed_style) {
    const feedStyle = feedLayout.feed_style.toLowerCase().trim()
    if (feedStyle === "luxury" || feedStyle === "minimal" || feedStyle === "beige") {
      mood = feedStyle as "luxury" | "minimal" | "beige"
      if (sourceUsed === "default") {
        sourceUsed = "feed_style"
      }
      if (trackSource) {
        console.log(`[v0] [GENERATE-SINGLE] ✅ Using feed's feed_style (PRIORITY 2): ${feedStyle}`)
      }
    }
  }

  // FALLBACK SOURCE: user_personal_brand.settings_preference[0] and visual_aesthetic
  // Only used if feed-specific values are not set (legacy feeds or missing data)
  if (checkSettingsPreference && (sourceUsed === "default" || category === defaultCategory)) {
    // Use orderBy parameter (created_at for free users, updated_at for paid blueprint users)
    const personalBrand = orderBy === 'updated_at'
      ? await sql`
          SELECT settings_preference, visual_aesthetic
          FROM user_personal_brand
          WHERE user_id = ${user.id}
          ORDER BY updated_at DESC
          LIMIT 1
        ` as PersonalBrand[]
      : await sql`
          SELECT settings_preference, visual_aesthetic
          FROM user_personal_brand
          WHERE user_id = ${user.id}
          ORDER BY created_at DESC
          LIMIT 1
        ` as PersonalBrand[]

    if (personalBrand && personalBrand.length > 0) {
      if (trackSource) {
        console.log(`[v0] [GENERATE-SINGLE] [TEMPLATE DEBUG] user_personal_brand found:`, {
          visual_aesthetic: personalBrand[0].visual_aesthetic,
          settings_preference: personalBrand[0].settings_preference
        })
      }

      // Extract feedStyle from settings_preference (first element of JSONB array)
      // This is synced from feed style modal when user selects feed style
      let feedStyle: string | null = null
      if (personalBrand[0].settings_preference) {
        try {
          const settings = typeof personalBrand[0].settings_preference === 'string'
            ? JSON.parse(personalBrand[0].settings_preference)
            : personalBrand[0].settings_preference

          if (Array.isArray(settings) && settings.length > 0) {
            feedStyle = settings[0] // First element is feedStyle (synced from feed style modal)
          }
        } catch (e) {
          console.warn(`[v0] [GENERATE-SINGLE] Failed to parse settings_preference:`, e)
        }
      }

      // Map feedStyle to mood (values are already exact: "luxury", "minimal", "beige")
      if (feedStyle) {
        const feedStyleLower = feedStyle.toLowerCase().trim()
        if (feedStyleLower === "luxury" || feedStyleLower === "minimal" || feedStyleLower === "beige") {
          mood = feedStyleLower as "luxury" | "minimal" | "beige"
          sourceUsed = "settings_preference"
          if (trackSource) {
            console.log(`[v0] [GENERATE-SINGLE] ✅ Using settings_preference[0] (SECONDARY): ${feedStyle}`)
          }
        }
      }

      // Phase 1C: Extract category from visual_aesthetic with partial matching support
      if (personalBrand[0].visual_aesthetic) {
        try {
          const aesthetics = typeof personalBrand[0].visual_aesthetic === 'string'
            ? JSON.parse(personalBrand[0].visual_aesthetic)
            : personalBrand[0].visual_aesthetic

          if (Array.isArray(aesthetics) && aesthetics.length > 0) {
            const firstAesthetic = aesthetics[0]
            // Store raw aesthetic string for prompt generation
            if (!visualAesthetic) {
              visualAesthetic = typeof firstAesthetic === 'string' ? firstAesthetic : String(firstAesthetic)
            }
            
            // Phase 1C: Try partial matching first (handles "beige feed", "beige aesthetic", etc.)
            const mappedCategory = mapVisualAestheticToCategory(firstAesthetic)
            if (mappedCategory) {
              category = mappedCategory
              if (trackSource) {
                console.log(`[v0] [GENERATE-SINGLE] ✅ Mapped visual_aesthetic "${firstAesthetic}" to category "${mappedCategory}" via partial matching`)
              }
            } else {
              // Phase 1D: Log unmapped visual_aesthetic values (non-sensitive audit)
              const normalizedAesthetic = firstAesthetic?.toLowerCase().trim() || ''
              console.log(`[UNMAPPED-AESTHETIC] routeId=EP-05 unmapped_aesthetic length=${firstAesthetic?.length || 0} normalized="${normalizedAesthetic.substring(0, 50)}"`)
              // Fallback to exact match (backward compatibility)
              const firstAestheticLower = firstAesthetic?.toLowerCase().trim()
              const validCategories: Array<"luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"> =
                ["luxury", "minimal", "beige", "warm", "edgy", "professional"]

              if (firstAestheticLower && validCategories.includes(firstAestheticLower as any)) {
                category = firstAestheticLower as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
                if (trackSource) {
                  console.log(`[v0] [GENERATE-SINGLE] ✅ Mapped visual_aesthetic "${firstAesthetic}" to category "${category}" via exact match`)
                }
              }
            }
          }
        } catch (e) {
          console.warn(`[v0] [GENERATE-SINGLE] Failed to parse visual_aesthetic:`, e)
        }
      }

      sourceUsed = "unified_wizard"
      if (trackSource) {
        console.log(`[v0] [GENERATE-SINGLE] ✅ Found user_personal_brand data: ${category}_${mood}`)
      }
    } else if (checkBlueprintSubscribers) {
      // FALLBACK: Check blueprint_subscribers (legacy blueprint wizard)
      if (trackSource) {
        console.log(`[v0] [GENERATE-SINGLE] ⚠️ No user_personal_brand data, checking blueprint_subscribers (legacy)...`)
      }

      const blueprintSubscriber = await sql`
        SELECT form_data, feed_style
        FROM blueprint_subscribers
        WHERE user_id = ${user.id}
        LIMIT 1
      ` as BlueprintSubscriber[]

      if (trackSource) {
        console.log(`[v0] [GENERATE-SINGLE] [TEMPLATE DEBUG] blueprint_subscribers:`, {
          form_data: blueprintSubscriber[0]?.form_data,
          feed_style: blueprintSubscriber[0]?.feed_style
        })
      }

      if (blueprintSubscriber.length > 0) {
        const formData = blueprintSubscriber[0].form_data || {}
        const feedStyle = blueprintSubscriber[0].feed_style || null

        // Get category from form_data.vibe (legacy blueprint support)
        // Changed: No longer defaults to "professional" - uses defaultCategory instead
        category = (formData.vibe || defaultCategory) as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
        // Get mood from feed_style (same as old blueprint)
        mood = (feedStyle || "minimal") as "luxury" | "minimal" | "beige"

        sourceUsed = "legacy_blueprint"
        if (trackSource) {
          console.log(`[v0] [GENERATE-SINGLE] ✅ Found blueprint_subscribers data: ${category}_${mood}`)
        }
      } else {
        // No data in either source - use default
        sourceUsed = "default"
        if (trackSource) {
          console.log(`[v0] [GENERATE-SINGLE] ⚠️ No wizard data found in either source. Using defaults: professional_minimal`)
        }
      }
    }
  } else if (!checkSettingsPreference) {
    // For preview feeds: Get category from user_personal_brand.visual_aesthetic only
    const personalBrand = orderBy === 'updated_at'
      ? await sql`
          SELECT visual_aesthetic
          FROM user_personal_brand
          WHERE user_id = ${user.id}
          ORDER BY updated_at DESC
          LIMIT 1
        ` as PersonalBrand[]
      : await sql`
          SELECT visual_aesthetic
          FROM user_personal_brand
          WHERE user_id = ${user.id}
          ORDER BY created_at DESC
          LIMIT 1
        ` as PersonalBrand[]

    if (personalBrand && personalBrand.length > 0 && personalBrand[0].visual_aesthetic) {
      try {
        const aesthetics = typeof personalBrand[0].visual_aesthetic === 'string'
          ? JSON.parse(personalBrand[0].visual_aesthetic)
          : personalBrand[0].visual_aesthetic

        if (Array.isArray(aesthetics) && aesthetics.length > 0) {
          const firstAesthetic = aesthetics[0]?.toLowerCase().trim()
          const validCategories: Array<"luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"> =
            ["luxury", "minimal", "beige", "warm", "edgy", "professional"]

          if (firstAesthetic && validCategories.includes(firstAesthetic as any)) {
            category = firstAesthetic as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
          }
        }
      } catch (e) {
        console.warn(`[v0] [GENERATE-SINGLE] Failed to parse visual_aesthetic:`, e)
      }
    }
  }

  const result: GetCategoryAndMoodResult = { category, mood }
  if (visualAesthetic) {
    result.visualAesthetic = visualAesthetic
  }
  if (trackSource) {
    result.sourceUsed = sourceUsed
  }

  return result
}

/**
 * Get fashion style for a specific position with rotation
 * 
 * Rotates through user's selected fashion styles based on position.
 * Defaults to "business" if no fashion style found.
 * 
 * @param user - User object with id
 * @param position - Frame position (1-9)
 * @returns Mapped fashion style for vibe library
 */
export async function getFashionStyleForPosition(
  user: User,
  position: number,
  feedLayout?: { fashion_style?: any } | null
): Promise<string> {
  const { mapFashionStyleToVibeLibrary } = await import("@/lib/feed-planner/fashion-style-mapper")
  let fashionStyle = 'casual' // Neutral lifestyle default

  // PRIORITY 1: Check feed-specific fashion_style (feed override)
  if (feedLayout?.fashion_style) {
    try {
      const feedFashionStyle = Array.isArray(feedLayout.fashion_style)
        ? feedLayout.fashion_style
        : JSON.parse(feedLayout.fashion_style)
      
      if (Array.isArray(feedFashionStyle) && feedFashionStyle.length > 0) {
        const styleIndex = (position - 1) % feedFashionStyle.length
        fashionStyle = mapFashionStyleToVibeLibrary(feedFashionStyle[styleIndex])
        console.log(`[v0] [GENERATE-SINGLE] ✅ Using feed-specific fashion_style ${styleIndex + 1}/${feedFashionStyle.length}: ${fashionStyle} for position ${position}`)
        return fashionStyle
      }
    } catch (e) {
      console.warn(`[v0] [GENERATE-SINGLE] Failed to parse feed fashion_style:`, e)
      // Fall through to personal brand
    }
  }

  // PRIORITY 2 (FALLBACK): Check user_personal_brand.fashion_style
  const personalBrandForStyle = await sql`
    SELECT fashion_style
    FROM user_personal_brand
    WHERE user_id = ${user.id}
    ORDER BY updated_at DESC
    LIMIT 1
  ` as PersonalBrand[]

  if (personalBrandForStyle && personalBrandForStyle.length > 0 && personalBrandForStyle[0].fashion_style) {
    try {
      let styles: string[] = []
      const rawStyle = personalBrandForStyle[0].fashion_style

      // Handle different storage formats:
      // 1. Already an array (from PostgreSQL TEXT[] - Neon sometimes returns as JS array)
      if (Array.isArray(rawStyle)) {
        styles = rawStyle.filter(s => s && typeof s === 'string')
      }
      // 2. PostgreSQL array format string: {value1,value2,value3}
      else if (typeof rawStyle === 'string' && rawStyle.startsWith('{') && rawStyle.endsWith('}')) {
        // Parse PostgreSQL array format: {business,casual,athletic}
        const arrayContent = rawStyle.slice(1, -1) // Remove { and }
        styles = arrayContent.split(',').map(s => s.trim()).filter(s => s.length > 0)
      }
      // 3. JSON string that needs parsing
      else if (typeof rawStyle === 'string') {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(rawStyle)
          if (Array.isArray(parsed)) {
            styles = parsed.filter(s => s && typeof s === 'string')
          } else if (typeof parsed === 'string') {
            styles = [parsed]
          }
        } catch {
          // Not valid JSON, treat as single string value
          styles = [rawStyle]
        }
      }

      if (styles.length > 0) {
        // Rotate through selected styles based on frame position
        const styleIndex = (position - 1) % styles.length
        fashionStyle = mapFashionStyleToVibeLibrary(styles[styleIndex])
        console.log(`[v0] [GENERATE-SINGLE] Using style ${styleIndex + 1}/${styles.length}: ${fashionStyle} for frame ${position}`)
      } else {
        console.warn(`[v0] [GENERATE-SINGLE] No valid fashion styles found, using default: casual`)
      }
    } catch (e) {
      console.error(`[v0] [GENERATE-SINGLE] Failed to parse fashion_style:`, e)
      console.warn(`[v0] [GENERATE-SINGLE] Using default fashion style: casual`)
    }
  }

  return fashionStyle
}

/**
 * Get Coherent Style Parameters
 * 
 * NEW: Style Coherence Resolver Integration
 * 
 * This function wraps getCategoryAndMood() and getFashionStyleForPosition()
 * with coherence validation and adaptation logic.
 * 
 * It ensures that fashion styles are compatible with the selected category
 * and mood, adapting or blocking incompatible combinations.
 * 
 * @param feedLayout - Feed layout with style preferences
 * @param user - User object with id
 * @param position - Frame position (1-9)
 * @param options - Same options as getCategoryAndMood
 * @returns Coherent style parameters ready for prompt construction
 */
export async function getCoherentStyleParameters(
  feedLayout: FeedLayout | null | undefined,
  user: User,
  position: number,
  options: GetCategoryAndMoodOptions = {}
): Promise<{
  category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
  mood: "luxury" | "minimal" | "beige"
  visualAesthetic?: string
  fashionStyle: string
  adaptationApplied: boolean
  adaptationReason?: string
}> {
  // Step 1: Get category and mood (Priority 1 & 2 in hierarchy)
  const { category, mood, visualAesthetic } = await getCategoryAndMood(feedLayout, user, options)
  
  // Step 2: Get raw fashion style (Priority 3 in hierarchy, pre-adaptation)
  const rawFashionStyle = await getFashionStyleForPosition(user, position, feedLayout)
  
  // Step 3: Apply coherence resolver
  const { resolveCoherentStyle } = await import('./style-coherence-resolver')
  
  const coherentStyle = resolveCoherentStyle({
    category,
    mood,
    fashionStyle: rawFashionStyle,
    userId: typeof user.id === 'string' ? user.id : String(user.id),
    feedId: feedLayout?.id || undefined
  })
  
  // Return coherent parameters
  return {
    category: coherentStyle.resolvedCategory as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional",
    mood: coherentStyle.resolvedMood as "luxury" | "minimal" | "beige",
    visualAesthetic,
    fashionStyle: coherentStyle.resolvedFashionStyle,
    adaptationApplied: coherentStyle.adaptationApplied,
    adaptationReason: coherentStyle.adaptationReason
  }
}

/**
 * Inject dynamic content into template and validate
 * 
 * Injects dynamic content (outfits, locations, accessories) from vibe library
 * into template placeholders, then validates that all placeholders were replaced.
 * 
 * @param fullTemplate - Full template prompt from blueprint photoshoot templates
 * @param category - Category (luxury, minimal, beige, warm, edgy, professional)
 * @param mood - Mood (luxury, minimal, beige)
 * @param fashionStyle - Fashion style for vibe library
 * @param userId - User ID for rotation tracking
 * @returns Injected template with all placeholders replaced
 * @throws Error if injection fails or placeholders remain
 */
export async function injectAndValidateTemplate(
  fullTemplate: string,
  category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional",
  mood: "luxury" | "minimal" | "beige",
  fashionStyle: string,
  userId: string,
  options?: {
    visualAesthetics?: string[]
    fashionStyles?: string[]
    feedStyle?: string
    category?: string
  }
): Promise<string> {
  // Validate template input
  if (!fullTemplate || typeof fullTemplate !== 'string') {
    throw new Error(`Invalid template: expected string, got ${typeof fullTemplate}`)
  }

  // Map mood to vibe library format (e.g., "luxury" -> "dark_moody", "minimal" -> "light_minimalistic")
  const { MOOD_MAP } = await import("@/lib/maya/blueprint-photoshoot-templates")
  const moodMapped = MOOD_MAP[mood as keyof typeof MOOD_MAP] || "light_minimalistic"
  const vibeKey = `${category}_${moodMapped}` // e.g., "luxury_dark_moody", "minimal_light_minimalistic"

  console.log(`[v0] [GENERATE-SINGLE] Using vibe: ${vibeKey}, fashion style: ${fashionStyle}`)
  console.log(`[v0] [GENERATE-SINGLE] Template length: ${fullTemplate.length} chars, preview: ${fullTemplate.substring(0, 200)}...`)

  // Inject dynamic content into template
  const { injectDynamicContentWithRotation } = await import("@/lib/feed-planner/dynamic-template-injector")
  const { getVibeLibrary } = await import("@/lib/styling/vibe-libraries")
  let injectedTemplate: string
  try {
    injectedTemplate = await injectDynamicContentWithRotation(
      fullTemplate,
      vibeKey,
      fashionStyle,
      userId,
      {
        visualAesthetics: options?.visualAesthetics,
        fashionStyles: options?.fashionStyles,
        feedStyle: options?.feedStyle,
        category: options?.category || category,
      }
    )

    // Validate injection worked - check for remaining placeholders
    const { extractPlaceholderKeys } = await import("@/lib/feed-planner/template-placeholders")
    const remainingPlaceholders = extractPlaceholderKeys(injectedTemplate)
    if (remainingPlaceholders.length > 0) {
      console.error(`[v0] [GENERATE-SINGLE] ❌ Injection failed - ${remainingPlaceholders.length} placeholders still remain:`, remainingPlaceholders)
      console.error(`[v0] [GENERATE-SINGLE] ❌ Template preview (first 500 chars):`, injectedTemplate.substring(0, 500))
      console.error(`[v0] [GENERATE-SINGLE] ❌ Vibe key: ${vibeKey}, Fashion style: ${fashionStyle}, User ID: ${userId}`)
      throw new Error(`Template injection incomplete: ${remainingPlaceholders.length} placeholders not replaced: ${remainingPlaceholders.join(', ')}`)
    }

    console.log(`[v0] [GENERATE-SINGLE] ✅ Injection successful - all placeholders replaced (${injectedTemplate.split(/\s+/).length} words)`)
  } catch (injectionError: any) {
    const errorMessage = injectionError?.message || String(injectionError)
    console.error(`[v0] [GENERATE-SINGLE] ❌ Injection error:`, injectionError)

    if (errorMessage.includes("No outfits found for vibe")) {
      const library = getVibeLibrary(vibeKey)
      const availableStyles = library ? Object.keys(library.fashionStyles) : []
      const fallbackStyle = availableStyles.includes("classic")
        ? "classic"
        : availableStyles[0]

      if (fallbackStyle) {
        console.warn(
          `[v0] [GENERATE-SINGLE] ⚠️ Falling back to fashion style "${fallbackStyle}" for vibe ${vibeKey} (original: ${fashionStyle})`
        )
        injectedTemplate = await injectDynamicContentWithRotation(
          fullTemplate,
          vibeKey,
          fallbackStyle,
          userId,
          {
            visualAesthetics: options?.visualAesthetics,
            fashionStyles: options?.fashionStyles,
            feedStyle: options?.feedStyle,
            category: options?.category || category,
          }
        )

        const { extractPlaceholderKeys } = await import("@/lib/feed-planner/template-placeholders")
        const remainingPlaceholders = extractPlaceholderKeys(injectedTemplate)
        if (remainingPlaceholders.length > 0) {
          console.error(`[v0] [GENERATE-SINGLE] ❌ Injection failed - ${remainingPlaceholders.length} placeholders still remain:`, remainingPlaceholders)
          console.error(`[v0] [GENERATE-SINGLE] ❌ Template preview (first 500 chars):`, injectedTemplate.substring(0, 500))
          console.error(`[v0] [GENERATE-SINGLE] ❌ Vibe key: ${vibeKey}, Fashion style: ${fallbackStyle}, User ID: ${userId}`)
          throw new Error(`Template injection incomplete: ${remainingPlaceholders.length} placeholders not replaced: ${remainingPlaceholders.join(', ')}`)
        }

        console.log(
          `[v0] [GENERATE-SINGLE] ✅ Injection successful with fallback style "${fallbackStyle}" (${injectedTemplate.split(/\s+/).length} words)`
        )
        return injectedTemplate
      }
    }

    throw new Error(`Failed to inject dynamic content: ${errorMessage}`)
  }

  return injectedTemplate
}
