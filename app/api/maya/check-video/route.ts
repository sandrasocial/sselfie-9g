import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { put } from "@vercel/blob"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const sql = neon(process.env.DATABASE_URL || "")

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const predictionId = searchParams.get("predictionId")
    const videoId = searchParams.get("videoId")

    if (!predictionId || !videoId) {
      return NextResponse.json({ error: "Missing predictionId or videoId" }, { status: 400 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let prediction
    try {
      const replicate = getReplicateClient()
      prediction = await replicate.predictions.get(predictionId)
    } catch (replicateError) {
      // Handle Replicate API errors (rate limits, network issues, etc.)
      const errorMessage = replicateError instanceof Error ? replicateError.message : String(replicateError)
      
      // Check if it's a rate limit error
      if (errorMessage.includes("Too Many Requests") || errorMessage.includes("429")) {
        console.log("[v0] ⚠️ Replicate rate limit hit, will retry")
        // Return processing status so client will poll again
        return NextResponse.json({
          status: "processing",
          progress: 50,
          message: "Rate limited, retrying...",
        })
      }
      
      // For other errors, log and rethrow
      console.error("[v0] Replicate API error:", errorMessage)
      throw replicateError
    }

    console.log("[v0] ========== VIDEO POLLING CHECK ==========")
    console.log("[v0] Video ID:", videoId)
    console.log("[v0] Prediction ID:", predictionId)
    console.log("[v0] Prediction status:", prediction.status)
    console.log("[v0] ================================================")

    // Update database with current status
    if (prediction.status === "succeeded" && prediction.output) {
      const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

      console.log("[v0] ========== MIGRATING VIDEO TO BLOB STORAGE ==========")
      console.log("[v0] Temporary Replicate URL:", videoUrl)

      // Download video from Replicate's temporary URL
      const videoResponse = await fetch(videoUrl)
      const videoBlob = await videoResponse.blob()

      console.log("[v0] Downloaded video size:", videoBlob.size, "bytes")

      // Upload to Vercel Blob for permanent storage
      const blob = await put(`maya-videos/${videoId}.mp4`, videoBlob, {
        access: "public",
        contentType: "video/mp4",
        addRandomSuffix: true, // Ensures unique filename
      })

      console.log("[v0] ✅ Permanent Blob URL:", blob.url)
      console.log("[v0] ================================================")

      console.log("[v0] ========== UPDATING DATABASE ==========")
      console.log("[v0] Setting status='completed' and video_url for videoId:", videoId)
      
      await sql`
        UPDATE generated_videos
        SET 
          status = 'completed',
          video_url = ${blob.url},
          progress = 100,
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = ${Number.parseInt(videoId)}
        AND user_id = ${neonUser.id}
      `

      const verifyResult = await sql`
        SELECT id, status, video_url, progress
        FROM generated_videos
        WHERE id = ${Number.parseInt(videoId)}
        AND user_id = ${neonUser.id}
      `
      
      console.log("[v0] ✅ Database update complete. Verification:")
      console.log("[v0] Record:", JSON.stringify(verifyResult[0], null, 2))
      console.log("[v0] ================================================")

      return NextResponse.json({
        status: "succeeded",
        videoUrl: blob.url,
        progress: 100,
      })
    } else if (prediction.status === "failed") {
      const errorMessage = prediction.error || "Video generation failed"

      console.log("[v0] ========== VIDEO GENERATION FAILED ==========")
      console.log("[v0] Error:", errorMessage)
      console.log("[v0] ================================================")

      await sql`
        UPDATE generated_videos
        SET 
          status = 'failed',
          error_message = ${errorMessage},
          updated_at = NOW()
        WHERE id = ${Number.parseInt(videoId)}
        AND user_id = ${neonUser.id}
      `

      return NextResponse.json({
        status: "failed",
        error: errorMessage,
      })
    } else {
      // Still processing
      const progress = prediction.status === "starting" ? 10 : prediction.status === "processing" ? 50 : 0

      console.log("[v0] Video still processing. Status:", prediction.status, "Progress:", progress)

      await sql`
        UPDATE generated_videos
        SET 
          progress = ${progress},
          updated_at = NOW()
        WHERE id = ${Number.parseInt(videoId)}
        AND user_id = ${neonUser.id}
      `

      return NextResponse.json({
        status: prediction.status,
        progress,
      })
    }
  } catch (error) {
    console.error("[v0] ========== VIDEO GENERATION ERROR ==========")
    console.error("[v0] ❌ Error:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    console.error("[v0] ================================================")

    return NextResponse.json(
      {
        error: "Failed to check video status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
