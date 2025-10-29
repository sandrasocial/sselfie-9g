import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { MAYA_QUALITY_PRESETS } from "@/lib/maya/quality-settings"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { feedId: string } }) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const feedId = params.feedId

    const [feedLayout] = await sql`
      SELECT color_palette, brand_vibe FROM feed_layouts WHERE id = ${feedId}
    `

    const neonUserModel = await sql`
      SELECT trigger_word, replicate_version_id, lora_scale, lora_weights_url
      FROM user_models
      WHERE user_id = ${neonUser.id}
      AND training_status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `

    const userModel = neonUserModel.length > 0 ? neonUserModel[0] : null

    if (!userModel) {
      return NextResponse.json({ error: "No trained model found" }, { status: 400 })
    }

    if (!userModel.lora_weights_url) {
      return NextResponse.json({ error: "LoRA weights URL not found" }, { status: 400 })
    }

    // Get all posts for this feed
    const posts = await sql`
      SELECT id, position, post_type, visual_description, text_overlay
      FROM feed_posts
      WHERE feed_layout_id = ${feedId}
      ORDER BY position ASC
    `

    const replicate = getReplicateClient()
    const predictions = []

    for (const post of posts) {
      console.log(`[v0] Calling Maya for post ${post.position}...`)

      try {
        const mayaResponse = await fetch(`${request.url.split("/api/")[0]}/api/maya/generate-feed-prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postType: post.post_type,
            caption: post.text_overlay,
            feedPosition: post.position,
            colorTheme: feedLayout?.color_palette,
            brandVibe: feedLayout?.brand_vibe,
          }),
        })

        let finalPrompt: string
        if (!mayaResponse.ok) {
          console.error(`[v0] Maya failed for post ${post.position}, using fallback`)
          finalPrompt = `${userModel.trigger_word}, ${post.visual_description}`
        } else {
          const mayaData = await mayaResponse.json()
          finalPrompt = mayaData.prompt
          console.log(`[v0] Maya generated prompt for post ${post.position}:`, finalPrompt)
        }

        const qualitySettings =
          MAYA_QUALITY_PRESETS[post.post_type as keyof typeof MAYA_QUALITY_PRESETS] || MAYA_QUALITY_PRESETS.default

        if (userModel.lora_scale !== null && userModel.lora_scale !== undefined) {
          qualitySettings.lora_scale = Number(userModel.lora_scale)
        }

        const prediction = await replicate.predictions.create({
          version: userModel.replicate_version_id,
          input: {
            prompt: finalPrompt,
            ...qualitySettings,
            lora: userModel.lora_weights_url,
          },
        })

        predictions.push({
          postId: post.id,
          predictionId: prediction.id,
          position: post.position,
        })

        // Save prediction ID to database
        await sql`
          UPDATE feed_posts
          SET 
            prediction_id = ${prediction.id},
            status = 'generating',
            updated_at = NOW()
          WHERE id = ${post.id}
        `
      } catch (error) {
        console.error(`[v0] Error generating post ${post.position}:`, error)
        // Continue with other posts even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      predictions,
      message: `Image generation started for ${predictions.length} posts using Maya's intelligent prompts`,
    })
  } catch (error) {
    console.error("[v0] Error generating feed images:", error)
    return NextResponse.json({ error: "Failed to generate images" }, { status: 500 })
  }
}
