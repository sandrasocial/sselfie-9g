import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"

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

    // Get user's trained model
    const [userModel] = await sql`
      SELECT trigger_word, replicate_version_id, lora_scale
      FROM user_models
      WHERE user_id = ${neonUser.id}
      AND training_status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!userModel) {
      return NextResponse.json({ error: "No trained model found" }, { status: 400 })
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
      const prompt = `${userModel.trigger_word}, ${post.visual_description}`

      const prediction = await replicate.predictions.create({
        version: userModel.replicate_version_id,
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "jpg",
          output_quality: 90,
          lora_scale: userModel.lora_scale || 1,
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
    }

    return NextResponse.json({
      success: true,
      predictions,
      message: "Image generation started for all 9 posts",
    })
  } catch (error) {
    console.error("[v0] Error generating feed images:", error)
    return NextResponse.json({ error: "Failed to generate images" }, { status: 500 })
  }
}
