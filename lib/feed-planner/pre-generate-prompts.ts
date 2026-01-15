/**
 * Pre-generate Prompts for All Feed Positions
 * 
 * This function extracts and saves prompts for all 9 positions (1-9) from a template.
 * Used to eliminate the 5-10 second delay when generating position 1.
 * 
 * When a paid blueprint feed is created or when feed_style is set/updated,
 * all 9 prompts should be pre-generated and saved to feed_posts table.
 */

import { neon } from "@neondatabase/serverless"
import { buildSingleImagePrompt } from "./build-single-image-prompt"
import { injectDynamicContentWithRotation } from "./dynamic-template-injector"
import { mapFashionStyleToVibeLibrary } from "./fashion-style-mapper"
import { incrementRotationState } from "./rotation-manager"
import { BLUEPRINT_PHOTOSHOOT_TEMPLATES, MOOD_MAP } from "@/lib/maya/blueprint-photoshoot-templates"

interface PreGeneratePromptsParams {
  feedId: number
  userId: string
  feedStyle: string // e.g., "luxury", "minimal", "beige"
  sql: ReturnType<typeof neon>
}

export async function preGenerateAllPrompts({
  feedId,
  userId,
  feedStyle,
  sql,
}: PreGeneratePromptsParams): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[v0] [PRE-GENERATE-PROMPTS] Starting prompt pre-generation for feed ${feedId} with style: ${feedStyle}`)

    // Get category from user_personal_brand or use feedStyle as category
    const personalBrand = await sql`
      SELECT visual_aesthetic, fashion_style
      FROM user_personal_brand
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    ` as any[]

    let category: string = feedStyle // Default to feedStyle as category
    if (personalBrand && personalBrand.length > 0 && personalBrand[0].visual_aesthetic) {
      try {
        const aesthetics = typeof personalBrand[0].visual_aesthetic === 'string'
          ? JSON.parse(personalBrand[0].visual_aesthetic)
          : personalBrand[0].visual_aesthetic

        if (Array.isArray(aesthetics) && aesthetics.length > 0) {
          category = aesthetics[0]?.toLowerCase().trim() || feedStyle
        }
      } catch (e) {
        console.warn(`[v0] [PRE-GENERATE-PROMPTS] Failed to parse visual_aesthetic:`, e)
      }
    }

    // Get user's fashion style (defaults to 'business' if not set)
    let fashionStyle = 'business' // Default fashion style
    if (personalBrand && personalBrand.length > 0 && personalBrand[0].fashion_style) {
      try {
        // Handle JSONB array or string format
        const styles = typeof personalBrand[0].fashion_style === 'string'
          ? JSON.parse(personalBrand[0].fashion_style)
          : personalBrand[0].fashion_style

        if (Array.isArray(styles) && styles.length > 0) {
          // Use first style from array
          fashionStyle = mapFashionStyleToVibeLibrary(styles[0])
        } else if (typeof styles === 'string') {
          fashionStyle = mapFashionStyleToVibeLibrary(styles)
        }
      } catch (e) {
        console.warn(`[v0] [PRE-GENERATE-PROMPTS] Failed to parse fashion_style:`, e)
        // Try as plain string if JSON parse fails
        if (typeof personalBrand[0].fashion_style === 'string') {
          fashionStyle = mapFashionStyleToVibeLibrary(personalBrand[0].fashion_style)
        }
      }
    }

    const mood = feedStyle.toLowerCase().trim()
    const moodMapped = MOOD_MAP[mood as keyof typeof MOOD_MAP] || "light_minimalistic"
    const templateKey = `${category}_${moodMapped}` as keyof typeof BLUEPRINT_PHOTOSHOOT_TEMPLATES
    const fullTemplate = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]

    if (!fullTemplate) {
      console.warn(`[v0] [PRE-GENERATE-PROMPTS] ⚠️ Template ${templateKey} not found`)
      return { success: false, error: `Template ${templateKey} not found` }
    }

    // Build vibe key for dynamic injection (e.g., 'luxury_dark_moody')
    const vibe = `${category}_${moodMapped}`

    console.log(`[v0] [PRE-GENERATE-PROMPTS] Template selection:`, {
      feedStyle,
      category,
      mood,
      moodMapped,
      templateKey,
      vibe,
      fashionStyle,
      hasTemplate: !!fullTemplate,
      templateLength: fullTemplate?.length || 0,
    })

    // STEP 1: Inject dynamic content into template (outfits, locations, accessories)
    const injectedTemplate = await injectDynamicContentWithRotation(
      fullTemplate,
      vibe,
      fashionStyle,
      userId
    )

    console.log(`[v0] [PRE-GENERATE-PROMPTS] ✅ Injected dynamic content into template (vibe: ${vibe}, style: ${fashionStyle})`)

    // STEP 2: Extract each scene (1-9) from the injected template and store in respective positions
    const updatePromises = []
    for (let position = 1; position <= 9; position++) {
      try {
        const extractedScene = buildSingleImagePrompt(injectedTemplate, position)

        updatePromises.push(
          sql`
            UPDATE feed_posts
            SET prompt = ${extractedScene}
            WHERE feed_layout_id = ${feedId} AND position = ${position}
          `
        )

        console.log(`[v0] [PRE-GENERATE-PROMPTS] ✅ Extracted scene ${position} (${extractedScene.split(/\s+/).length} words)`)
      } catch (extractError: any) {
        console.error(`[v0] [PRE-GENERATE-PROMPTS] ❌ Failed to extract scene ${position}:`, {
          error: extractError?.message,
          position,
          templateKey,
        })
        // Continue with other positions
      }
    }

    // Execute all updates in parallel
    await Promise.all(updatePromises)

    // STEP 3: Increment rotation state after feed creation (ensures next feed gets different content)
    await incrementRotationState(userId, vibe, fashionStyle)
    console.log(`[v0] [PRE-GENERATE-PROMPTS] ✅ Incremented rotation state for next feed generation (vibe: ${vibe}, style: ${fashionStyle})`)

    console.log(`[v0] [PRE-GENERATE-PROMPTS] ✅ Successfully pre-generated all 9 prompts for feed ${feedId}`)

    return { success: true }
  } catch (error: any) {
    console.error(`[v0] [PRE-GENERATE-PROMPTS] ❌ Error pre-generating prompts:`, {
      error: error?.message,
      code: error?.code,
      feedId,
      feedStyle,
    })
    return { success: false, error: error?.message || "Failed to pre-generate prompts" }
  }
}
