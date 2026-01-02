import { NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { extractReplicateVersionId, ensureTriggerWordPrefix, buildClassicModeReplicateInput } from "@/lib/replicate-helpers"
import { checkCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits"
import { generateWithNanoBanana, getStudioProCreditCost } from "@/lib/nano-banana-client"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { feedId: string } }) {
  try {
    const { user, error: authError } = await getAuthenticatedUserWithRetry()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { postId } = await request.json()

    // Get post data and feed layout (including generation_mode)
    const [post] = await sql`
      SELECT prompt, user_id, post_type, caption, position, feed_layout_id, generation_mode, pro_mode_type, content_pillar
      FROM feed_posts 
      WHERE id = ${postId}
    `

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Check generation mode (Pro Mode vs Classic Mode)
    const generationMode = post.generation_mode || 'classic'
    const proModeType = post.pro_mode_type || null
    console.log("[v0] [REGENERATE-POST] Post generation mode:", { generationMode, proModeType })

    // Check credits based on generation mode (Pro Mode = 2 credits, Classic = 1 credit)
    const creditsNeeded = generationMode === 'pro' ? getStudioProCreditCost('2K') : CREDIT_COSTS.IMAGE
    const hasCredits = await checkCredits(neonUser.id.toString(), creditsNeeded)
    if (!hasCredits) {
      console.error("[v0] [REGENERATE-POST] Insufficient credits")
      return NextResponse.json(
        {
          error: "Insufficient credits",
          details: `You need ${creditsNeeded} credit${creditsNeeded > 1 ? 's' : ''} to regenerate this ${generationMode === 'pro' ? 'Pro Mode' : 'Classic Mode'} image. Please purchase more credits.`,
          creditsNeeded,
        },
        { status: 402 },
      )
    }

    // Get feed layout for context
    const [feedLayout] = await sql`
      SELECT color_palette, brand_vibe FROM feed_layouts WHERE id = ${post.feed_layout_id}
    `

    // Route to Pro Mode or Classic Mode based on generation_mode
    if (generationMode === 'pro') {
      console.log("[v0] [REGENERATE-POST] 🎨 Pro Mode post detected - routing to Nano Banana Pro")
      
      // Fetch user's avatar images for Pro Mode
      const avatarImages = await sql`
        SELECT image_url, display_order, uploaded_at
        FROM user_avatar_images
        WHERE user_id = ${neonUser.id}
        AND is_active = true
        ORDER BY display_order ASC, uploaded_at ASC
        LIMIT 5
      `
      
      if (avatarImages.length === 0) {
        return NextResponse.json(
          {
            error: "Pro Mode requires reference images",
            details: "Please upload at least one avatar image in your profile settings to use Pro Mode.",
          },
          { status: 400 },
        )
      }
      
      const baseImages = avatarImages.map((img: any) => ({
        url: img.image_url,
        type: 'user-photo' as const,
      }))
      
      // Get brand kit if available
      const [brandKit] = await sql`
        SELECT primary_color, secondary_color, accent_color, font_style, brand_tone
        FROM brand_kits
        WHERE user_id = ${neonUser.id} AND is_default = true
        LIMIT 1
      `
      
      // Use stored prompt (should already be a Nano Banana prompt from feed creation)
      let finalPrompt = post.prompt
      
      if (!finalPrompt || finalPrompt.trim().length < 20) {
        // Regenerate prompt using buildNanoBananaPrompt if missing
        console.warn(`[v0] [REGENERATE-POST] ⚠️ Pro Mode post ${postId} missing prompt, regenerating...`)
        const { buildNanoBananaPrompt } = await import("@/lib/maya/nano-banana-prompt-builder")
        const userRequest = post.content_pillar || post.prompt || `Feed post ${post.position}`
        
        const { optimizedPrompt } = await buildNanoBananaPrompt({
          userId: neonUser.id,
          mode: (proModeType as any) || 'brand-scene',
          userRequest,
          inputImages: {
            baseImages,
            productImages: [],
            textElements: post.post_type === 'quote' ? [{
              text: post.caption || '',
              style: 'quote' as const,
            }] : undefined,
          },
          workflowMeta: {
            platformFormat: '4:5', // Instagram portrait format
          },
          brandKit: brandKit ? {
            primaryColor: brandKit.primary_color,
            secondaryColor: brandKit.secondary_color,
            accentColor: brandKit.accent_color,
            fontStyle: brandKit.font_style,
            brandTone: brandKit.brand_tone,
          } : undefined,
        })
        finalPrompt = optimizedPrompt
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
      
      // Update post with new prediction
      await sql`
        UPDATE feed_posts
        SET 
          prediction_id = ${generation.predictionId},
          generation_status = 'generating',
          prompt = ${finalPrompt},
          updated_at = NOW()
        WHERE id = ${postId}
      `
      
      // Deduct Pro Mode credits (2 credits)
      const deduction = await deductCredits(
        neonUser.id.toString(),
        getStudioProCreditCost('2K'),
        "image",
        `Feed post regeneration (Pro Mode) - ${post.post_type}`,
        generation.predictionId,
      )
      
      if (!deduction.success) {
        console.error("[v0] [REGENERATE-POST] Failed to deduct credits:", deduction.error)
      } else {
        console.log("[v0] [REGENERATE-POST] ✅ Credits deducted:", deduction.newBalance)
      }
      
      return NextResponse.json({
        success: true,
        predictionId: generation.predictionId,
        message: "Image regeneration started",
      })
    }

    // Classic Mode path (existing logic)
    // Get user's trained model
    const [model] = await sql`
      SELECT replicate_model_url, trigger_word, replicate_version_id, lora_weights_url, lora_scale
      FROM user_models 
      WHERE user_id = ${neonUser.id} 
      AND training_status = 'completed'
      AND (is_test = false OR is_test IS NULL)
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (!model) {
      return NextResponse.json({ error: "No trained model found" }, { status: 400 })
    }

    // Always enhance prompt using Maya's expertise (same as generate-single route)
    let finalPrompt = post.prompt || ""
    try {
      const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const mayaResponse = await fetch(`${origin}/api/maya/generate-feed-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: post.post_type || "portrait",
          caption: post.caption,
          feedPosition: post.position,
          colorTheme: feedLayout?.color_palette,
          brandVibe: feedLayout?.brand_vibe,
          referencePrompt: post.prompt, // Use stored prompt as reference
        }),
      })

      if (mayaResponse.ok) {
        const mayaData = await mayaResponse.json()
        finalPrompt = mayaData.prompt || finalPrompt
        console.log("[v0] [REGENERATE] ✅ Enhanced prompt from Maya:", finalPrompt?.substring(0, 100))
      } else {
        console.warn("[v0] [REGENERATE] ⚠️ Maya enhancement failed, using stored prompt")
      }
    } catch (mayaError) {
      console.error("[v0] [REGENERATE] ⚠️ Maya enhancement error:", mayaError)
      // Continue with stored prompt but log warning
    }

    // Ensure trigger word is present
    finalPrompt = ensureTriggerWordPrefix(finalPrompt, model.trigger_word)

    // Create Replicate prediction with enhanced prompt
    const replicate = getReplicateClient()
    const { MAYA_QUALITY_PRESETS } = await import("@/lib/maya/quality-settings")
    const qualitySettings = MAYA_QUALITY_PRESETS[post.post_type as keyof typeof MAYA_QUALITY_PRESETS] || MAYA_QUALITY_PRESETS.default
    
    if (model.lora_scale !== null && model.lora_scale !== undefined) {
      qualitySettings.lora_scale = Number(model.lora_scale)
    }

    // Extract version ID using shared helper
    const replicateVersionId = extractReplicateVersionId(model.replicate_version_id)
    
    if (!replicateVersionId) {
      return NextResponse.json(
        { error: "Model version not found. Please retrain your model." },
        { status: 400 }
      )
    }

    // Build Replicate input using shared helper
    const generationInput = buildClassicModeReplicateInput({
      prompt: finalPrompt,
      qualitySettings,
      loraWeightsUrl: model.lora_weights_url,
    })

    const prediction = await replicate.predictions.create({
      version: replicateVersionId,
      input: generationInput,
    })

    // Update post with new prediction (consolidated single UPDATE statement)
    await sql`
      UPDATE feed_posts
      SET 
        prediction_id = ${prediction.id},
        generation_status = 'generating',
        prompt = ${finalPrompt},
        image_url = NULL,
        updated_at = NOW()
      WHERE id = ${postId}
    `

    // Deduct Classic Mode credits (1 credit)
    const deduction = await deductCredits(
      neonUser.id.toString(),
      CREDIT_COSTS.IMAGE,
      "image",
      `Feed post regeneration (Classic Mode) - ${post.post_type}`,
      prediction.id,
    )
    
    if (!deduction.success) {
      console.error("[v0] [REGENERATE-POST] Failed to deduct credits:", deduction.error)
    } else {
      console.log("[v0] [REGENERATE-POST] ✅ Credits deducted:", deduction.newBalance)
    }

    console.log("[v0] Regenerating post", postId, "with prediction", prediction.id)

    return NextResponse.json({
      success: true,
      predictionId: prediction.id,
    })
  } catch (error: any) {
    console.error("[v0] Error regenerating post:", error)
    return NextResponse.json({ error: "Failed to regenerate post", details: error?.message }, { status: 500 })
  }
}
