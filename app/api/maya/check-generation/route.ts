import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { put } from "@vercel/blob"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const sql = neon(process.env.DATABASE_URL || "")

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get("predictionId")
    const generationId = searchParams.get("generationId")

    if (!predictionId || !generationId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const replicate = getReplicateClient()

    const prediction = await replicate.predictions.get(predictionId)

    console.log("[v0] Prediction status:", prediction.status)

    if (prediction.status === "succeeded" && prediction.output) {
      const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

      const imageResponse = await fetch(imageUrl)
      const imageBlob = await imageResponse.blob()

      const blob = await put(`maya-generations/${generationId}.png`, imageBlob, {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: true,
      })

      await sql`
        UPDATE generated_images
        SET 
          image_urls = ${blob.url},
          selected_url = ${blob.url},
          saved = false
        WHERE id = ${Number.parseInt(generationId)}
      `

      try {
        const [generation] = await sql`
          SELECT user_id, prompt, description, category, subcategory
          FROM generated_images 
          WHERE id = ${Number.parseInt(generationId)}
        `

        if (generation) {
          // Check if this image already exists in the gallery by prediction_id
          const [existing] = await sql`
            SELECT id FROM ai_images WHERE prediction_id = ${predictionId}
          `

          if (!existing) {
            // Only insert if it doesn't already exist
            await sql`
              INSERT INTO ai_images (
                user_id,
                image_url,
                prompt,
                generated_prompt,
                prediction_id,
                generation_status,
                source,
                category,
                created_at
              ) VALUES (
                ${generation.user_id},
                ${blob.url},
                ${generation.description || generation.subcategory || ""},
                ${generation.prompt || ""},
                ${predictionId},
                'completed',
                'maya_chat',
                ${generation.category || "concept"},
                NOW()
              )
            `
            console.log("[v0] Maya image saved to ai_images gallery")
          } else {
            console.log("[v0] Maya image already exists in gallery, skipping duplicate save")
          }
        }
      } catch (galleryError: any) {
        console.error("[v0] Failed to save to ai_images gallery:", galleryError?.message || String(galleryError))
        // Don't fail the request if gallery save fails - the main generation is still successful
      }

      return NextResponse.json({
        status: "succeeded",
        imageUrl: blob.url,
      })
    } else if (prediction.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: prediction.error || "Generation failed",
      })
    }

    return NextResponse.json({
      status: prediction.status,
    })
  } catch (error) {
    console.error("[v0] Error checking generation:", error)
    return NextResponse.json({ error: "Failed to check generation status" }, { status: 500 })
  }
}
