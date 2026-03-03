import { NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { checkCredits, deductCredits } from "@/lib/credits"
import { generateWithNanoBanana, getStudioProCreditCost } from "@/lib/nano-banana-client"
import { getFeedPlannerV2Flag } from "@/lib/feed-planner-v2/feature-flag"
import { getFeedStyleV2ByName } from "@/lib/feed-planner-v2/prompt-loader"
import { getPreviewPromptForStyle, selectPromptForPosition } from "@/lib/feed-planner-v2/generation"


export async function POST(request: Request, { params }: { params: Promise<{ feedId: string }> }) {
  try {
    const { user, error: authError } = await getAuthenticatedUserWithRetry()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const useFeedPlannerV2 = await getFeedPlannerV2Flag(neonUser.id)
    if (!useFeedPlannerV2) {
      return NextResponse.json(
        {
          error: "FEED_PLANNER_V2_REQUIRED",
          details: "Feed Planner V2 is required for regeneration.",
        },
        { status: 410 },
      )
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
    // Feed Planner should ALWAYS use Pro Mode (Nano Banana Pro) for ALL users
    // Force Pro Mode for all Feed Planner regenerations, regardless of stored post.generation_mode
    const generationMode = 'pro'
    const proModeType = post.pro_mode_type || null
    console.log("[v0] [REGENERATE-POST] Post generation mode:", { generationMode, proModeType, storedGenerationMode: post.generation_mode })

    // Check credits based on generation mode (Pro Mode = 2 credits, Classic = 1 credit)
    const creditsNeeded = getStudioProCreditCost('2K')
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
      SELECT color_palette, brand_vibe, feed_style, feed_style_variation_id, layout_type, visual_aesthetic, fashion_style
      FROM feed_layouts
      WHERE id = ${post.feed_layout_id}
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
      
      // Use stored prompt if present, otherwise resolve from V2 prompts
      let finalPrompt = post.prompt
      
      if (!finalPrompt || finalPrompt.trim().length < 20) {
        console.warn(`[v0] [REGENERATE-POST] ⚠️ Pro Mode post ${postId} missing prompt, regenerating via V2 prompts...`)

        if (!feedLayout?.feed_style) {
          return NextResponse.json(
            { error: "FEED_STYLE_REQUIRED", details: "Feed style is required for V2 regeneration." },
            { status: 422 },
          )
        }

        const style = await getFeedStyleV2ByName(feedLayout.feed_style)
        if (!style || !style.enabled) {
          return NextResponse.json(
            { error: "FEED_STYLE_NOT_READY", details: "Feed style is not available for V2." },
            { status: 422 },
          )
        }

        const variationId = feedLayout.feed_style_variation_id ?? null
        if (feedLayout.layout_type === 'preview') {
          finalPrompt = await getPreviewPromptForStyle(style.id, variationId)
        } else {
          const selected = await selectPromptForPosition(style.id, post.position, variationId)
          finalPrompt = selected.prompt_text
        }

        await sql`
          UPDATE feed_posts
          SET prompt = ${finalPrompt}
          WHERE id = ${postId}
        `
        console.log(`[v0] [REGENERATE-POST] ✅ Regenerated prompt via V2 (${feedLayout.layout_type || 'grid_3x3'})`)
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

    return NextResponse.json(
      {
        error: "UNSUPPORTED_GENERATION_MODE",
        details: "Feed Planner V2 supports Pro Mode regeneration only.",
      },
      { status: 400 },
    )
  } catch (error: any) {
    console.error("[v0] Error regenerating post:", error)
    return NextResponse.json({ error: "Failed to regenerate post", details: error?.message }, { status: 500 })
  }
}
