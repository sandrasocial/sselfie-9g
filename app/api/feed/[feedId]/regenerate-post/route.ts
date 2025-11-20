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

    // Get post data
    const [post] = await sql`
      SELECT prompt, user_id FROM feed_posts WHERE id = ${postId}
    `

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Get user's trained model
    const [model] = await sql`
      SELECT replicate_model_url, trigger_word 
      FROM trained_models 
      WHERE user_id = ${neonUser.id} 
      AND status = 'ready' 
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (!model) {
      return NextResponse.json({ error: "No trained model found" }, { status: 400 })
    }

    // Create Replicate prediction
    const replicate = getReplicateClient()
    const prediction = await replicate.predictions.create({
      model: model.replicate_model_url,
      input: {
        prompt: post.prompt,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "png",
        output_quality: 100,
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
