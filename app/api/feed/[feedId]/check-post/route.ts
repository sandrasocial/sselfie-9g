import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { put } from "@vercel/blob"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get("predictionId")
    const postId = searchParams.get("postId")

    console.log("[v0] Check-post API called with:", { predictionId, postId })

    if (!predictionId || !postId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const replicate = getReplicateClient()
    const prediction = await replicate.predictions.get(predictionId)

    console.log("[v0] Replicate prediction status:", prediction.status)

    if (prediction.status === "succeeded" && prediction.output) {
      const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

      console.log("[v0] Prediction succeeded, uploading to Blob storage...")

      const imageResponse = await fetch(imageUrl)
      const imageBlob = await imageResponse.blob()

      const blob = await put(`feed-posts/${postId}.png`, imageBlob, {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: true,
      })

      console.log("[v0] Image uploaded to Blob:", blob.url)

      await sql`
        UPDATE feed_posts
        SET 
          image_url = ${blob.url},
          generation_status = 'completed',
          updated_at = NOW()
        WHERE id = ${Number.parseInt(postId)}
      `

      console.log("[v0] Database updated with image URL")

      return NextResponse.json({
        status: "succeeded",
        imageUrl: blob.url,
      })
    } else if (prediction.status === "failed") {
      await sql`
        UPDATE feed_posts
        SET generation_status = 'failed'
        WHERE id = ${Number.parseInt(postId)}
      `

      return NextResponse.json({
        status: "failed",
        error: prediction.error || "Generation failed",
      })
    }

    return NextResponse.json({
      status: prediction.status,
    })
  } catch (error) {
    console.error("[v0] Error checking post generation:", error)
    return NextResponse.json({ error: "Failed to check generation status" }, { status: 500 })
  }
}
