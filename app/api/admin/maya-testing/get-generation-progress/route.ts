import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    // Verify admin access
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const testResultId = searchParams.get("test_result_id")

    if (!testResultId) {
      return NextResponse.json({ error: "test_result_id is required" }, { status: 400 })
    }

    // Get test images for this test result
    const testImages = await sql`
      SELECT 
        id,
        replicate_prediction_id,
        prompt,
        image_url,
        created_at
      FROM maya_test_images
      WHERE test_result_id = ${parseInt(testResultId)}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (testImages.length === 0) {
      return NextResponse.json({ error: "Test image not found" }, { status: 404 })
    }

    const testImage = testImages[0]

    // If generation is still running, check Replicate status
    if (!testImage.image_url && testImage.replicate_prediction_id) {
      try {
        const replicate = getReplicateClient()
        const prediction = await replicate.predictions.get(testImage.replicate_prediction_id)

        // If completed, update the image URL
        if (prediction.status === "succeeded" && prediction.output) {
          const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

          await sql`
            UPDATE maya_test_images
            SET image_url = ${imageUrl}
            WHERE id = ${testImage.id}
          `

          // Update test result status
          await sql`
            UPDATE maya_test_results
            SET 
              status = 'completed',
              results = ${JSON.stringify({
                prediction_id: prediction.id,
                status: prediction.status,
                image_url: imageUrl,
                completed_at: new Date().toISOString(),
              })}
            WHERE id = ${parseInt(testResultId)}
          `

          return NextResponse.json({
            success: true,
            status: "completed",
            image_url: imageUrl,
            prediction_status: prediction.status,
          })
        } else if (prediction.status === "failed" || prediction.status === "canceled") {
          await sql`
            UPDATE maya_test_results
            SET 
              status = 'failed',
              results = ${JSON.stringify({
                prediction_id: prediction.id,
                status: prediction.status,
                error: prediction.error || "Generation failed",
              })}
            WHERE id = ${parseInt(testResultId)}
          `

          return NextResponse.json({
            success: true,
            status: "failed",
            prediction_status: prediction.status,
            error: prediction.error || "Generation failed",
          })
        } else {
          // Still processing
          return NextResponse.json({
            success: true,
            status: "running",
            prediction_status: prediction.status,
            progress: prediction.logs ? "Generating..." : "Starting...",
          })
        }
      } catch (error: any) {
        console.error("[v0] Error checking Replicate prediction:", error)
        return NextResponse.json({
          success: true,
          status: "running",
          error: error.message,
        })
      }
    }

    // Already completed
    return NextResponse.json({
      success: true,
      status: "completed",
      image_url: testImage.image_url,
    })
  } catch (error: any) {
    console.error("[v0] Error getting generation progress:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get generation progress" },
      { status: 500 }
    )
  }
}





























