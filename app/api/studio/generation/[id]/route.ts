import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getReplicateClient } from "@/lib/replicate-client"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [neonUser] = await sql`
      SELECT id FROM users WHERE stack_auth_id = ${user.id}
    `

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const generationId = params.id

    // Get generation record
    const [generation] = await sql`
      SELECT id, image_urls, prompt, category, subcategory
      FROM generated_images
      WHERE id = ${generationId} AND user_id = ${neonUser.id}
    `

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 })
    }

    const predictionId = generation.image_urls

    // Check if already completed (has actual URLs)
    if (predictionId && !predictionId.startsWith("https://")) {
      const replicate = getReplicateClient()

      // Get prediction status
      const prediction = await replicate.predictions.get(predictionId)

      console.log("[v0] Prediction status:", prediction.status)

      if (prediction.status === "succeeded" && prediction.output) {
        // Update database with generated image URLs
        const imageUrls = Array.isArray(prediction.output) ? prediction.output.join(",") : prediction.output

        await sql`
          UPDATE generated_images
          SET 
            image_urls = ${imageUrls},
            selected_url = ${Array.isArray(prediction.output) ? prediction.output[0] : prediction.output}
          WHERE id = ${generationId}
        `

        return NextResponse.json({
          status: "succeeded",
          imageUrls: Array.isArray(prediction.output) ? prediction.output : [prediction.output],
        })
      } else if (prediction.status === "failed") {
        return NextResponse.json({
          status: "failed",
          error: prediction.error || "Generation failed",
        })
      }

      return NextResponse.json({
        status: prediction.status,
        progress: prediction.logs ? 50 : 10,
      })
    }

    // Already completed
    return NextResponse.json({
      status: "succeeded",
      imageUrls: generation.image_urls.split(","),
    })
  } catch (error) {
    console.error("[v0] Error checking generation status:", error)
    return NextResponse.json({ error: "Failed to check generation status" }, { status: 500 })
  }
}
