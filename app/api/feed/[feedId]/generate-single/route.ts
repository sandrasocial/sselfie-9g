/**
 * FEED PLANNER GENERATION ROUTE
 * 
 * CANONICAL FEED PLANNER PIPELINE
 * 
 * This route handles Feed Planner image generation:
 * - Preview Feed (9 scenes → 1 prompt)
 * - Full Feed Planner (9 scenes → 9 prompts)
 * 
 * CANONICAL FLOW (LOCK THIS IN):
 * User → Blueprint / Feed Planner
 *    → scene-resolver.ts          (decides scenes)
 *    → scene-consistency.ts       (locks 9 scenes)
 *    → prompt-shaper.ts           (creates prompts ONCE)
 *    → replicate / nano banana
 *    → image saved
 *    → image rendered in UI
 * 
 * FEED PLANNER — DO NOT USE LEGACY PROMPT BUILDERS
 * 
 * DO NOT CALL:
 * - nano-banana-adapter
 * - template injectors
 * - visual composition expert
 * - build-single-image-prompt
 * - generateFeedSinglePromptViaAuthority (Maya system)
 * 
 * These are frozen by design.
 * 
 * Use ONLY:
 * - scene-resolver.ts
 * - scene-consistency.ts
 * - prompt-shaper.ts
 */

import { NextRequest } from "next/server"
import { createHash } from "crypto"
import { getAuthenticatedUserWithRetry, clearAuthCache } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { MAYA_QUALITY_PRESETS } from "@/lib/maya/quality-settings"
import { checkGenerationRateLimit } from "@/lib/rate-limit"
import { checkCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits"
import { extractReplicateVersionId, ensureTriggerWordPrefix, ensureGenderInPrompt, buildClassicModeReplicateInput } from "@/lib/replicate-helpers"
import { validatePrompt, generateFeedSinglePromptViaAuthority } from "@/lib/maya/prompt-authority"
import { generateWithNanoBanana, getStudioProCreditCost } from "@/lib/nano-banana-client"
import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { getCategoryAndMood, getFashionStyleForPosition, injectAndValidateTemplate } from "@/lib/feed-planner/generation-helpers"

/* eslint-disable no-console */
// Console statements are used for debugging and monitoring in development

// Type definitions for database query results
interface FeedLayout {
  color_palette?: string | null
  brand_vibe?: string | null
  photoshoot_enabled?: boolean | null
  photoshoot_base_seed?: number | null
  feed_style?: string | null
  layout_type?: string | null
  visual_aesthetic?: string | unknown[] | null
  fashion_style?: string | unknown[] | null
}

interface PersonalBrand {
  id?: number | string
  visual_aesthetic?: string | unknown[] | null
  fashion_style?: string | unknown[] | null
  settings_preference?: string | unknown[] | null
  prompt?: string | null
  feed_style?: string | null
}

interface AvatarImage {
  image_url: string
  display_order: number | null
  uploaded_at: Date | string
}

interface PreviewFeed {
  id: number | string
}

interface FeedStyle {
  feed_style: string | null
}

interface Model {
  id?: number
  trigger_word?: string
  ethnicity?: string | unknown
  gender?: string | unknown
  lora_scale?: number | null
  replicate_version_id?: string | null
  lora_weights_url?: string | null
  [key: string]: unknown
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ feedId: string }> | { feedId: string } }) {
  try {
    console.log("[v0] [GENERATE-SINGLE] ==================== GENERATE SINGLE API CALLED ====================")
    
    // Resolve params first (Next.js 16 pattern)
    let feedId: string
    try {
      const resolvedParams = await Promise.resolve(params)
      feedId = resolvedParams.feedId
      console.log("[v0] [GENERATE-SINGLE] Resolved feedId from params:", feedId)
    } catch (paramsError) {
      console.error("[v0] [GENERATE-SINGLE] Error resolving params:", paramsError)
      return Response.json({ 
        error: "Invalid request parameters",
        details: "Failed to parse feed ID from request"
      }, { status: 400 })
    }
    
    if (!feedId || feedId === "null" || feedId === "undefined") {
      console.error("[v0] [GENERATE-SINGLE] Invalid feedId:", feedId)
      return Response.json({ 
        error: "Invalid feed ID",
        details: "Feed ID is required. Please refresh the page and try again."
      }, { status: 400 })
    }
    
    // Try to get authenticated user
    let authUser
    let authError
    
    try {
      const result = await getAuthenticatedUserWithRetry(3)
      authUser = result.user
      authError = result.error
    } catch (error) {
      console.error("[v0] [GENERATE-SINGLE] Auth helper threw error:", error)
      authError = error instanceof Error ? error : new Error(String(error))
    }

    if (authError || !authUser) {
      console.error("[v0] [GENERATE-SINGLE] Authentication failed:", {
        hasError: !!authError,
        errorMessage: authError?.message,
        hasUser: !!authUser,
        userId: authUser?.id
      })
      
      // Clear auth cache to force fresh check on next attempt
      clearAuthCache()
      
      return Response.json({ 
        error: "Unauthorized", 
        details: authError?.message || "Your session may have expired. Please refresh the page and try again.",
        shouldRetry: true,
        requiresRefresh: true
      }, { status: 401 })
    }
    
    console.log("[v0] [GENERATE-SINGLE] ✅ User authenticated:", authUser.id)

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      console.error("[v0] [GENERATE-SINGLE] User not found in database")
      return Response.json({ error: "User not found in database" }, { status: 404 })
    }

    console.log("[v0] [GENERATE-SINGLE] ✅ Neon user found:", user.id)

    // Phase 7.3: Check access control for image generation
    // Free users can generate ONE image (they have 2 credits), others can generate unlimited
    // Also used later to determine default generation mode
    const access = await getFeedPlannerAccess(user.id.toString())
    const { getUserCredits } = await import("@/lib/credits")
    const creditBalance = await getUserCredits(user.id.toString())
    
    // Allow generation if:
    // 1. User has canGenerateImages access (paid/membership), OR
    // 2. User is free AND has credits (free users with credits can generate one image)
    const hasGenerationAccess = access.canGenerateImages || (access.isFree && creditBalance > 0)
    
    if (!hasGenerationAccess) {
      console.error("[v0] [GENERATE-SINGLE] User does not have generation access", {
        canGenerateImages: access.canGenerateImages,
        isFree: access.isFree,
        creditBalance,
      })
      return Response.json(
        {
          error: "Generation access required",
          details: "You need credits to generate images. Free users can generate one image with their welcome credits.",
        },
        { status: 403 },
      )
    }

    const rateLimit = await checkGenerationRateLimit(user.id.toString())
    if (!rateLimit.success) {
      const resetDate = new Date(rateLimit.reset)
      console.error("[v0] [GENERATE-SINGLE] Rate limit exceeded")
      return Response.json(
        {
          error: "Rate limit exceeded",
          details: `You've reached the limit of ${rateLimit.limit} images per hour. Resets at ${resetDate.toLocaleTimeString()}.`,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        { status: 429 },
      )
    }

    const { postId, generationMode: requestedMode } = await req.json()
    
    console.log("[v0] [GENERATE-SINGLE] Request params:", { feedId, postId })

    if (!postId) {
      console.error("[v0] [GENERATE-SINGLE] Missing postId in request body")
      return Response.json(
        {
          error: "Missing post ID",
          details: "Post ID is required to generate a post.",
        },
        { status: 400 },
      )
    }

    const sql = neon(process.env.DATABASE_URL!)

    const feedIdInt = Number.parseInt(feedId, 10)
    if (isNaN(feedIdInt)) {
      console.error("[v0] [GENERATE-SINGLE] feedId is not a valid integer:", feedId)
      return Response.json(
        {
          error: "Invalid feed ID format",
          details: "Feed ID must be a valid number. Please refresh the page and try again.",
          shouldRetry: false,
        },
        { status: 400 },
      )
    }

    const [post] = await sql`
      SELECT * FROM feed_posts
      WHERE feed_layout_id = ${feedIdInt} AND id = ${postId}
    `

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 })
    }

    // Check generation mode (Pro Mode vs Classic Mode)
    // Feed Planner should ALWAYS use Pro Mode (Nano Banana Pro) for ALL users
    // This includes free users, paid blueprint users, and Studio membership users
    // Force Pro Mode for all Feed Planner users, regardless of post.generation_mode or membership status
    // Access was already fetched above, reuse it
    const forceProMode = Boolean(process.env.FEED_PLANNER_FORCE_PRO ?? true)
    let generationMode: 'pro' | 'classic' = post.generation_mode === 'classic' ? 'classic' : 'pro'
    if (access.isMembership && (requestedMode === 'classic' || requestedMode === 'pro')) {
      generationMode = requestedMode
    }
    if (!access.isMembership && forceProMode) {
      generationMode = 'pro'
    }
    const proModeType = post.pro_mode_type || null
    console.log("[v0] [GENERATE-SINGLE] Post generation mode:", { generationMode, proModeType, isFree: access.isFree, isPaidBlueprint: access.isPaidBlueprint, postGenerationMode: post.generation_mode })

    // Check credits based on generation mode (Pro Mode = 2 credits, Classic = 1 credit)
    const creditsNeeded = generationMode === 'pro' ? getStudioProCreditCost('2K') : CREDIT_COSTS.IMAGE
    const hasCredits = await checkCredits(user.id.toString(), creditsNeeded)
    if (!hasCredits) {
      console.error("[v0] [GENERATE-SINGLE] Insufficient credits")
      return Response.json(
        {
          error: "Insufficient credits",
          details: `You need ${creditsNeeded} credit${creditsNeeded > 1 ? 's' : ''} to generate this ${generationMode === 'pro' ? 'Pro Mode' : 'Classic Mode'} image. Please purchase more credits.`,
          creditsNeeded,
        },
        { status: 402 },
      )
    }

    // Query feed_layouts with feed_style and layout_type (handle case where column might not exist yet)
    let feedLayout: FeedLayout | undefined
    try {
      const result = await sql`
        SELECT color_palette, brand_vibe, photoshoot_enabled, photoshoot_base_seed, feed_style, layout_type, visual_aesthetic, fashion_style
        FROM feed_layouts 
        WHERE id = ${feedIdInt}
      `
      feedLayout = result[0] as FeedLayout | undefined
    } catch (error: unknown) {
      // If feed_style column doesn't exist, query without it
      const errorObj = error as { message?: string; code?: string }
      if (errorObj?.message?.includes('feed_style') || errorObj?.code === '42703') {
        console.warn("[v0] [GENERATE-SINGLE] feed_style column not found, querying without it")
        const result = await sql`
          SELECT color_palette, brand_vibe, photoshoot_enabled, photoshoot_base_seed, layout_type
          FROM feed_layouts 
          WHERE id = ${feedIdInt}
        `
        feedLayout = result[0]
        feedLayout.feed_style = null // Set to null if column doesn't exist
      } else {
        throw error // Re-throw if it's a different error
      }
    }

    const parseArrayField = (value: unknown): string[] | null => {
      if (Array.isArray(value)) {
        const items = value.map((item) => String(item).trim()).filter(Boolean)
        return items.length > 0 ? items : null
      }
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) {
            const items = parsed.map((item) => String(item).trim()).filter(Boolean)
            return items.length > 0 ? items : null
          }
          if (parsed && typeof parsed === "object") {
            const items = Object.keys(parsed).map((item) => String(item).trim()).filter(Boolean)
            return items.length > 0 ? items : null
          }
        } catch {
          return value.trim() ? [value.trim()] : null
        }
      }
      return null
    }

    const visualAestheticOptions = parseArrayField(feedLayout?.visual_aesthetic)
    const fashionStyleOptions = parseArrayField(feedLayout?.fashion_style)

    // Only fetch model for Classic Mode (Pro Mode doesn't need custom model)
    let model: Model | null = null
    if (generationMode === 'classic') {
      const [modelResult] = await sql`
        SELECT 
          um.trigger_word, 
          um.replicate_version_id, 
          um.lora_scale, 
          um.lora_weights_url,
          u.gender,
          u.ethnicity
        FROM user_models um
        JOIN users u ON u.id = um.user_id
        WHERE um.user_id = ${user.id}
        AND um.training_status = 'completed'
        AND (um.is_test = false OR um.is_test IS NULL)
        ORDER BY um.created_at DESC
        LIMIT 1
      `
      model = modelResult

      console.log("[v0] [GENERATE-SINGLE] User model lookup:", {
        found: !!model,
        hasLoraUrl: !!model?.lora_weights_url,
        hasVersionId: !!model?.replicate_version_id,
      })

      if (!model) {
        console.error("[v0] [GENERATE-SINGLE] No trained model found for user:", user.id)
        return Response.json({ error: "No trained model found" }, { status: 400 })
      }

      if (!model.lora_weights_url) {
        console.error("[v0] [GENERATE-SINGLE] LoRA weights URL not found for model")
        return Response.json({ error: "LoRA weights URL not found" }, { status: 400 })
      }

      if (!model.replicate_version_id) {
        console.error("[v0] [GENERATE-SINGLE] Replicate version ID not found for model")
        return Response.json({ error: "Replicate version ID not found" }, { status: 400 })
      }
    }

    // Route to Pro Mode or Classic Mode based on generation_mode
    if (generationMode === 'pro') {
      console.log("[v0] [GENERATE-SINGLE] 🎨 Pro Mode post detected - routing to Nano Banana Pro")
      
      // CRITICAL FIX: Mark post as generating IMMEDIATELY before any processing
      // This ensures frontend shows loading state right away, even if template extraction takes time
      await sql`
        UPDATE feed_posts
        SET generation_status = 'generating',
            generation_mode = ${generationMode},
            updated_at = NOW()
        WHERE id = ${postId}
      `
      console.log(`[v0] [GENERATE-SINGLE] ✅ Marked post ${postId} as generating immediately`)
      
      // Fetch user's avatar images for Pro Mode
      const avatarImages = await sql`
        SELECT image_url, display_order, uploaded_at
        FROM user_avatar_images
        WHERE user_id = ${user.id}
        AND is_active = true
        ORDER BY display_order ASC, uploaded_at ASC
        LIMIT 5
      `
      
      // Enhanced logging for reference image validation
      const referenceImageCount = avatarImages.length
      console.log(`[v0] [GENERATE-SINGLE] 📸 Reference images found: ${referenceImageCount} (max 5, optimal: 3-5)`)
      
      if (referenceImageCount === 0) {
        return Response.json(
          {
            error: "Pro Mode requires reference images",
            details: "Please upload at least one avatar image in your profile settings to use Pro Mode.",
          },
          { status: 400 },
        )
      }
      
      // Enhanced warning for low reference image count
      if (referenceImageCount < 3) {
        console.warn(`[v0] [GENERATE-SINGLE] ⚠️ Low reference image count (${referenceImageCount}). 3-5 images recommended for best identity preservation.`)
      } else if (referenceImageCount >= 3 && referenceImageCount <= 5) {
        console.log(`[v0] [GENERATE-SINGLE] ✅ Optimal reference image count (${referenceImageCount}) for identity preservation`)
      }
      
      // Map all available images (up to 5) for NanoBanana Pro
      const baseImages = (avatarImages as AvatarImage[]).map((img) => ({
        url: img.image_url,
        type: 'user-photo' as const,
      }))
      
      console.log(`[v0] [GENERATE-SINGLE] 📤 Sending ${baseImages.length} reference image(s) to NanoBanana Pro`)
      
      // Get brand kit if available (currently unused but may be needed in future)
      const [_brandKit] = await sql`
        SELECT primary_color, secondary_color, accent_color, font_style, brand_tone
        FROM brand_kits
        WHERE user_id = ${user.id} AND is_default = true
        LIMIT 1
      `
      
      // 🔴 CRITICAL: Check if this is a preview feed FIRST (before access checks)
      // Preview feeds use full template (all 9 scenes) for ALL users (free and paid)
      const isPreviewFeed = feedLayout?.layout_type === 'preview'
      let chosenPromptSource: "template_injection" | "db_prompt" | "maya_fallback" | "preview_template" | "canonical_preview_pipeline_fallback" | null = null
      let templateReferencePrompt: string | null = null
      let previewTemplate: string | null = null
      
      // For paid blueprint users: Each position should already have its extracted scene prompt
      // If not, extract it from the template using the current feed's feed_style
      // The full template is NOT stored in position 1 for paid blueprint - each position has its own scene
      // EXCEPTION: Preview feeds ALWAYS use full template - ignore any stored prompts
      let finalPrompt: string | null = null
      
      // 🔴 PROMPT AUTHORITY LOCK-IN: Phase 1 - Database prompt reuse REMOVED
      // All prompts MUST be generated via canonical builder (prompt-shaper.ts)
      // Database prompts are stored for logging/debugging only, never reused
      // This ensures all prompts match Nano Banana Pro spec requirements
      finalPrompt = null  // Always force regeneration via canonical builder
      // 🔴 FIX: Removed redundant Path A (paid user scene extraction)
      // Paid users now go through Path B (Maya generation) which uses template injection
      
      const isPromptUsable = (prompt: string | null): prompt is string =>
        typeof prompt === "string" && prompt.trim().length >= 20

      // If scene extraction failed or not applicable, continue with original logic
      // For preview feeds, always generate full template (same for free and paid users)
      // For full feeds, generate based on user type
      if (!isPromptUsable(finalPrompt)) {
        console.log(`[v0] [GENERATE-SINGLE] ⚠️ Pro Mode post ${post.position} missing prompt. Generating based on feed type and user type...`)
        
        try {
          // 🔴 CRITICAL: Handle preview feeds FIRST (same logic for free and paid users)
          // CANONICAL FEED PLANNER PIPELINE - Phase A Integration
          // FEED SYSTEM LOCKED — STRATEGY ≠ EXECUTION
          // Preview = Strategy Only (Position, Content Type, Framing, Visual Role)
          // Single Scene = Execution Only (Outfits, Locations, Poses, Activities)
          if (isPreviewFeed) {
            console.log(`[v0] [GENERATE-SINGLE] ✅ Preview feed detected - using CANONICAL preview prompt builder`)
            
            try {
              const { resolveConsistentScenes, buildPreviewPromptFromScenes } = await import("@/lib/feed-planner/scene-consistency")
              
              const scenes = await resolveConsistentScenes(feedLayout, user, {
                checkSettingsPreference: false,
                checkBlueprintSubscribers: false,
                defaultCategory: 'minimal',
              })
              
              finalPrompt = buildPreviewPromptFromScenes(scenes)
              chosenPromptSource = "canonical_preview_pipeline"
              console.log("[v0] PROMPT_SOURCE=canonical_preview_pipeline")
              console.log(`[v0] [GENERATE-SINGLE] ✅ Preview feed - canonical prompt (${finalPrompt.split(/\s+/).length} words)`)
              
              await sql`
                UPDATE feed_posts
                SET prompt = ${finalPrompt}
                WHERE id = ${postId}
              `
            } catch (templateError) {
              const errorMessage = templateError instanceof Error ? templateError.message : "Unknown error"
              console.error(`[v0] [GENERATE-SINGLE] ❌ Preview prompt generation failed:`, errorMessage)
              console.error(`[v0] [GENERATE-SINGLE] ❌ Error stack:`, templateError instanceof Error ? templateError.stack : "No stack trace")
              return Response.json(
                {
                  error: "PREVIEW_PROMPT_GENERATION_FAILED",
                  details: errorMessage,
                  position: post.position,
                  feedId: feedIdInt,
                },
                { status: 500 }
              )
            }
          } else if (access.isPaidBlueprint) {
            // CANONICAL FEED PLANNER PIPELINE - Phase A Integration
            // FEED PLANNER — DO NOT USE LEGACY PROMPT BUILDERS
            // Use ONLY: scene-resolver → scene-consistency → prompt-shaper
            console.log(`[v0] [GENERATE-SINGLE] 🎨 Paid blueprint user - using CANONICAL pipeline...`)
            try {
              const parseArrayField = (value: unknown): string[] | null => {
                if (Array.isArray(value)) {
                  const items = value.map((item) => String(item).trim()).filter(Boolean)
                  return items.length > 0 ? items : null
                }
                if (typeof value === "string") {
                  try {
                    const parsed = JSON.parse(value)
                    if (Array.isArray(parsed)) {
                      const items = parsed.map((item) => String(item).trim()).filter(Boolean)
                      return items.length > 0 ? items : null
                    }
                    if (parsed && typeof parsed === "object") {
                      const items = Object.keys(parsed).map((item) => String(item).trim()).filter(Boolean)
                      return items.length > 0 ? items : null
                    }
                  } catch {
                    const cleaned = value.replace(/[\[\]{}"]/g, "")
                    const items = cleaned
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                    return items.length > 0 ? items : null
                  }
                }
                if (value && typeof value === "object") {
                  const items = Object.keys(value as Record<string, unknown>)
                    .map((item) => String(item).trim())
                    .filter(Boolean)
                  return items.length > 0 ? items : null
                }
                return null
              }

              const [personalBrand] = await sql`
                SELECT visual_aesthetic, fashion_style
                FROM user_personal_brand
                WHERE user_id = ${user.id}
                ORDER BY updated_at DESC
                LIMIT 1
              `

              const visualAestheticValues = parseArrayField(personalBrand?.visual_aesthetic)
              const fashionStyleValues = parseArrayField(personalBrand?.fashion_style)
              const missing: string[] = []

              if (!feedLayout?.feed_style) {
                missing.push("feed_style")
              }
              if (!visualAestheticValues || visualAestheticValues.length === 0) {
                missing.push("visual_aesthetic")
              }
              if (!fashionStyleValues || fashionStyleValues.length === 0) {
                missing.push("fashion_style")
              }

              if (missing.length > 0) {
                const userIdHash = createHash("sha256").update(String(user.id)).digest("hex")
                console.log("[v0] CONTRACT_MISSING", { missing, feedId: feedIdInt, userIdHash })
                return Response.json(
                  {
                    error: missing.includes("feed_style") ? "FEED_STYLE_REQUIRED" : "CANONICAL_FIELDS_REQUIRED",
                    missing,
                    feedId: feedIdInt,
                    postId,
                    position: post.position,
                  },
                  { status: 422 },
                )
              }

              // CANONICAL FEED PLANNER PIPELINE - Phase A Integration
              // FEED PLANNER — DO NOT USE LEGACY PROMPT BUILDERS
              // Use canonical pipeline: scene-resolver → scene-consistency → prompt-shaper
              const { resolveConsistentScenes, buildSingleScenePromptFromScene } = await import("@/lib/feed-planner/scene-consistency")
              
              // Resolve all 9 scenes (same as preview - ensures consistency)
              const scenes = await resolveConsistentScenes(feedLayout, user, {
                checkSettingsPreference: false,
                checkBlueprintSubscribers: false,
              })
              
              // Get scene for this position (1-9)
              const sceneForPosition = scenes.find(s => s.position === post.position)
              if (!sceneForPosition) {
                throw new Error(`Scene not found for position ${post.position}`)
              }
              
              // Build single scene prompt
              finalPrompt = buildSingleScenePromptFromScene(sceneForPosition)
              
              console.log("[v0] PROMPT_SOURCE=canonical_full_planner_pipeline")
              console.log(`[v0] [GENERATE-SINGLE] ✅ Paid blueprint - scene ${post.position} prompt via CANONICAL pipeline (${finalPrompt.split(/\s+/).length} words)`)
            } catch (templateError) {
              const errorMessage = templateError instanceof Error ? templateError.message : "Unknown error"
              console.error(`[v0] [GENERATE-SINGLE] ❌ Template injection failed for paid blueprint:`, errorMessage)
              console.error(`[v0] [GENERATE-SINGLE] ❌ Template error stack:`, templateError instanceof Error ? templateError.stack : "No stack trace")
              return Response.json(
                {
                  error: "TEMPLATE_INJECTION_FAILED",
                  details: errorMessage,
                  position: post.position,
                  feedId: feedIdInt,
                },
                { status: 500 }
              )
            }
          } else if (access.isFree) {
            // CANONICAL FEED PLANNER PIPELINE - Phase A Integration
            // FEED PLANNER — DO NOT USE LEGACY PROMPT BUILDERS
            // Use ONLY: scene-resolver → scene-consistency → prompt-shaper
            console.log(`[v0] [GENERATE-SINGLE] Free user - using CANONICAL pipeline...`)
            const { resolveConsistentScenes, buildSingleScenePromptFromScene } = await import("@/lib/feed-planner/scene-consistency")
            
            // Resolve all 9 scenes (same as preview - ensures consistency)
            const scenes = await resolveConsistentScenes(feedLayout, user, {
              checkSettingsPreference: true,
              checkBlueprintSubscribers: true,
            })
            
            // Get scene for this position (1-9)
            const sceneForPosition = scenes.find(s => s.position === post.position)
            if (!sceneForPosition) {
              throw new Error(`Scene not found for position ${post.position}`)
            }
            
            // Build single scene prompt with error handling
            try {
              finalPrompt = buildSingleScenePromptFromScene(sceneForPosition)
              
              if (!finalPrompt || finalPrompt.trim().length < 20) {
                throw new Error(`Prompt too short or empty: ${finalPrompt?.length || 0} characters`)
              }
              
              console.log("[v0] PROMPT_SOURCE=canonical_full_planner_pipeline")
              console.log(`[v0] [GENERATE-SINGLE] ✅ Free user - scene ${post.position} prompt via CANONICAL pipeline (${finalPrompt.split(/\s+/).length} words)`)
            } catch (promptError) {
              console.error(`[v0] [GENERATE-SINGLE] ❌ Prompt generation failed for scene ${post.position}:`, promptError)
              console.error(`[v0] [GENERATE-SINGLE] Scene data:`, JSON.stringify(sceneForPosition, null, 2))
              
              // Extract error message directly (don't use Replicate error handler for prompt errors)
              const errorMessage = promptError instanceof Error ? promptError.message : String(promptError)
              
              return Response.json(
                {
                  error: "Prompt generation failed",
                  details: `We couldn't generate a prompt for position ${post.position}. ${errorMessage}`,
                  position: post.position,
                  sceneInfo: {
                    position: sceneForPosition.position,
                    activity: sceneForPosition.activity,
                    category: sceneForPosition.category
                  }
                },
                { status: 500 }
              )
            }
            
            // Save the prompt to the database
            await sql`
              UPDATE feed_posts
              SET prompt = ${finalPrompt}
              WHERE id = ${postId}
            `
          } else if (access.isMembership) {
            // CANONICAL FEED PLANNER PIPELINE - Phase A Integration
            // FEED PLANNER — DO NOT USE LEGACY PROMPT BUILDERS
            // Use ONLY: scene-resolver → scene-consistency → prompt-shaper
            console.log(`[v0] [GENERATE-SINGLE] Studio membership user - using CANONICAL pipeline...`)
            const { resolveConsistentScenes, buildSingleScenePromptFromScene } = await import("@/lib/feed-planner/scene-consistency")
            
            // Resolve all 9 scenes (same as preview - ensures consistency)
            const scenes = await resolveConsistentScenes(feedLayout, user, {
              checkSettingsPreference: true,
              checkBlueprintSubscribers: false,
            })
            
            // Get scene for this position (1-9)
            const sceneForPosition = scenes.find(s => s.position === post.position)
            if (!sceneForPosition) {
              throw new Error(`Scene not found for position ${post.position}`)
            }
            
            // Build single scene prompt with error handling
            try {
              finalPrompt = buildSingleScenePromptFromScene(sceneForPosition)
              
              if (!finalPrompt || finalPrompt.trim().length < 20) {
                throw new Error(`Prompt too short or empty: ${finalPrompt?.length || 0} characters`)
              }
              
              console.log("[v0] PROMPT_SOURCE=canonical_full_planner_pipeline")
              console.log(`[v0] [GENERATE-SINGLE] ✅ Membership user - scene ${post.position} prompt via CANONICAL pipeline (${finalPrompt.split(/\s+/).length} words)`)
            } catch (promptError) {
              console.error(`[v0] [GENERATE-SINGLE] ❌ Prompt generation failed for scene ${post.position}:`, promptError)
              console.error(`[v0] [GENERATE-SINGLE] Scene data:`, JSON.stringify(sceneForPosition, null, 2))
              
              // Extract error message directly (don't use Replicate error handler for prompt errors)
              const errorMessage = promptError instanceof Error ? promptError.message : String(promptError)
              
              return Response.json(
                {
                  error: "Prompt generation failed",
                  details: `We couldn't generate a prompt for position ${post.position}. ${errorMessage}`,
                  position: post.position,
                  sceneInfo: {
                    position: sceneForPosition.position,
                    activity: sceneForPosition.activity,
                    category: sceneForPosition.category
                  }
                },
                { status: 500 }
              )
            }
            
            // Save the prompt to the database
            await sql`
              UPDATE feed_posts
              SET prompt = ${finalPrompt}
              WHERE id = ${postId}
            `
          } else if (access.isPaidBlueprint && isPreviewFeed) {
            // 🚫 DEAD CODE PATH: Preview feeds are handled at line 402
            // This path should never execute, but if it does, use canonical pipeline
            console.log(`[v0] [GENERATE-SINGLE] ⚠️ Unexpected path: Paid blueprint + preview feed (should be handled earlier)`)
            console.log(`[v0] [GENERATE-SINGLE] Using CANONICAL pipeline as fallback...`)
            
            // CANONICAL FEED PLANNER PIPELINE - Phase A Integration
            // FEED PLANNER — DO NOT USE LEGACY PROMPT BUILDERS
            try {
              const { resolveConsistentScenes, buildPreviewPromptFromScenes } = await import("@/lib/feed-planner/scene-consistency")
              
              const scenes = await resolveConsistentScenes(feedLayout, user, {
                checkSettingsPreference: false,
                checkBlueprintSubscribers: false,
                defaultCategory: 'minimal'
              })
              
              // 🔴 PROMPT AUTHORITY LOCK-IN: Phase 4 - Validate scene count before prompt generation
              if (scenes.length !== 9) {
                throw new Error(
                  `Preview feed requires exactly 9 scenes. Got: ${scenes.length} scenes. ` +
                  `Scene resolution failed - cannot generate preview prompt.`
                )
              }
              
              finalPrompt = buildPreviewPromptFromScenes(scenes)
              chosenPromptSource = "canonical_preview_pipeline_fallback"
              console.log("[v0] PROMPT_SOURCE=canonical_preview_pipeline_fallback")
            } catch (sceneError) {
              console.error(`[v0] [GENERATE-SINGLE] ❌ Canonical pipeline fallback failed:`, sceneError)
              return Response.json(
                {
                  error: "SCENE_RESOLUTION_FAILED",
                  details: sceneError instanceof Error ? sceneError.message : "Failed to resolve scenes",
                },
                { status: 500 }
              )
            }
            
            // Skip all Maya fallback logic - canonical pipeline already handled it
            // Save prompt and continue to image generation
            if (finalPrompt) {
              await sql`
                UPDATE feed_posts
                SET prompt = ${finalPrompt}
                WHERE id = ${postId}
              `
            }
            // Skip all legacy Maya fallback code below (lines 657-1122)
            // This path should never execute, but if it does, finalPrompt is already set
            const [previewFeed] = await sql`
              SELECT id
              FROM feed_layouts
              WHERE user_id = ${user.id}
                AND layout_type = 'preview'
              ORDER BY created_at DESC
              LIMIT 1
            ` as PreviewFeed[]
            
            if (previewFeed) {
              // Get preview template from the preview feed's first post
              const [previewPost] = await sql`
                SELECT prompt
                FROM feed_posts
                WHERE feed_layout_id = ${previewFeed.id}
                  AND position = 1
                  AND prompt IS NOT NULL
                  AND prompt != ''
                ORDER BY created_at ASC
                LIMIT 1
              ` as PersonalBrand[]
              
              previewTemplate = previewPost?.prompt || null
              
              if (previewTemplate) {
                console.log(`[v0] [GENERATE-SINGLE] ✅ Found preview template from preview feed (${previewTemplate.split(/\s+/).length} words):`, previewTemplate.substring(0, 150))
              } else {
                console.log(`[v0] [GENERATE-SINGLE] ⚠️ Preview feed found but no template prompt stored`)
              }
            } else {
              console.log(`[v0] [GENERATE-SINGLE] ⚠️ No preview feed found - Maya will generate based on personal brand data`)
            }
            
            // Extract aesthetic from preview template for locked aesthetic mode
            let lockedAesthetic = null
            templateReferencePrompt = null
            
            // 🔴 CRITICAL: Check if preview feed matches current brand profile style
            // If user updated their style in wizard, use new style instead of old preview
            let shouldUsePreview = false
            let currentBrandStyle: { category: string; mood: string } | null = null
            
            // Get current brand profile style
            // PRIORITY 1: Use feed.feed_style if available (per-feed style selection) - THIS IS THE CURRENT FEED'S STYLE
            // PRIORITY 2: Use user_personal_brand (unified wizard)
            let feedStyle: string | null = null
            let category: string | null = null
            
            // CRITICAL: Check feed.feed_style FIRST - this is the style selected for THIS feed
            // If current feed has a different style than preview feed, we should NOT use preview feed
            if (feedLayout?.feed_style) {
              feedStyle = feedLayout.feed_style.toLowerCase().trim()
              console.log(`[v0] [GENERATE-SINGLE] 🔴 CURRENT FEED's feed_style: ${feedStyle} - this takes priority over preview feed`)
            }
            
            // If feed_style not set, check user_personal_brand
            if (!feedStyle) {
              const personalBrandCheck = await sql`
                SELECT settings_preference, visual_aesthetic
                FROM user_personal_brand
                WHERE user_id = ${user.id}
                ORDER BY updated_at DESC
                LIMIT 1
              ` as PersonalBrand[]
              
              if (personalBrandCheck && personalBrandCheck.length > 0) {
                // Extract feedStyle from settings_preference
                if (personalBrandCheck[0].settings_preference) {
                  try {
                    const settings = typeof personalBrandCheck[0].settings_preference === 'string'
                      ? JSON.parse(personalBrandCheck[0].settings_preference)
                      : personalBrandCheck[0].settings_preference
                    
                    if (Array.isArray(settings) && settings.length > 0) {
                      feedStyle = settings[0]?.toLowerCase().trim()
                    }
                  } catch {
                    // Ignore parse errors
                  }
                }
                
                // Extract category from visual_aesthetic
                if (personalBrandCheck[0].visual_aesthetic) {
                  try {
                    const aesthetics = typeof personalBrandCheck[0].visual_aesthetic === 'string'
                      ? JSON.parse(personalBrandCheck[0].visual_aesthetic)
                      : personalBrandCheck[0].visual_aesthetic
                    
                    if (Array.isArray(aesthetics) && aesthetics.length > 0) {
                      category = aesthetics[0]?.toLowerCase().trim()
                    }
                  } catch {
                    // Ignore parse errors
                  }
                }
              }
            }
            
            if (category && feedStyle) {
              currentBrandStyle = { category, mood: feedStyle }
              console.log(`[v0] [GENERATE-SINGLE] Current brand profile style: ${category}_${feedStyle}`)
            }
            
            // 🔴 CRITICAL: Check if preview feed matches CURRENT FEED's style
            // If current feed has a different style than preview feed, use current feed's style instead
            // PRIORITY: Current feed's feed_style > user_personal_brand > preview feed
            if (previewTemplate && feedLayout?.feed_style) {
              // Get preview feed's style to compare with current feed's style
              const [previewFeedStyle] = await sql`
                SELECT feed_style
                FROM feed_layouts
                WHERE id = ${previewFeed.id}
                LIMIT 1
              ` as FeedStyle[]
              
              const previewFeedStyleValue = previewFeedStyle?.feed_style?.toLowerCase().trim()
              const currentFeedStyleValue = feedLayout.feed_style.toLowerCase().trim()
              
              if (previewFeedStyleValue && currentFeedStyleValue && previewFeedStyleValue !== currentFeedStyleValue) {
                console.log(`[v0] [GENERATE-SINGLE] 🔴 Preview feed style (${previewFeedStyleValue}) doesn't match CURRENT feed style (${currentFeedStyleValue}) - NOT using preview feed`)
                shouldUsePreview = false
                previewTemplate = null // Clear preview template so it won't be used
              } else if (previewFeedStyleValue === currentFeedStyleValue) {
                console.log(`[v0] [GENERATE-SINGLE] ✅ Preview feed style matches current feed style - will check template compatibility...`)
              }
            }
            
            // Check if preview template matches current brand style (only if styles match or no feed_style set)
            if (previewTemplate && currentBrandStyle && shouldUsePreview !== false) {
              // Get the expected template for current brand style
              let expectedTemplate: string | null = null
              try {
                const { BLUEPRINT_PHOTOSHOOT_TEMPLATES } = await import("@/lib/maya/blueprint-photoshoot-templates")
                const templateKey = `${currentBrandStyle.category}_${currentBrandStyle.mood}` as keyof typeof BLUEPRINT_PHOTOSHOOT_TEMPLATES
                expectedTemplate = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey] || null
              } catch (e) {
                console.warn(`[v0] [GENERATE-SINGLE] Error loading templates:`, e)
              }
              
              // Compare preview template with expected template
              // If they match (or are very similar), use preview
              // If they don't match, user likely changed their style - use brand profile template instead
              if (expectedTemplate) {
                // Simple comparison: check if preview contains key phrases from expected template
                const previewLower = previewTemplate.toLowerCase()
                const expectedLower = expectedTemplate.toLowerCase()
                
                // Extract key style indicators from expected template
                const expectedVibe = expectedLower.includes('dark') ? 'dark' : expectedLower.includes('light') ? 'light' : expectedLower.includes('beige') ? 'beige' : null
                const previewVibe = previewLower.includes('dark') ? 'dark' : previewLower.includes('light') ? 'light' : previewLower.includes('beige') ? 'beige' : null
                
                // Check if vibes match
                if (expectedVibe && previewVibe && expectedVibe === previewVibe) {
                  // Vibes match - check if category keywords are present
                  const categoryKeywords: Record<string, string[]> = {
                    luxury: ['luxury', 'editorial', 'sophisticated', 'designer'],
                    minimal: ['minimal', 'scandinavian', 'clean', 'simple'],
                    beige: ['beige', 'camel', 'tan', 'warm'],
                    warm: ['warm', 'cozy', 'golden'],
                    edgy: ['edgy', 'urban', 'street'],
                    professional: ['professional', 'business', 'office']
                  }
                  
                  const expectedKeywords = categoryKeywords[currentBrandStyle.category] || []
                  const hasCategoryKeywords = expectedKeywords.some(keyword => previewLower.includes(keyword))
                  
                  if (hasCategoryKeywords) {
                    shouldUsePreview = true
                    console.log(`[v0] [GENERATE-SINGLE] ✅ Preview feed matches current brand style (${currentBrandStyle.category}_${currentBrandStyle.mood})`)
                  } else {
                    console.log(`[v0] [GENERATE-SINGLE] ⚠️ Preview feed doesn't match current brand style (${currentBrandStyle.category}_${currentBrandStyle.mood}) - using brand profile template instead`)
                  }
                } else {
                  console.log(`[v0] [GENERATE-SINGLE] ⚠️ Preview feed vibe (${previewVibe || 'unknown'}) doesn't match current brand style (${expectedVibe || currentBrandStyle.mood}) - using brand profile template instead`)
                }
              } else {
                // Can't determine expected template - use preview anyway (fallback)
                shouldUsePreview = true
                console.log(`[v0] [GENERATE-SINGLE] ⚠️ Could not load expected template - using preview feed`)
              }
            } else if (previewTemplate && !currentBrandStyle) {
              // No brand profile data - use preview anyway (fallback)
              shouldUsePreview = true
              console.log(`[v0] [GENERATE-SINGLE] ⚠️ No brand profile data found - using preview feed`)
            } else if (!previewTemplate) {
              // No preview - will use brand profile template
              shouldUsePreview = false
            }
            
            if (previewTemplate && shouldUsePreview) {
              // User has preview feed AND it matches current style - extract locked aesthetic
              try {
                const { extractAestheticFromTemplate } = await import("@/lib/feed-planner/extract-aesthetic-from-template")
                lockedAesthetic = extractAestheticFromTemplate(previewTemplate)
                console.log(`[v0] [GENERATE-SINGLE] ✅ Locked aesthetic extracted from preview:`, lockedAesthetic)
              } catch (extractError) {
                console.error(`[v0] [GENERATE-SINGLE] ⚠️ Error extracting aesthetic:`, extractError)
                // Continue without locked aesthetic - Maya can still generate
              }
            }
            
            // Store rotation tracking variables (declared at higher scope for access after Maya generation)
            let vibeKeyForRotation: string | null = null
            let fashionStyleForRotation: string | null = null
            
            // If preview doesn't match current style OR no preview - use template from unified wizard as guide
            if (!shouldUsePreview) {
              // No preview feed - use template injection system (same as free users)
              // COHERENCE RESOLVER ENFORCEMENT (2026-01-18)
              const { getCoherentStyleParameters } = await import("@/lib/feed-planner/generation-helpers")
              const {
                category,
                mood,
                fashionStyle: resolvedFashionStyle,
                adaptationApplied
              } = await getCoherentStyleParameters(feedLayout, user, post.position, {
                checkSettingsPreference: true,
                checkBlueprintSubscribers: false,
                trackSource: false,
                orderBy: 'updated_at'
              })
              
              if (adaptationApplied) {
                console.log(`[v0] [GENERATE-SINGLE] ⚠️ Fashion style adapted for coherence: ${resolvedFashionStyle}`)
              }
              
              try {
                const { getBlueprintPhotoshootPrompt } = await import("@/lib/maya/blueprint-photoshoot-templates")
                const fullTemplate = await getBlueprintPhotoshootPrompt(category, mood, resolvedFashionStyle)
                
                // Build vibe key for rotation tracking (needed after Maya generation)
                const { MOOD_MAP } = await import("@/lib/maya/blueprint-photoshoot-templates")
                const moodMapped = MOOD_MAP[mood as keyof typeof MOOD_MAP] || "light_minimalistic"
                const vibeKey = `${category}_${moodMapped}`
                
                // Store for rotation tracking
                vibeKeyForRotation = vibeKey
                fashionStyleForRotation = resolvedFashionStyle
                
                // ✅ INJECT DYNAMIC CONTENT (same as free users)
                const injectedTemplate = await injectAndValidateTemplate(
                  fullTemplate,
                  category,
                  mood,
                  resolvedFashionStyle,
                  user.id.toString(),
                  {
                    visualAesthetics: visualAestheticOptions || undefined,
                    fashionStyles: fashionStyleOptions || undefined,
                    feedStyle: feedLayout?.feed_style || undefined,
                    category
                  }
                )
                
                // ✅ EXTRACT SINGLE SCENE (same as free users)
                // Phase 3B P1-2: Generate prompt via Authority Layer
                // Phase 1C: Pass category for Scene 8 customization
                // Phase 2C: Pass mood for lifestyle context
                // CRITICAL: Pass resolvedFashionStyle for coherence enforcement
                const authorityResult = await generateFeedSinglePromptViaAuthority(
                  injectedTemplate,
                  post.position,
                  {
                    userId: user.id.toString(),
                    feedId: feedIdInt,
                    postId,
                    generationMode: 'pro',
                    category: category, // Phase 1C: Pass category for Scene 8 awareness
                    mood: mood, // Phase 2C: Pass mood for lifestyle context
                    resolvedFashionStyle: resolvedFashionStyle, // MANDATORY: Coherent fashion style
                  }
                )
                templateReferencePrompt = authorityResult.prompt
                
                console.log(`[v0] [GENERATE-SINGLE] ✅ Extracted scene ${post.position} from injected template via Authority Layer (${templateReferencePrompt.split(/\s+/).length} words, fingerprint: ${authorityResult.metadata.fingerprint})`)
              } catch (templateError) {
                const errorMessage = templateError instanceof Error ? templateError.message : "Unknown template injection error"
                console.error(`[v0] [GENERATE-SINGLE] ⚠️ Error with template injection:`, errorMessage)
                return Response.json(
                  {
                    error: "TEMPLATE_INJECTION_FAILED",
                    details: errorMessage,
                    feedId: feedIdInt,
                    postId,
                    position: post.position,
                  },
                  { status: 500 }
                )
              }
            }
            
            // 🔴 CRITICAL FIX: Bypass Maya for Pro Mode when we have injected template
            // Pro Mode requires strict Blueprint Photoshoot template formatting with brand injection
            // Maya rewrites prompts to natural language, which breaks Pro Mode consistency
            const effectivePreviewTemplate = isPreviewFeed ? previewTemplate : null
            const hasInjectedPrompt = !!(templateReferencePrompt || effectivePreviewTemplate)
            
            if (generationMode === 'pro' && hasInjectedPrompt) {
              // Use injected/extracted prompt directly for Pro Mode
              // This preserves the specific Blueprint Photoshoot formatting and brand details
              if (isPreviewFeed) {
                finalPrompt = templateReferencePrompt || effectivePreviewTemplate || null
              } else {
                finalPrompt = templateReferencePrompt || null
              }
              
              if (finalPrompt) {
                if (finalPrompt.includes("{{")) {
                  console.error(`[v0] [GENERATE-SINGLE] ❌ Prompt contains unresolved placeholders`)
                  return Response.json(
                    {
                      error: "TEMPLATE_INJECTION_FAILED",
                      details: "Prompt contains unresolved placeholders.",
                      feedId: feedIdInt,
                      postId,
                      position: post.position,
                    },
                    { status: 500 }
                  )
                }
                console.log(`[v0] [GENERATE-SINGLE] ✅ Skipping Maya enhancement for Pro Mode - using injected template directly (${finalPrompt.split(/\s+/).length} words)`)
                console.log(`[v0] [GENERATE-SINGLE] Prompt preview:`, finalPrompt.substring(0, 200))
                
                // Increment rotation tracking after using injected template
                if (vibeKeyForRotation && fashionStyleForRotation && !previewTemplate) {
                  try {
                    const { incrementRotationState } = await import("@/lib/feed-planner/rotation-manager")
                    await incrementRotationState(user.id.toString(), vibeKeyForRotation, fashionStyleForRotation)
                    console.log(`[v0] [GENERATE-SINGLE] ✅ Rotation incremented for vibe: ${vibeKeyForRotation}, style: ${fashionStyleForRotation}`)
                  } catch (rotationError: unknown) {
                    // Don't fail generation if rotation increment fails
                    const error = rotationError as { message?: string }
                    console.warn(`[v0] [GENERATE-SINGLE] ⚠️ Failed to increment rotation:`, error.message || String(rotationError))
                  }
                } else if (previewTemplate) {
                  console.log(`[v0] [GENERATE-SINGLE] ⚠️ Rotation not incremented - using preview template (rotation handled during preview generation)`)
                }
              } else {
                console.error(`[v0] [GENERATE-SINGLE] ❌ Injected prompt is null - non-preview feeds must use templateReferencePrompt`)
                return Response.json(
                  {
                    error: "Prompt generation failed",
                    details: "Missing extracted scene prompt for full feed. Please try again.",
                  },
                  { status: 500 }
                )
              }
            } else {
              // Classic Mode OR Pro Mode without injected prompt - use Maya for enhancement
              // Classic Mode relies on Maya to insert trigger words and stylistic keywords
              // Pro Mode without injected prompt falls back to Maya (shouldn't happen in normal flow)
              if (access.isPaidBlueprint && !isPreviewFeed) {
                return Response.json(
                  {
                    error: "TEMPLATE_INJECTION_REQUIRED",
                    feedId: feedIdInt,
                    postId,
                    position: post.position,
                  },
                  { status: 422 }
                )
              }
              chosenPromptSource = "maya_fallback"
              console.log("[v0] PROMPT_SOURCE=maya_fallback")
              console.log(`[v0] [GENERATE-SINGLE] Calling Maya to generate/enhance prompt (Mode: ${generationMode}, HasInjected: ${hasInjectedPrompt})`)
              
              try {
                // Call Maya to generate unique prompt
                // If previewTemplate exists, Maya will use it as aesthetic reference
                // Otherwise, Maya will use injected templateReferencePrompt (single scene from injected template)
                const url = new URL(`${req.nextUrl.origin}/api/maya/generate-feed-prompt`)
                const cookieHeader = req.headers.get("cookie") || ""
                
                const mayaRequest = new NextRequest(url, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Cookie": cookieHeader,
                    "x-studio-pro-mode": generationMode === 'pro' ? "true" : "false", // Set based on actual mode
                  },
                  body: JSON.stringify({
                    mode: lockedAesthetic ? 'feed-planner-background' : 'chat', // Use locked aesthetic mode if preview exists
                    lockedAesthetic: lockedAesthetic || undefined, // Pass extracted aesthetic (only if preview exists)
                    postType: post.post_type || "user",
                    caption: post.caption,
                    feedPosition: post.position,
                    colorTheme: feedLayout?.color_palette,
                    brandVibe: feedLayout?.brand_vibe,
                    // ✅ FIX: Pass INJECTED template as reference (not raw template)
                    // previewTemplate is already injected (from preview feed generation)
                    // templateReferencePrompt is injected single scene (from template injection above)
                    referencePrompt: previewTemplate || templateReferencePrompt || undefined,
                    proMode: generationMode === 'pro', // Set based on actual mode
                    category: post.category,
                  }),
                })
                
                const { POST: generateFeedPromptHandler } = await import("@/app/api/maya/generate-feed-prompt/route")
                const mayaResponse = await generateFeedPromptHandler(mayaRequest)
              
              if (mayaResponse.ok) {
                const mayaData = await mayaResponse.json()
                finalPrompt = mayaData.prompt || mayaData.enhancedPrompt
                chosenPromptSource = "maya_fallback"
                
                // Clean prompt (remove markdown, prefixes, etc.)
                if (finalPrompt) {
                  finalPrompt = finalPrompt
                    .replace(/\*\*/g, '')
                    .replace(/\*/g, '')
                    .replace(/__/g, '')
                    .replace(/_/g, '')
                    .replace(/^.*?FLUX\s+PROMPT\s*\([^)]*\)\s*:?\s*/i, '')
                    .replace(/^.*?PROMPT\s*:?\s*/i, '')
                    .replace(/^.*?FLUX\s*:?\s*/i, '')
                    .replace(/\([^)]*\d+\s+words?[^)]*\)\s*/gi, '')
                    .replace(/^[:;\-\s]+/, '')
                    .trim()
                }
                
                if (finalPrompt) {
                console.log(`[v0] [GENERATE-SINGLE] ✅ Maya generated unique prompt for position ${post.position} (${finalPrompt.split(/\s+/).length} words):`, finalPrompt.substring(0, 150))
                }
                
                // ✅ FIX: Increment rotation tracking after generation completes
                // This ensures next feed gets different outfits/locations
                // Only increment if we used template injection (not preview template)
                if (vibeKeyForRotation && fashionStyleForRotation && !previewTemplate) {
                  try {
                    const { incrementRotationState } = await import("@/lib/feed-planner/rotation-manager")
                    await incrementRotationState(user.id.toString(), vibeKeyForRotation, fashionStyleForRotation)
                    console.log(`[v0] [GENERATE-SINGLE] ✅ Rotation incremented for vibe: ${vibeKeyForRotation}, style: ${fashionStyleForRotation}`)
                  } catch (rotationError: unknown) {
                    // Don't fail generation if rotation increment fails
                    const error = rotationError as { message?: string }
                    console.warn(`[v0] [GENERATE-SINGLE] ⚠️ Failed to increment rotation:`, error.message || String(rotationError))
                  }
                } else if (previewTemplate) {
                  console.log(`[v0] [GENERATE-SINGLE] ⚠️ Rotation not incremented - using preview template (rotation handled during preview generation)`)
                } else {
                  console.log(`[v0] [GENERATE-SINGLE] ⚠️ Rotation not incremented - vibeKey or fashionStyle not available`)
                }
                
                // Validation logging for locked aesthetic
                if (lockedAesthetic && finalPrompt) {
                  console.log(`[v0] [GENERATE-SINGLE] === LOCKED AESTHETIC VALIDATION ===`)
                  console.log(`[v0] [GENERATE-SINGLE] Preview vibe:`, lockedAesthetic.vibe)
                  console.log(`[v0] [GENERATE-SINGLE] Preview colors:`, lockedAesthetic.colorGrade)
                  console.log(`[v0] [GENERATE-SINGLE] Preview setting:`, lockedAesthetic.setting)
                  console.log(`[v0] [GENERATE-SINGLE] Preview outfit:`, lockedAesthetic.outfit)
                  console.log(`[v0] [GENERATE-SINGLE] Preview lighting:`, lockedAesthetic.lightingQuality)
                  console.log(`[v0] [GENERATE-SINGLE] ---`)
                  console.log(`[v0] [GENERATE-SINGLE] Generated prompt:`, finalPrompt.substring(0, 200))
                  console.log(`[v0] [GENERATE-SINGLE] ---`)
                  console.log(`[v0] [GENERATE-SINGLE] Validation:`)
                  console.log(`[v0] [GENERATE-SINGLE]   ✓ Contains vibe:`, finalPrompt.toLowerCase().includes(lockedAesthetic.vibe.toLowerCase().split(' ')[0]))
                  console.log(`[v0] [GENERATE-SINGLE]   ✓ Contains setting:`, finalPrompt.toLowerCase().includes(lockedAesthetic.setting.toLowerCase().split(',')[0]))
                  console.log(`[v0] [GENERATE-SINGLE]   ✓ Contains outfit:`, finalPrompt.toLowerCase().includes(lockedAesthetic.outfit.toLowerCase().split(',')[0]))
                  console.log(`[v0] [GENERATE-SINGLE] ====================================`)
                }
              } else {
                // Try to get detailed error message from Maya response
                let errorDetails = "Failed to generate unique prompt. Please try again."
                try {
                  const errorData = await mayaResponse.json().catch(() => null)
                  if (errorData?.error || errorData?.details) {
                    errorDetails = errorData.details || errorData.error || errorDetails
                  } else {
                    const errorText = await mayaResponse.text().catch(() => "Unknown error")
                    errorDetails = errorText.substring(0, 200) || errorDetails
                  }
                } catch (parseError) {
                  console.warn(`[v0] [GENERATE-SINGLE] Could not parse Maya error response:`, parseError)
                }
                
                console.error(`[v0] [GENERATE-SINGLE] ❌ Maya prompt generation failed (status ${mayaResponse.status}):`, errorDetails)
                return Response.json(
                  {
                    error: "Maya prompt generation failed",
                    details: errorDetails,
                    statusCode: mayaResponse.status,
                  },
                  { status: mayaResponse.status >= 400 && mayaResponse.status < 500 ? mayaResponse.status : 500 }
                )
              }
            } catch (mayaError) {
              console.error(`[v0] [GENERATE-SINGLE] ❌ Error calling Maya:`, mayaError)
              const errorMessage = mayaError instanceof Error ? mayaError.message : "Failed to generate unique prompt. Please try again."
              return Response.json(
                {
                  error: "Maya prompt generation error",
                  details: errorMessage,
                },
                { status: 500 }
              )
            }
            } // Close else block (Classic Mode OR Pro Mode without injected prompt)
            
            // Save the final prompt to the database (either from Maya or injected template)
            if (finalPrompt) {
              await sql`
                UPDATE feed_posts
                SET prompt = ${finalPrompt}
                WHERE id = ${postId}
              `
              console.log(`[v0] [GENERATE-SINGLE] ✅ Saved prompt to database (${generationMode === 'pro' && hasInjectedPrompt ? 'injected template' : 'Maya-generated'})`)
            } else {
              console.error(`[v0] [GENERATE-SINGLE] ❌ No prompt generated - this should not happen`)
              return Response.json(
                {
                  error: "Prompt generation failed",
                  details: "Failed to generate prompt. Please try again.",
                },
                { status: 500 }
              )
            }
          } // Close if (access.isPaidBlueprint)
        } catch (promptError) {
          console.error(`[v0] [GENERATE-SINGLE] Error generating prompt:`, promptError)
          if (access.isPaidBlueprint && !isPreviewFeed) {
            return Response.json(
              {
                error: "TEMPLATE_INJECTION_REQUIRED",
                feedId: feedIdInt,
                postId,
                position: post.position,
              },
              { status: 422 }
            )
          }
          // Fallback to simple prompt
          finalPrompt = post.content_pillar || `Feed post ${post.position}`
        }
      } else { // Close if (!isPromptUsable(finalPrompt)) at line 453
        if (finalPrompt) {
          const safePrompt = typeof finalPrompt === "string" ? finalPrompt : ""
          console.log(`[v0] [GENERATE-SINGLE] ✅ Using pre-generated prompt (${safePrompt.split(/\s+/).length} words)`)
        }
      }
      
      // Ensure finalPrompt is not null before proceeding
      if (!isPromptUsable(finalPrompt)) {
        const safePrompt = typeof finalPrompt === "string" ? finalPrompt : ""
        console.error(`[v0] [GENERATE-SINGLE] ❌ Final prompt validation failed`, {
          promptLength: safePrompt.length,
          promptPreview: safePrompt.substring(0, 100) || '(empty)',
          postId,
          position: post.position,
          feedId: feedIdInt,
          access: {
            isPaidBlueprint: access.isPaidBlueprint,
            isFree: access.isFree,
            isMembership: access.isMembership
          }
        })
        
        return Response.json(
          { 
            error: "Prompt generation incomplete",
            details: "We couldn't generate a valid prompt for your image. This might be due to missing brand profile information. Please ensure your feed style and aesthetic are set.",
            position: post.position,
            feedId: feedIdInt
          },
          { status: 500 }
        )
      }
      
      // 🔴 PROMPT AUTHORITY LOCK-IN: Removed db_prompt fallback
      // All prompts now come from canonical builder, so chosenPromptSource is always set explicitly
      // This fallback was misleading and suggested database prompts might still be reused
      console.log("[v0] [GENERATE-SINGLE] PROVENANCE", {
        feedId: feedIdInt,
        postId,
        isPreviewFeed,
        layout_type: feedLayout?.layout_type || null,
        accessFlags: {
          isPaidBlueprint: access.isPaidBlueprint,
          isFree: access.isFree,
          isMember: access.isMembership,
        },
        generationMode,
        chosenPromptSource: chosenPromptSource || "unknown",
        hasTemplateReferencePrompt: !!templateReferencePrompt,
        hasPreviewTemplate: !!previewTemplate,
      })
      const aspectRatio = isPreviewFeed ? '9:16' : (access.isFree ? '9:16' : '4:5')
      
      // ❄️ FROZEN — DO NOT MODIFY PROMPTS HERE
      // Prompt is already final from prompt-shaper.ts (THE AUTHORITY)
      // cleanBlueprintPrompt is legacy and should not mutate Feed Planner prompts
      // Feed Planner prompts from prompt-shaper.ts are already correct
      const cleanedPrompt = finalPrompt // Use prompt as-is from authority
      
      let generation
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          generation = await generateWithNanoBanana({
            prompt: cleanedPrompt,
            image_input: baseImages.map(img => img.url),
            aspect_ratio: aspectRatio,
            resolution: '2K',
            output_format: 'png',
            safety_filter_level: 'block_only_high',
          })
          break
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          const retryable = message.includes("502") || message.includes("Bad Gateway")
          if (attempt === 1 || !retryable) {
            throw error
          }
          await new Promise(resolve => setTimeout(resolve, 1200))
        }
      }
      if (!generation) {
        throw new Error("Failed to generate image")
      }
      
      await sql`
        UPDATE feed_posts
        SET generation_status = 'generating',
            prediction_id = ${generation.predictionId},
            prompt = ${cleanedPrompt},
            updated_at = NOW()
        WHERE id = ${postId}
      `
      
      const deduction = await deductCredits(
        user.id.toString(),
        getStudioProCreditCost('2K'),
        "image",
        `Feed post generation (Pro Mode) - ${post.post_type}`,
        generation.predictionId,
      )
      
      if (!deduction.success) {
        console.error("[v0] [GENERATE-SINGLE] Failed to deduct credits:", deduction.error)
      }
      
      return Response.json({ 
        predictionId: generation.predictionId,
        success: true,
        message: "Pro Mode image generation started",
        mode: 'pro',
      })
    }
    
    console.log("[v0] [GENERATE-SINGLE] Classic Mode post - using trained model")
    console.log("[v0] [GENERATE-SINGLE] Request data:", {
      postType: post.post_type,
      caption: post.caption?.substring(0, 50),
      feedPosition: post.position,
      colorTheme: feedLayout?.color_palette,
      brandVibe: feedLayout?.brand_vibe,
      hasStoredPrompt: !!post.prompt,
      storedPromptPreview: post.prompt?.substring(0, 100),
    })

    let mayaResponse
    try {
      // Create a new request with all cookies from the original request
      // We need to create a proper NextRequest that includes cookies
      const url = new URL(`${req.nextUrl.origin}/api/maya/generate-feed-prompt`)
      const cookieHeader = req.headers.get("cookie") || ""
      
      // Create a new request with cookies
      const mayaRequest = new NextRequest(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": cookieHeader,
        },
        body: JSON.stringify({
          postType: post.post_type,
          caption: post.caption,
          feedPosition: post.position,
          colorTheme: feedLayout?.color_palette,
          brandVibe: feedLayout?.brand_vibe,
          referencePrompt: post.prompt, // Pass stored prompt as reference for Maya to enhance
          isRegeneration: true, // Flag to indicate this is a regeneration
          category: post.category, // Preserve the same category
        }),
      })
      
      // Import and call the route handler directly to avoid authentication issues
      const { POST: generateFeedPromptHandler } = await import("@/app/api/maya/generate-feed-prompt/route")
      mayaResponse = await generateFeedPromptHandler(mayaRequest)
      
      console.log("[v0] [GENERATE-SINGLE] Maya response status:", mayaResponse.status)
    } catch (fetchError: unknown) {
      const error = fetchError as { message?: string; stack?: string; cause?: unknown }
      console.error("[v0] [GENERATE-SINGLE] Fetch error:", {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      })
      return Response.json(
        {
          error: "Failed to generate intelligent prompt",
          details: "Maya's prompt generation service is unavailable. Please try again.",
          shouldRetry: true,
        },
        { status: 503 },
      )
    }

    if (!mayaResponse.ok) {
      console.error("[v0] [GENERATE-SINGLE] Maya prompt generation failed with status:", mayaResponse.status)

      let errorMessage = "Maya's prompt generation failed. Please try again."
      const shouldRetry = true

      try {
        const errorData = await mayaResponse.json()
        console.error("[v0] [GENERATE-SINGLE] Error response:", errorData)

        if (mayaResponse.status === 429) {
          errorMessage = "Rate limit exceeded. Please wait a moment and try again."
        } else if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch {
        console.error("[v0] [GENERATE-SINGLE] Could not parse error response")
      }

      return Response.json(
        {
          error: errorMessage,
          details: "Maya's intelligent prompt generation is required for your designed feed.",
          shouldRetry,
        },
        { status: mayaResponse.status },
      )
    }

    let finalPrompt
    try {
      const mayaData = await mayaResponse.json()
      finalPrompt = mayaData.prompt || mayaData.enhancedPrompt
      console.log("[v0] [GENERATE-SINGLE] ✅ Maya generated enhanced prompt (raw):", finalPrompt?.substring(0, 150))

      if (!finalPrompt || finalPrompt.trim().length === 0) {
        console.error("[v0] [GENERATE-SINGLE] Maya returned empty prompt")
        return Response.json(
          {
            error: "Maya generated an empty prompt. Please try again.",
            shouldRetry: true,
          },
          { status: 500 },
        )
      }

      // CRITICAL: Strip any markdown formatting, prefixes, or metadata that might have slipped through
      finalPrompt = finalPrompt
        // Remove markdown bold/italic formatting
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/__/g, '')
        .replace(/_/g, '')
        // Remove common prefix patterns like "FLUX PROMPT (Type - X words):" or "PROMPT:" etc.
        .replace(/^.*?FLUX\s+PROMPT\s*\([^)]*\)\s*:?\s*/i, '')
        .replace(/^.*?PROMPT\s*:?\s*/i, '')
        .replace(/^.*?FLUX\s*:?\s*/i, '')
        // Remove word count patterns like "(62 words)" or "(X words)"
        .replace(/\([^)]*\d+\s+words?[^)]*\)\s*/gi, '')
        // Remove any leading colons, dashes, or other separators
        .replace(/^[:;\-\s]+/, '')
        .trim()

      console.log("[v0] [GENERATE-SINGLE] ✅ Maya generated enhanced prompt (cleaned):", finalPrompt?.substring(0, 150))

      // Double-check trigger word and gender are present (backup validation)
      // Guard: model is guaranteed to be non-null in Classic Mode (checked earlier)
      if (!model) {
        console.error("[v0] [GENERATE-SINGLE] Model is null in Classic Mode path")
        return Response.json({ error: "Model configuration error" }, { status: 500 })
      }

      // Phase 2C-2: Route prompt validation through Prompt Authority Layer
      // Build user gender term (same format as concept cards)
      let userGender = "person"
      if (model.gender) {
        const genderStr = typeof model.gender === 'string' ? model.gender : String(model.gender)
        const dbGender = genderStr.toLowerCase().trim()
        if (dbGender === "woman" || dbGender === "female") {
          userGender = "woman"
        } else if (dbGender === "man" || dbGender === "male") {
          userGender = "man"
        }
      }
      
      const ethnicityStr = typeof model.ethnicity === 'string' ? model.ethnicity : undefined
      
      try {
        const validationResult = validatePrompt(finalPrompt, 'classic', {
          userId: user.id.toString(),
          triggerWord: model.trigger_word || '',
          userGender,
          ethnicity: ethnicityStr,
        })
        
        if (validationResult.valid) {
          finalPrompt = validationResult.prompt
          if (validationResult.fixes.length > 0) {
            console.log("[v0] [GENERATE-SINGLE] ✅ Prompt validated via Authority Layer, fixes applied:", validationResult.fixes)
          } else {
            console.log("[v0] [GENERATE-SINGLE] ✅ Prompt validated via Authority Layer, no fixes needed")
          }
        } else {
          // Fallback to original validation if Authority Layer fails
          console.warn("[v0] [GENERATE-SINGLE] ⚠️ Authority Layer validation failed, using fallback:", validationResult.fixes)
          finalPrompt = ensureTriggerWordPrefix(finalPrompt, model.trigger_word || '')
          finalPrompt = ensureGenderInPrompt(finalPrompt, model.trigger_word || '', userGender, ethnicityStr)
        }
      } catch (authorityError) {
        // Fallback to original validation if Authority Layer throws
        console.warn("[v0] [GENERATE-SINGLE] ⚠️ Prompt Authority Layer error, using fallback:", authorityError)
        finalPrompt = ensureTriggerWordPrefix(finalPrompt, model.trigger_word || '')
        finalPrompt = ensureGenderInPrompt(finalPrompt, model.trigger_word || '', userGender, ethnicityStr)
      }
      
      if (model.trigger_word && finalPrompt.toLowerCase().startsWith(model.trigger_word.toLowerCase())) {
        console.log("[v0] [GENERATE-SINGLE] ✅ Trigger word confirmed at start of prompt")
      } else {
        console.log("[v0] [GENERATE-SINGLE] ⚠️ Trigger word prepended:", model.trigger_word)
      }
    } catch (jsonError) {
      console.error("[v0] [GENERATE-SINGLE] Failed to parse Maya response as JSON:", jsonError)
      return Response.json(
        {
          error: "Failed to parse Maya's response. Please try again.",
          shouldRetry: true,
        },
        { status: 500 },
      )
    }

    const qualitySettings =
      MAYA_QUALITY_PRESETS[post.post_type as keyof typeof MAYA_QUALITY_PRESETS] || MAYA_QUALITY_PRESETS.default

    // Guard: model is guaranteed to be non-null in Classic Mode (checked earlier)
    if (!model) {
      console.error("[v0] [GENERATE-SINGLE] Model is null in Classic Mode path")
      return Response.json({ error: "Model configuration error" }, { status: 500 })
    }

    if (model.lora_scale !== null && model.lora_scale !== undefined) {
      qualitySettings.lora_scale = Number(model.lora_scale)
    }

    // Extract version ID using shared helper
    const replicateVersionId = extractReplicateVersionId(model.replicate_version_id || null)
    
    if (!replicateVersionId) {
      console.error("[v0] [GENERATE-SINGLE] Replicate version ID not found after extraction")
      return Response.json({ error: "Replicate version ID not found" }, { status: 400 })
    }

    console.log("[v0] [GENERATE-SINGLE] Generating feed post with Maya's intelligent prompt:", {
      postId,
      postType: post.post_type,
      promptLength: finalPrompt.length,
      photoshootMode: feedLayout?.photoshoot_enabled || false,
    })

    const replicate = getReplicateClient()

    // Calculate seed for photoshoot mode if enabled
    let seed: number | undefined = undefined
    if (feedLayout?.photoshoot_enabled && feedLayout?.photoshoot_base_seed) {
      const seedVariation = post.seed_variation || 0
      seed = feedLayout.photoshoot_base_seed + seedVariation
      console.log("[v0] [GENERATE-SINGLE] Using photoshoot seed:", seed, "variation:", seedVariation)
    }

    // Build Replicate input using shared helper
    // model.lora_weights_url is guaranteed to be non-null (checked earlier at line 296)
    const loraWeightsUrl = model.lora_weights_url
    if (!loraWeightsUrl) {
      console.error("[v0] [GENERATE-SINGLE] LoRA weights URL is null")
      return Response.json({ error: "LoRA weights URL not found" }, { status: 400 })
    }

    const generationInput = buildClassicModeReplicateInput({
      prompt: finalPrompt,
      qualitySettings,
      loraWeightsUrl,
      seed,
    })

    console.log("[v0] [GENERATE-SINGLE] Creating Replicate prediction with:", {
      version: replicateVersionId,
      hasLora: !!generationInput.hf_lora,
      promptLength: generationInput.prompt?.length,
      seed: generationInput.seed,
      extraLoraIncluded: !!generationInput.extra_lora,
    })

    const prediction = await replicate.predictions.create({
      version: replicateVersionId,
      input: generationInput,
    })

    console.log("[v0] [GENERATE-SINGLE] ✅ Prediction created successfully:", prediction.id)

    // Deduct Classic Mode credits (1 credit)
    const deduction = await deductCredits(
      user.id.toString(),
      CREDIT_COSTS.IMAGE,
      "image",
      `Feed post generation (Classic Mode) - ${post.post_type}`,
      prediction.id,
    )

    if (!deduction.success) {
      console.error("[v0] [GENERATE-SINGLE] Failed to deduct credits:", deduction.error)
      // Note: Prediction already created, so we continue but log the error
    } else {
      console.log("[v0] [GENERATE-SINGLE] Credits deducted. New balance:", deduction.newBalance)
    }

    await sql`
      UPDATE feed_posts
      SET 
        generation_status = 'generating', 
        prediction_id = ${prediction.id}, 
        prompt = ${finalPrompt}, 
        image_url = NULL,
        updated_at = NOW()
      WHERE id = ${postId}
    `

    console.log("[v0] [GENERATE-SINGLE] ✅ Database updated with prediction_id:", prediction.id, "for post:", postId)

    return Response.json({ 
      predictionId: prediction.id,
      success: true,
      message: "Image generation started",
    })
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string }
    console.error("[v0] [GENERATE-SINGLE] Error generating single post:", err.message || String(error))
    
    // Use replicate error handler for user-friendly messages
    const { formatReplicateErrorResponse } = await import("@/lib/replicate-error-handler")
    const errorResponse = formatReplicateErrorResponse(error, "Failed to start image generation")
    
    // Log technical details but return user-friendly message
    console.error("[v0] [GENERATE-SINGLE] Technical error:", errorResponse._technical)
    
    return Response.json(
      {
        error: errorResponse.error,
        details: errorResponse.details,
        shouldRetry: errorResponse.shouldRetry,
        retryAfter: errorResponse.retryAfter
      },
      { status: 500 },
    )
  }
}
