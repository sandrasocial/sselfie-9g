import { NextRequest } from "next/server"
import { getAuthenticatedUserWithRetry, clearAuthCache } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { MAYA_QUALITY_PRESETS } from "@/lib/maya/quality-settings"
import { checkGenerationRateLimit } from "@/lib/rate-limit"
import { checkCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits"
import { extractReplicateVersionId, ensureTriggerWordPrefix, ensureGenderInPrompt, buildClassicModeReplicateInput } from "@/lib/replicate-helpers"
import { generateWithNanoBanana, getStudioProCreditCost } from "@/lib/nano-banana-client"
import { getFeedPlannerAccess } from "@/lib/feed-planner/access-control"

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

    const { postId } = await req.json()
    
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
    // Free users should always use Pro Mode (Nano Banana Pro) - no trained model required
    // Default to 'pro' if not set (for free users)
    // Access was already fetched above, reuse it
    const generationMode = post.generation_mode || (access.isFree ? 'pro' : 'classic')
    const proModeType = post.pro_mode_type || null
    console.log("[v0] [GENERATE-SINGLE] Post generation mode:", { generationMode, proModeType, isFree: access.isFree, postGenerationMode: post.generation_mode })

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

    const [feedLayout] = await sql`
      SELECT color_palette, brand_vibe, photoshoot_enabled, photoshoot_base_seed FROM feed_layouts WHERE id = ${feedIdInt}
    `

    // Only fetch model for Classic Mode (Pro Mode doesn't need custom model)
    let model: any = null
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
      
      if (avatarImages.length === 0) {
        return Response.json(
          {
            error: "Pro Mode requires reference images",
            details: "Please upload at least one avatar image in your profile settings to use Pro Mode.",
          },
          { status: 400 },
        )
      }
      
      if (avatarImages.length < 3) {
        console.warn(`[v0] [GENERATE-SINGLE] ⚠️ Only ${avatarImages.length} avatar image(s) available. Pro Mode works best with 3+ images.`)
      }
      
      const baseImages = avatarImages.map((img: any) => ({
        url: img.image_url,
        type: 'user-photo' as const,
      }))
      
      // Get brand kit if available
      const [brandKit] = await sql`
        SELECT primary_color, secondary_color, accent_color, font_style, brand_tone
        FROM brand_kits
        WHERE user_id = ${user.id} AND is_default = true
        LIMIT 1
      `
      
      // Use stored prompt from feed creation (should already be a template prompt from grid library)
      // Template prompts are generated during feed creation using getBlueprintPhotoshootPrompt (same as old blueprint)
      let finalPrompt = post.prompt
      
      if (!finalPrompt || finalPrompt.trim().length < 20) {
        // Prompt missing - get it from blueprint_subscribers using template library (same as old blueprint)
        console.log(`[v0] [GENERATE-SINGLE] ⚠️ Pro Mode post ${post.position} missing prompt. Getting from template library...`)
        
        try {
          // Get wizard context from blueprint_subscribers (same as old blueprint)
          const blueprintSubscriber = await sql`
            SELECT form_data, feed_style
            FROM blueprint_subscribers
            WHERE user_id = ${user.id}
            LIMIT 1
          ` as any[]
          
          if (blueprintSubscriber.length > 0) {
            const formData = blueprintSubscriber[0].form_data || {}
            const feedStyle = blueprintSubscriber[0].feed_style || null
            
            // Get category from form_data.vibe (same as old blueprint)
            const category = (formData.vibe || "professional") as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
            // Get mood from feed_style (same as old blueprint)
            const mood = (feedStyle || "minimal") as "luxury" | "minimal" | "beige"
            
            // Get template prompt from grid library (same as old blueprint)
            const { getBlueprintPhotoshootPrompt } = await import("@/lib/maya/blueprint-photoshoot-templates")
            finalPrompt = getBlueprintPhotoshootPrompt(category, mood)
            console.log(`[v0] [GENERATE-SINGLE] ✅ Using template prompt from grid library: ${category}_${mood} (${finalPrompt.split(/\s+/).length} words)`)
            
            // Save the template prompt to the database for future use
            await sql`
              UPDATE feed_posts
              SET prompt = ${finalPrompt}
              WHERE id = ${postId}
            `
          } else {
            // No blueprint_subscribers data - fall back to Nano Banana builder (for backward compatibility)
            console.log(`[v0] [GENERATE-SINGLE] ⚠️ No blueprint_subscribers data found. Falling back to Nano Banana builder...`)
            const { buildNanoBananaPrompt } = await import("@/lib/maya/nano-banana-prompt-builder")
            
            const promptResult = await buildNanoBananaPrompt({
              userId: user.id.toString(),
              mode: 'brand-scene',
              userRequest: post.content_pillar || `Feed post ${post.position} - authentic Instagram-style selfie with natural lighting`,
              inputImages: {
                baseImages: baseImages,
              },
            })
            
            finalPrompt = promptResult.optimizedPrompt
            console.log(`[v0] [GENERATE-SINGLE] ✅ Generated Nano Banana prompt as fallback (${finalPrompt.split(/\s+/).length} words)`)
            
            // Save the generated prompt to the database for future use
            await sql`
              UPDATE feed_posts
              SET prompt = ${finalPrompt}
              WHERE id = ${postId}
            `
          }
        } catch (promptError) {
          console.error(`[v0] [GENERATE-SINGLE] Error getting template prompt:`, promptError)
          // Fallback to simple prompt
          finalPrompt = post.content_pillar || `Feed post ${post.position}`
        }
      } else {
        console.log(`[v0] [GENERATE-SINGLE] ✅ Using pre-generated template prompt from feed creation (${finalPrompt.split(/\s+/).length} words)`)
      }
      
      // Generate with Nano Banana Pro
      const generation = await generateWithNanoBanana({
        prompt: finalPrompt,
        image_input: baseImages.map(img => img.url),
        aspect_ratio: '4:5', // Instagram portrait format
        resolution: '2K',
        output_format: 'png',
        safety_filter_level: 'block_only_high',
      })
      
      // Update database with prediction ID
      await sql`
        UPDATE feed_posts
        SET generation_status = 'generating',
            prediction_id = ${generation.predictionId},
            prompt = ${finalPrompt},
            updated_at = NOW()
        WHERE id = ${postId}
      `
      
      // Deduct Pro Mode credits (2 credits)
      const deduction = await deductCredits(
        user.id.toString(),
        getStudioProCreditCost('2K'),
        "image",
        `Feed post generation (Pro Mode) - ${post.post_type}`,
        generation.predictionId,
      )
      
      if (!deduction.success) {
        console.error("[v0] [GENERATE-SINGLE] Failed to deduct credits:", deduction.error)
      } else {
        console.log("[v0] [GENERATE-SINGLE] Credits deducted. New balance:", deduction.newBalance)
      }
      
      console.log("[v0] [GENERATE-SINGLE] ✅ Pro Mode prediction created successfully:", generation.predictionId)
      
      return Response.json({ 
        predictionId: generation.predictionId,
        success: true,
        message: "Pro Mode image generation started",
        mode: 'pro',
      })
    }
    
    // Classic Mode path (existing logic)
    console.log("[v0] [GENERATE-SINGLE] Classic Mode post - using trained model")
    
    // Always use Maya's expertise to generate/enhance prompts
    // This ensures trigger word, personal brand styling, and user context are always included
    console.log("[v0] [GENERATE-SINGLE] Calling Maya to generate enhanced prompt with expertise...")
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
    } catch (fetchError: any) {
      console.error("[v0] [GENERATE-SINGLE] Fetch error:", {
        message: fetchError.message,
        stack: fetchError.stack,
        cause: fetchError.cause,
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
      } catch (e) {
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
      finalPrompt = ensureTriggerWordPrefix(finalPrompt, model.trigger_word)
      
      // Build user gender term (same format as concept cards)
      let userGender = "person"
      if (model.gender) {
        const dbGender = model.gender.toLowerCase().trim()
        if (dbGender === "woman" || dbGender === "female") {
          userGender = "woman"
        } else if (dbGender === "man" || dbGender === "male") {
          userGender = "man"
        }
      }
      
      // CRITICAL: Ensure gender is present after trigger word (fixes missing gender issue)
      finalPrompt = ensureGenderInPrompt(finalPrompt, model.trigger_word, userGender, model.ethnicity)
      
      if (finalPrompt.toLowerCase().startsWith(model.trigger_word.toLowerCase())) {
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

    if (model.lora_scale !== null && model.lora_scale !== undefined) {
      qualitySettings.lora_scale = Number(model.lora_scale)
    }

    // Extract version ID using shared helper
    const replicateVersionId = extractReplicateVersionId(model.replicate_version_id)
    
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
    const generationInput = buildClassicModeReplicateInput({
      prompt: finalPrompt,
      qualitySettings,
      loraWeightsUrl: model.lora_weights_url,
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

    const updateResult = await sql`
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
  } catch (error: any) {
    console.error("[v0] [GENERATE-SINGLE] Error generating single post:", error)
    return Response.json(
      {
        error: "Failed to generate post",
        details: error.message,
        shouldRetry: true,
      },
      { status: 500 },
    )
  }
}
