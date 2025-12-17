import { NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"

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

    // Check credits
    if (neonUser.credits < 1) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }

    // Get post data and feed layout
    const [post] = await sql`
      SELECT prompt, user_id, post_type, caption, position, feed_layout_id FROM feed_posts WHERE id = ${postId}
    `

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Get feed layout for context
    const [feedLayout] = await sql`
      SELECT color_palette, brand_vibe FROM feed_layouts WHERE id = ${post.feed_layout_id}
    `

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

    // Create Replicate prediction with enhanced prompt
    const replicate = getReplicateClient()
    const { MAYA_QUALITY_PRESETS } = await import("@/lib/maya/quality-settings")
    const qualitySettings = MAYA_QUALITY_PRESETS[post.post_type as keyof typeof MAYA_QUALITY_PRESETS] || MAYA_QUALITY_PRESETS.default
    
    if (model.lora_scale !== null && model.lora_scale !== undefined) {
      qualitySettings.lora_scale = Number(model.lora_scale)
    }

    // CRITICAL FIX: Ensure version is just the hash, not full model path
    let replicateVersionId = model.replicate_version_id
    if (replicateVersionId && replicateVersionId.includes(':')) {
      const parts = replicateVersionId.split(':')
      replicateVersionId = parts[parts.length - 1] // Get last part (the hash)
      console.log("[v0] ⚠️ Version was in full format, extracted hash:", replicateVersionId)
    }
    
    if (!replicateVersionId) {
      return NextResponse.json(
        { error: "Model version not found. Please retrain your model." },
        { status: 400 }
      )
    }

    const prediction = await replicate.predictions.create({
      version: replicateVersionId,
      input: {
        prompt: finalPrompt,
        guidance_scale: qualitySettings.guidance_scale,
        num_inference_steps: qualitySettings.num_inference_steps,
        aspect_ratio: qualitySettings.aspect_ratio,
        megapixels: qualitySettings.megapixels,
        output_format: qualitySettings.output_format,
        output_quality: qualitySettings.output_quality,
        lora_scale: Number(qualitySettings.lora_scale),
        hf_lora: model.lora_weights_url, // Use hf_lora instead of lora for consistency
        extra_lora: qualitySettings.extra_lora,
        extra_lora_scale: qualitySettings.extra_lora_scale,
        disable_safety_checker: qualitySettings.disable_safety_checker ?? true,
        go_fast: qualitySettings.go_fast ?? false,
        num_outputs: qualitySettings.num_outputs ?? 1,
        model: qualitySettings.model ?? "dev",
      },
    })

    // Deduct credit
    await sql`
      UPDATE users 
      SET credits = credits - 1, updated_at = NOW() 
      WHERE id = ${neonUser.id}
    `

    // Update post with new prediction
    await sql`
      UPDATE feed_posts
      SET 
        prediction_id = ${prediction.id},
        generation_status = 'generating',
        image_url = NULL,
        updated_at = NOW()
      WHERE id = ${postId}
    `

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
