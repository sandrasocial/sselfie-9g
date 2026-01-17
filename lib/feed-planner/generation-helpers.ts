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
}

interface GetCategoryAndMoodResult {
  category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
  mood: "luxury" | "minimal" | "beige"
  sourceUsed?: string
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
    orderBy = 'created_at'
  } = options

  let category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" = "professional"
  let mood: "luxury" | "minimal" | "beige" = "minimal"
  let sourceUsed = "default"

  // PRIMARY SOURCE: feed_layouts.feed_style (per-feed style selection from modal)
  // This is the most specific and should always take priority
  if (feedLayout?.feed_style) {
    const feedStyle = feedLayout.feed_style.toLowerCase().trim()
    if (feedStyle === "luxury" || feedStyle === "minimal" || feedStyle === "beige") {
      mood = feedStyle as "luxury" | "minimal" | "beige"
      sourceUsed = "feed_style"
      if (trackSource) {
        console.log(`[v0] [GENERATE-SINGLE] ✅ Using feed's feed_style (PRIMARY): ${feedStyle}`)
      }
    }
  }

  // SECONDARY SOURCE: user_personal_brand.settings_preference[0] - only if feed_style not set
  // This is synced from feed style modal selections
  if (checkSettingsPreference && sourceUsed === "default") {
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

      // Extract category from visual_aesthetic (array of IDs)
      if (personalBrand[0].visual_aesthetic) {
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

        // Get category from form_data.vibe (same as old blueprint)
        category = (formData.vibe || "professional") as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
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
  position: number
): Promise<string> {
  const { mapFashionStyleToVibeLibrary } = await import("@/lib/feed-planner/fashion-style-mapper")
  let fashionStyle = 'business' // Default fashion style

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
        console.warn(`[v0] [GENERATE-SINGLE] No valid fashion styles found, using default: business`)
      }
    } catch (e) {
      console.error(`[v0] [GENERATE-SINGLE] Failed to parse fashion_style:`, e)
      console.warn(`[v0] [GENERATE-SINGLE] Using default fashion style: business`)
    }
  }

  return fashionStyle
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
  userId: string
): Promise<string> {
  // Map mood to vibe library format (e.g., "luxury" -> "dark_moody", "minimal" -> "light_minimalistic")
  const { MOOD_MAP } = await import("@/lib/maya/blueprint-photoshoot-templates")
  const moodMapped = MOOD_MAP[mood as keyof typeof MOOD_MAP] || "light_minimalistic"
  const vibeKey = `${category}_${moodMapped}` // e.g., "luxury_dark_moody", "minimal_light_minimalistic"

  console.log(`[v0] [GENERATE-SINGLE] Using vibe: ${vibeKey}, fashion style: ${fashionStyle}`)

  // Inject dynamic content into template
  const { injectDynamicContentWithRotation } = await import("@/lib/feed-planner/dynamic-template-injector")
  let injectedTemplate: string
  try {
    injectedTemplate = await injectDynamicContentWithRotation(
      fullTemplate,
      vibeKey,
      fashionStyle,
      userId
    )

    // Validate injection worked - check for remaining placeholders
    const { extractPlaceholderKeys } = await import("@/lib/feed-planner/template-placeholders")
    const remainingPlaceholders = extractPlaceholderKeys(injectedTemplate)
    if (remainingPlaceholders.length > 0) {
      console.error(`[v0] [GENERATE-SINGLE] ❌ Injection failed - ${remainingPlaceholders.length} placeholders still remain:`, remainingPlaceholders)
      throw new Error(`Template injection incomplete: ${remainingPlaceholders.length} placeholders not replaced`)
    }

    console.log(`[v0] [GENERATE-SINGLE] ✅ Injection successful - all placeholders replaced (${injectedTemplate.split(/\s+/).length} words)`)
  } catch (injectionError: any) {
    console.error(`[v0] [GENERATE-SINGLE] ❌ Injection error:`, injectionError)
    throw new Error(`Failed to inject dynamic content: ${injectionError.message}`)
  }

  return injectedTemplate
}
