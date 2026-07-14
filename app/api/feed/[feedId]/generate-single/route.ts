import { NextRequest } from "next/server"
import { getAuthenticatedUserWithRetry, clearAuthCache } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { getReplicateClient } from "@/lib/replicate-client"
import { MAYA_QUALITY_PRESETS } from "@/lib/maya/quality-settings"
import { checkGenerationRateLimit } from "@/lib/rate-limit"
import { checkCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits"
import { extractReplicateVersionId, ensureTriggerWordPrefix, ensureGenderInPrompt, buildClassicModeReplicateInput } from "@/lib/replicate-helpers"
import { validatePrompt } from "@/lib/generation/prompt"
import { generateWithNanoBanana, getStudioProCreditCost } from "@/lib/nano-banana-client"
import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { getFeedStyleV2ByName } from "@/lib/feed-planner/feed-style-prompt-loader"
import { selectPromptForPosition } from "@/lib/feed-planner/feed-style-generation"

/* eslint-disable no-console */
// Console statements are used for debugging and monitoring in development

// Type definitions for database query results
interface FeedLayout {
  color_palette?: string | null
  brand_vibe?: string | null
  photoshoot_enabled?: boolean | null
  photoshoot_base_seed?: number | null
  feed_style?: string | null
  feed_style_variation_id?: number | null
  layout_type?: string | null
  visual_aesthetic?: string | unknown[] | null
  fashion_style?: string | unknown[] | null
  period_month?: string | null
}

interface AvatarImage {
  image_url: string
  display_order: number | null
  uploaded_at: Date | string
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

// gpt-image-2 generates synchronously (no prediction polling) - the call itself takes
// 30-90s, so the route needs the extended window.
export const maxDuration = 180

export async function POST(req: NextRequest, { params }: { params: Promise<{ feedId: string }> | { feedId: string } }) {
  let claimedPostId: number | null = null
  let claimedUserId: string | number | null = null
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

    if (!access.canGenerateImages) {
      console.error("[v0] [GENERATE-SINGLE] User does not have generation access", {
        canGenerateImages: access.canGenerateImages,
        isFree: access.isFree,
        creditBalance: access.creditBalance,
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
      WHERE feed_layout_id = ${feedIdInt}
      AND id = ${postId}
      AND user_id = ${user.id}
    `

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 })
    }

    if (post.image_url) {
      return Response.json({
        success: true,
        alreadyGenerated: true,
        imageUrl: post.image_url,
        predictionId: post.prediction_id || null,
      })
    }

    if (post.prediction_id && post.generation_status !== "failed") {
      return Response.json({
        success: true,
        alreadyGenerating: true,
        predictionId: post.prediction_id,
      })
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

    const claimRows = await sql`
      UPDATE feed_posts
      SET generation_status = 'generating',
          generation_mode = ${generationMode},
          updated_at = NOW()
      WHERE id = ${postId}
      AND user_id = ${user.id}
      AND image_url IS NULL
      AND prediction_id IS NULL
      AND (generation_status IS NULL OR generation_status IN ('pending', 'failed'))
      RETURNING id
    `

    if (claimRows.length === 0) {
      const [currentPost] = await sql`
        SELECT prediction_id, image_url, generation_status
        FROM feed_posts
        WHERE id = ${postId}
        AND user_id = ${user.id}
        LIMIT 1
      `
      if (currentPost?.image_url) {
        return Response.json({
          success: true,
          alreadyGenerated: true,
          imageUrl: currentPost.image_url,
          predictionId: currentPost.prediction_id || null,
        })
      }
      if (currentPost?.prediction_id) {
        return Response.json({
          success: true,
          alreadyGenerating: true,
          predictionId: currentPost.prediction_id,
        })
      }
      return Response.json(
        {
          error: "Generation already in progress",
          retryable: true,
        },
        { status: 409 },
      )
    }
    claimedPostId = Number(postId)
    claimedUserId = user.id

    // Query feed_layouts with feed_style and layout_type (handle case where column might not exist yet)
    let feedLayout: FeedLayout | undefined
    try {
      const result = await sql`
        SELECT color_palette, brand_vibe, photoshoot_enabled, photoshoot_base_seed, feed_style, feed_style_variation_id, layout_type, visual_aesthetic, fashion_style, period_month
        FROM feed_layouts
        WHERE id = ${feedIdInt}
        AND user_id = ${user.id}
      `
      feedLayout = result[0] as FeedLayout | undefined
      
      // Log what we retrieved from database for debugging
      console.log(`[v0] [GENERATE-SINGLE] Feed layout retrieved: feedStyle=${feedLayout?.feed_style}, variationId=${feedLayout?.feed_style_variation_id}, layoutType=${feedLayout?.layout_type}`)
      
      // Validate variation_id is a valid number if present
      if (feedLayout?.feed_style_variation_id !== null && feedLayout?.feed_style_variation_id !== undefined) {
        const numericVariationId = Number(feedLayout.feed_style_variation_id)
        if (!Number.isFinite(numericVariationId) || numericVariationId <= 0) {
          console.warn(`[v0] [GENERATE-SINGLE] ⚠️ Invalid variation_id in database: ${feedLayout.feed_style_variation_id}, setting to null`)
          feedLayout.feed_style_variation_id = null
        } else {
          feedLayout.feed_style_variation_id = numericVariationId
        }
      }
    } catch (error: unknown) {
      // If feed_style column doesn't exist, query without it
      const errorObj = error as { message?: string; code?: string }
      if (errorObj?.message?.includes('feed_style') || errorObj?.code === '42703') {
        console.warn("[v0] [GENERATE-SINGLE] feed_style column not found, querying without it")
        const result = await sql`
          SELECT color_palette, brand_vibe, photoshoot_enabled, photoshoot_base_seed, layout_type
          FROM feed_layouts 
          WHERE id = ${feedIdInt}
          AND user_id = ${user.id}
        `
        feedLayout = result[0]
        feedLayout.feed_style = null // Set to null if column doesn't exist
        feedLayout.feed_style_variation_id = null
      } else {
        throw error // Re-throw if it's a different error
      }
    }

    if (!feedLayout) {
      return Response.json({ error: "Feed not found" }, { status: 404 })
    }

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
      
      // Object scenes (flatlay/detail) generate WITHOUT identity references - attaching her
      // selfie to a product shot risks painting her into it. Only person scenes require one.
      // Legacy rows (2026-07-07, Sandra's duplicate-portraits report): older manual grids
      // wrote post_type 'user' for every slot, killing the curated selfie/flatlay/detail
      // rotation - resolve those from the style's own grid pattern by position instead.
      const { CURATED_FEED_STYLE_MAP: STYLE_MAP } = await import("@/lib/style-presets")
      const { postTypeForPosition: slotTypeFor } = await import("@/lib/feed-planner/write-auto-draft")
      const declaredType = typeof post.post_type === "string" ? post.post_type : ""
      const effectivePostType =
        declaredType === "selfie" || declaredType === "flatlay" || declaredType === "detail"
          ? declaredType
          : slotTypeFor(
              (STYLE_MAP[feedLayout?.feed_style as keyof typeof STYLE_MAP]?.grid ??
                STYLE_MAP["Dark & Moody"].grid) as readonly string[],
              Number(post.position) || 1,
            )
      const isObjectScene = effectivePostType === "flatlay" || effectivePostType === "detail"
      console.log(`[v0] [GENERATE-SINGLE] Slot role: declared=${declaredType || "(none)"} effective=${effectivePostType} objectScene=${isObjectScene}`)
      if (referenceImageCount === 0 && !isObjectScene) {
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
      
      // FREE FUNNEL RETIRED (Sandra, 2026-07-07): preview feeds can no longer be created and
      // existing rows are pruned - generation against a leftover preview layout is refused.
      const isPreviewFeed = feedLayout?.layout_type === 'preview'
      if (isPreviewFeed) {
        return Response.json(
          { error: "PREVIEW_RETIRED", details: "Preview feeds are no longer available." },
          { status: 410 },
        )
      }
      let chosenPromptSource:
        | "v2_preview_prompt"
        | "v2_scene_prompt"
        | "canonical_preview_pipeline_fallback"
        | null = null
      
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
      try {
        if (!isPromptUsable(finalPrompt)) {
          console.log(
            `[v0] [GENERATE-SINGLE] ⚠️ Pro Mode post ${post.position} missing prompt. Generating based on feed type and user type...`
          )
          try {
            if (!feedLayout?.feed_style) {
              return Response.json(
                {
                  error: "FEED_STYLE_REQUIRED",
                  details: "Feed style is required for Feed Planner V2 generation.",
                },
                { status: 422 },
              )
            }

            const style = await getFeedStyleV2ByName(feedLayout.feed_style)
            if (!style || !style.enabled) {
              return Response.json(
                { error: "FEED_STYLE_NOT_READY", details: "Feed style is not available for V2." },
                { status: 422 },
              )
            }

            const feedVariationId = feedLayout?.feed_style_variation_id ?? null
            console.log(`[v0] [GENERATE-SINGLE] Loading prompt for feed: feedId=${feedIdInt}, styleId=${style.id}, feedStyle=${feedLayout?.feed_style}, variationId=${feedVariationId}, isPreviewFeed=${isPreviewFeed}, position=${post.position}`)

            // Validate variation_id is a valid number if provided
            if (feedVariationId !== null && feedVariationId !== undefined) {
              const numericVariationId = Number(feedVariationId)
              if (!Number.isFinite(numericVariationId) || numericVariationId <= 0) {
                console.warn(`[v0] [GENERATE-SINGLE] Invalid variation_id in feed_layouts: ${feedVariationId}, using null`)
                feedLayout.feed_style_variation_id = null
              }
            }

            const selected = await selectPromptForPosition(
              style.id,
              post.position,
              feedVariationId,
            )
            finalPrompt = selected.prompt_text
            chosenPromptSource = "v2_scene_prompt"
            console.log(`[v0] [GENERATE-SINGLE] Scene prompt loaded: position=${post.position}, variationId=${feedVariationId}, selectedVariationId=${selected.variation_id}, length=${finalPrompt?.length || 0}`)

            await sql`
              UPDATE feed_posts
              SET prompt = ${finalPrompt}
              WHERE id = ${postId}
              AND user_id = ${user.id}
            `
          } catch (v2Error) {
            const errorMessage = v2Error instanceof Error ? v2Error.message : "Unknown error"
            console.error("[v0] [GENERATE-SINGLE] ❌ V2 prompt generation failed:", errorMessage)
            return Response.json(
              {
                error: "V2_PROMPT_GENERATION_FAILED",
                details: errorMessage,
                position: post.position,
                feedId: feedIdInt,
              },
              { status: 500 },
            )
          }
        }
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
            { status: 422 },
          )
        }
        // Fallback to simple prompt
        finalPrompt = post.content_pillar || `Feed post ${post.position}`
      }

      if (isPromptUsable(finalPrompt)) {
        const safePrompt = typeof finalPrompt === "string" ? finalPrompt : ""
        console.log(
          `[v0] [GENERATE-SINGLE] ✅ Using pre-generated prompt (${safePrompt.split(/\s+/).length} words)`,
        )
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
      })
      const aspectRatio = isPreviewFeed ? '9:16' : (access.isFree ? '9:16' : '4:5')
      
      // ❄️ FROZEN - DO NOT MODIFY PROMPTS HERE
      // Prompt is already final from prompt-shaper.ts (THE AUTHORITY)
      // cleanBlueprintPrompt is legacy and should not mutate Feed Planner prompts
      // Feed Planner prompts from prompt-shaper.ts are already correct
      const cleanedPrompt = finalPrompt // Use prompt as-is from authority
      
      // Deduct credits BEFORE calling NanoBanana - once generation starts, API cost is incurred
      const deduction = await deductCredits(
        user.id.toString(),
        getStudioProCreditCost('2K'),
        "image",
        `Feed post generation (Pro Mode) - ${post.post_type}`,
      )
      if (!deduction.success) {
        console.error("[v0] [GENERATE-SINGLE] Failed to deduct credits before generation:", deduction.error)
        await sql`
          UPDATE feed_posts
          SET generation_status = 'failed',
              updated_at = NOW()
          WHERE id = ${postId}
          AND user_id = ${user.id}
          AND prediction_id IS NULL
          AND image_url IS NULL
        `
        return Response.json(
          {
            error: "Could not deduct credits",
            code: "credit_deduction_failed",
            message: deduction.error ?? "Credit deduction failed. Please try again.",
          },
          { status: 402 },
        )
      }

      // ── FLAGSHIP ENGINE (2026-07-07): gpt-image-2 via OpenAI, same model as Maya chat. ──
      // Nano Banana Pro is retired here; FEED_PLANNER_IMAGE_ENGINE=nano-banana is the
      // emergency rollback only. Classic (Flux trained model) stays as the legacy opt-in
      // branch below - never the default.
      if (process.env.FEED_PLANNER_IMAGE_ENGINE === "nano-banana") {
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
          AND user_id = ${user.id}
        `

        return Response.json({
          predictionId: generation.predictionId,
          success: true,
          message: "Pro Mode image generation started",
          mode: 'pro',
        })
      }

      // Compose the full prompt the way the chat compiler does: the approved template is the
      // scene foundation; identity + environment-true realism wrap it for person scenes.
      // Object scenes (flatlay/detail) ship the template as-is - it's already a complete,
      // person-free scene prompt with the realism header.
      const { IDENTITY_ANCHOR, PHOTOGRAPHER_REALISM, REALISM_TOKENS, AVOID_LIST, PORTRAIT_QUALITY } =
        await import("@/lib/app-v3/maya/ingredients")
      const { SSELFIE_ENVIRONMENT_INTEGRATION, SSELFIE_SELFIE_RESTYLE } =
        await import("@/lib/app-v3/maya/visual-rules")
      // SCENE LEADS, IDENTITY FOLLOWS (2026-07-07, Sandra's duplicate-portraits report):
      // with the identity anchor on line one, every render collapsed into the same medium
      // eye-level portrait regardless of what the scene template asked for. The template now
      // opens the prompt and an explicit framing-supremacy line keeps close-ups close and
      // full-bodies full.
      //
      // WHO IS IN FRAME is decided by the TEMPLATE TEXT, not the slot label (live proof
      // 2026-07-07: a person-free "detail" template rendered a STRANGER because the model
      // invented one, and several "flatlay"-labeled templates legitimately describe her in
      // the scene). Template mentions a person -> attach her references. No person in the
      // template -> forbid people entirely.
      const templateMentionsPerson = /\b(woman|person|she|her|hers|model|girl|lady)\b/i.test(cleanedPrompt)
      if (templateMentionsPerson && baseImages.length === 0) {
        return Response.json(
          {
            error: "Pro Mode requires reference images",
            details: "Please upload at least one avatar image in your profile settings to use Pro Mode.",
          },
          { status: 400 },
        )
      }
      const usesIdentity = templateMentionsPerson && baseImages.length > 0
      const openaiPrompt = usesIdentity
        ? [
            "THE SCENE (this controls composition, framing, camera distance, pose, and what is in frame):",
            cleanedPrompt,
            "Follow the scene's stated framing and camera distance exactly - a close-up stays a close-up, a full-body shot stays full-body, a seated or walking moment stays exactly that. Never flatten the scene into a standard eye-level portrait.",
            IDENTITY_ANCHOR,
            SSELFIE_SELFIE_RESTYLE,
            SSELFIE_ENVIRONMENT_INTEGRATION,
            PHOTOGRAPHER_REALISM,
            REALISM_TOKENS + ".",
            PORTRAIT_QUALITY,
            AVOID_LIST,
          ].join("\n")
        : [
            cleanedPrompt,
            "No people in this photo: it is a scene, object, or detail shot exactly as described. Do not add a person, a face, hands, or any human presence.",
            PORTRAIT_QUALITY,
          ].join("\n")

      // Synchronous generation: on ANY failure before the image is saved, refund the credits
      // (the async Nano Banana flow couldn't do this; the sync flow can and should).
      let blob: { url: string }
      try {
        const { generateFeedImageWithOpenAI } = await import("@/lib/feed-planner/openai-image")
        const imageBuffer = await generateFeedImageWithOpenAI({
          prompt: openaiPrompt,
          referenceUrls: usesIdentity ? baseImages.map(img => img.url) : [],
        })

        const { put } = await import("@vercel/blob")
        blob = await put(
          `feed-images/${user.id}/${feedIdInt}-${postId}-${Date.now()}.png`,
          imageBuffer,
          { access: "public", contentType: "image/png" },
        )
      } catch (generationError) {
        try {
          const { refundCredits } = await import("@/lib/credits")
          await refundCredits(
            user.id.toString(),
            getStudioProCreditCost('2K'),
            "Refund: feed image generation failed",
            `feed-${feedIdInt}-${postId}`,
          )
        } catch (refundError) {
          console.error("[v0] [GENERATE-SINGLE] Credit refund failed:", refundError)
        }
        throw generationError
      }

      await sql`
        UPDATE feed_posts
        SET generation_status = 'completed',
            image_url = ${blob.url},
            prompt = ${cleanedPrompt},
            updated_at = NOW()
        WHERE id = ${postId}
        AND user_id = ${user.id}
      `

      // Gallery tagging: every calendar image also lands in ai_images so the Photos tab
      // shows it, labeled by plan month + the day's theme. category='photo' keeps it under
      // the Photos filter; source records the engine.
      try {
        const monthLabel = (() => {
          if (!feedLayout?.period_month) return null
          const [y, m] = String(feedLayout.period_month).split("-").map(Number)
          const names = ["January","February","March","April","May","June","July","August","September","October","November","December"]
          return names[(m || 1) - 1] && y ? `${names[(m || 1) - 1]} ${y}` : null
        })()
        const galleryTitle = [
          "Calendar",
          monthLabel,
          post.content_pillar || (isObjectScene ? post.post_type : null),
        ]
          .filter(Boolean)
          .join(" · ")
        await sql`
          INSERT INTO ai_images (
            user_id, image_url, title, prompt, generated_prompt, prediction_id,
            generation_status, source, category, created_at
          ) VALUES (
            ${user.id}, ${blob.url}, ${galleryTitle}, ${cleanedPrompt}, ${openaiPrompt},
            ${"feed-" + feedIdInt + "-" + postId + "-" + Date.now()},
            'completed', 'openai', 'photo', NOW()
          )
        `
      } catch (galleryError) {
        // The feed post is already updated - a gallery-insert failure must not fail the
        // generation, but it must be visible in logs (image exists but is missing from Photos).
        console.error("[v0] [GENERATE-SINGLE] Gallery insert failed (image saved to feed):", galleryError)
      }

      return Response.json({
        success: true,
        imageUrl: blob.url,
        completed: true,
        message: "Image generated",
        mode: 'pro',
        engine: 'openai',
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

    console.log("[v0] [GENERATE-SINGLE] Final prompt sent to Replicate (Classic Mode):", finalPrompt)
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
      AND user_id = ${user.id}
    `

    console.log("[v0] [GENERATE-SINGLE] ✅ Database updated with prediction_id:", prediction.id, "for post:", postId)

    return Response.json({ 
      predictionId: prediction.id,
      success: true,
      message: "Image generation started",
    })
  } catch (error: unknown) {
    if (claimedPostId && claimedUserId) {
      try {
        await sql`
          UPDATE feed_posts
          SET generation_status = 'failed',
              updated_at = NOW()
          WHERE id = ${claimedPostId}
          AND user_id = ${claimedUserId}
          AND prediction_id IS NULL
          AND image_url IS NULL
        `
      } catch (recoveryError) {
        console.error("[v0] [GENERATE-SINGLE] Failed to mark post as failed after error:", recoveryError)
      }
    }
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
