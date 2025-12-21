import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { checkNanoBananaPrediction } from "@/lib/nano-banana-client"
import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Pro Mode Check Generation Status API Route
 * 
 * Polls Nano Banana Pro prediction status and handles completion.
 */
export async function GET(req: NextRequest) {
  console.log("[v0] [PRO MODE] Check generation status API called")

  try {
    // Authenticate user
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      console.error("[v0] [PRO MODE] Authentication failed:", authError?.message || "No user")
      return NextResponse.json({ error: authError?.message || "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const predictionId = searchParams.get("predictionId")

    if (!predictionId) {
      console.error("[v0] [PRO MODE] ❌ Missing predictionId parameter")
      return NextResponse.json({ error: "predictionId is required" }, { status: 400 })
    }

    console.log("[v0] [PRO MODE] 🔍 Checking prediction status:", predictionId)

    // FIRST: Check database for already completed generation (prevents unnecessary Replicate API calls)
    const [existingGeneration] = await sql`
      SELECT id, image_url, generation_status
      FROM ai_images
      WHERE prediction_id = ${predictionId}
      AND generation_status = 'completed'
      AND image_url IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existingGeneration && existingGeneration.image_url) {
      console.log("[v0] [PRO MODE] ✅ Found completed generation in database, returning cached result:", {
        id: existingGeneration.id,
        imageUrl: existingGeneration.image_url.substring(0, 100)
      })
      return NextResponse.json({
        status: "succeeded",
        imageUrl: existingGeneration.image_url,
      })
    }

    console.log("[v0] [PRO MODE] No completed generation in database, checking Replicate...")

    // Check prediction status with Replicate
    const status = await checkNanoBananaPrediction(predictionId)

    console.log("[v0] [PRO MODE] 📊 Prediction status:", {
      status: status.status,
      hasOutput: !!status.output,
      outputType: Array.isArray(status.output) ? 'array' : typeof status.output,
      error: status.error || null,
    })

    // If generation completed, download and save image (matches Classic Mode logic)
    if (status.status === "succeeded" && status.output) {
      console.log("[v0] [PRO MODE] ✅ Generation succeeded! Processing image...")
      try {
        // Get the image URL from Replicate output (status.output is already a string from checkNanoBananaPrediction)
        const imageUrl = status.output
        console.log("[v0] [PRO MODE] 📥 Downloading image from:", imageUrl.substring(0, 100))

        // Download image and upload to Vercel Blob (matches Classic Mode)
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
          console.error("[v0] [PRO MODE] ❌ Failed to download image:", imageResponse.status, imageResponse.statusText)
          throw new Error(`Failed to download image: ${imageResponse.statusText}`)
        }
        console.log("[v0] [PRO MODE] ✅ Image downloaded, uploading to Blob...")
        const imageBlob = await imageResponse.blob()

        const blob = await put(
          `maya-pro-generations/${predictionId}.png`,
          imageBlob,
          {
            access: "public",
            contentType: "image/png",
            addRandomSuffix: true,
          }
        )

        console.log("[v0] [PRO MODE] ✅ Image uploaded to Blob:", blob.url)

        // Find the generation record by prediction_id and update it (matches Classic Mode pattern)
        const [generation] = await sql`
          SELECT id, user_id, prompt, generated_prompt, category
          FROM ai_images
          WHERE prediction_id = ${predictionId}
          ORDER BY created_at DESC
          LIMIT 1
        `

        if (generation) {
          // Update the existing record with the final image URL (matches Classic Mode)
          const updateResult = await sql`
            UPDATE ai_images
            SET image_url = ${blob.url}, generation_status = 'completed'
            WHERE id = ${generation.id}
            RETURNING id, image_url, generation_status
          `
          console.log("[v0] [PRO MODE] Updated generation record:", {
            id: generation.id,
            imageUrl: blob.url.substring(0, 100),
            updateResult: updateResult[0] ? 'success' : 'failed'
          })

          // Verify the update worked
          const [verify] = await sql`
            SELECT image_url, generation_status 
            FROM ai_images 
            WHERE id = ${generation.id}
          `
          if (verify && verify.image_url === blob.url) {
            console.log("[v0] [PRO MODE] ✅ Image URL verified in database")
          } else {
            console.error("[v0] [PRO MODE] ❌ Image URL verification failed:", {
              expected: blob.url.substring(0, 100),
              actual: verify?.image_url?.substring(0, 100) || 'null'
            })
          }
        } else {
          console.warn("[v0] [PRO MODE] No generation record found for predictionId:", predictionId)
          // If no record exists, create one (fallback - should not happen)
          try {
            const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
            const neonUser = await getEffectiveNeonUser(authUser.id)
            if (neonUser) {
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
                  ${neonUser.id},
                  ${blob.url},
                  'Pro Mode generation',
                  '',
                  ${predictionId},
                  'completed',
                  'maya_pro',
                  'concept',
                  NOW()
                )
              `
              console.log("[v0] [PRO MODE] Created fallback gallery record")
            }
          } catch (fallbackError: any) {
            console.error("[v0] [PRO MODE] Error creating fallback record:", fallbackError)
          }
        }

        // Return the blob URL (matches Classic Mode - always return blob.url, not raw output)
        const response = {
          status: "succeeded",
          imageUrl: blob.url, // Always return the Blob URL, not the raw Replicate URL
        }
        console.log("[v0] [PRO MODE] ✅✅✅ Returning success response:", {
          status: "succeeded",
          imageUrl: blob.url.substring(0, 100),
          imageUrlLength: blob.url.length,
        })
        return NextResponse.json(response)
      } catch (error: any) {
        console.error("[v0] [PRO MODE] Error processing completed image:", error)
        // If blob upload fails, still return the output URL as fallback
        const imageUrl = Array.isArray(status.output) ? status.output[0] : status.output
        return NextResponse.json({
          status: "succeeded",
          imageUrl: imageUrl, // Fallback to raw URL if blob upload fails
        })
      }
    }

    // If generation failed
    if (status.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: status.error || "Generation failed",
      })
    }

    // Still processing
    console.log("[v0] [PRO MODE] ⏳ Still processing, status:", status.status)
    return NextResponse.json({
      status: status.status,
    })
  } catch (error: any) {
    console.error("[v0] [PRO MODE] Check generation status error:", error)
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    )
  }
}
