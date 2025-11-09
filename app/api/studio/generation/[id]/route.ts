import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getReplicateClient } from "@/lib/replicate-client"
import { put } from "@vercel/blob"

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

      if (prediction.status === "succeeded" && prediction.output) {
        const imageUrls = Array.isArray(prediction.output) ? prediction.output : [prediction.output]
        const uploadedUrls: string[] = []

        // Upload each image to Blob storage
        for (const imageUrl of imageUrls) {
          try {
            const imageResponse = await fetch(imageUrl)
            const imageBlob = await imageResponse.blob()

            const blob = await put(`studio/${generationId}-${uploadedUrls.length}.png`, imageBlob, {
              access: "public",
              contentType: "image/png",
              addRandomSuffix: true,
            })

            uploadedUrls.push(blob.url)
          } catch (uploadError) {
            console.error("[v0] Failed to upload image to Blob:", uploadError)
            // Fall back to original URL if upload fails
            uploadedUrls.push(imageUrl)
          }
        }

        // Update generated_images table with uploaded URLs
        await sql`
          UPDATE generated_images
          SET 
            image_urls = ${uploadedUrls.join(",")},
            selected_url = ${uploadedUrls[0]}
          WHERE id = ${generationId}
        `

        try {
          for (const imageUrl of uploadedUrls) {
            // Check if image already exists by URL
            const [existing] = await sql`
              SELECT id FROM ai_images WHERE image_url = ${imageUrl}
            `

            if (!existing) {
              await sql`
                INSERT INTO ai_images (
                  user_id,
                  image_url,
                  prompt,
                  prediction_id,
                  generation_status,
                  source,
                  category,
                  created_at
                ) VALUES (
                  ${neonUser.id},
                  ${imageUrl},
                  ${generation.prompt || ""},
                  ${predictionId},
                  'completed',
                  'studio',
                  ${generation.category || "custom"},
                  NOW()
                )
              `
            }
          }
        } catch (galleryError) {
          console.error("[v0] Failed to save to gallery:", galleryError)
          // Don't fail the request if gallery save fails
        }

        return NextResponse.json({
          status: "succeeded",
          imageUrls: uploadedUrls,
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
