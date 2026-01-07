import { type NextRequest, NextResponse } from "next/server"
import { getReplicateClient } from "@/lib/replicate-client"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { put } from "@vercel/blob"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get("id")
    const heroPrompt = searchParams.get("heroPrompt")
    const userId = searchParams.get("userId") // Get user_id from query params
    const conceptDescription = searchParams.get("conceptDescription") // Add conceptDescription from query params

    if (!predictionId) {
      return NextResponse.json({ error: "Missing prediction ID" }, { status: 400 })
    }

    console.log("[v0] 📊 Checking photoshoot prediction:", predictionId)

    let numericUserId = userId

    // Fallback: Look up user_id if not provided (backward compatibility)
    if (!numericUserId) {
      console.log("[v0] ⚠️ No userId provided, looking up from database...")
      const [dbUser] = await sql`
        SELECT id FROM users 
        WHERE supabase_user_id = ${user.id}
      `

      if (!dbUser || !dbUser.id) {
        console.error("[v0] ❌ User not found in database")
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      numericUserId = String(dbUser.id)
    }

    console.log("[v0] ✅ Using user_id:", numericUserId)

    const replicate = getReplicateClient()
    const prediction = await replicate.predictions.get(predictionId)

    console.log("[v0] 📊 Prediction status:", prediction.status)

    if (prediction.status === "succeeded" && prediction.output) {
      const temporaryImageUrls = Array.isArray(prediction.output) ? prediction.output : [prediction.output]

      console.log("[v0] ✅ Prediction succeeded with", temporaryImageUrls.length, "images")
      console.log("[v0] 📦 Migrating images from temporary Replicate URLs to permanent Blob storage...")

      const permanentUrls: string[] = []
      const photoshootPoses = prediction.input?.poses || []
      const fluxPrompts = prediction.input?.fluxPrompts || []

      for (let i = 0; i < temporaryImageUrls.length; i++) {
        const tempUrl = temporaryImageUrls[i]

        try {
          console.log(`[v0] 📥 Downloading image ${i + 1}/${temporaryImageUrls.length}`)

          const imageResponse = await fetch(tempUrl)
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.statusText}`)
          }
          const imageBlob = await imageResponse.blob()

          console.log(`[v0] ⬆️ Uploading to Blob storage (${Math.round(imageBlob.size / 1024)}KB)`)

          // Validate blob before uploading (prevent black/corrupted images)
          if (imageBlob.size === 0) {
            throw new Error(`Image ${i + 1} blob is empty (0 bytes) - Replicate image may not be ready yet`)
          }

          const MIN_IMAGE_SIZE = 1024 // 1KB minimum
          if (imageBlob.size < MIN_IMAGE_SIZE) {
            console.warn(`[v0] ⚠️ Image ${i + 1} blob is very small:`, imageBlob.size, "bytes - may be corrupted")
          }

          const blob = await put(`photoshoots/${predictionId}-${i}.png`, imageBlob, {
            access: "public",
            contentType: "image/png",
            addRandomSuffix: true,
          })

          console.log(`[v0] ✅ Permanent URL ${i + 1}:`, blob.url.substring(0, 60) + "...")
          permanentUrls.push(blob.url)

          try {
            console.log(`[v0] 💾 Saving image ${i + 1} to ai_images gallery...`)

            // Check if already exists by URL only
            const [existing] = await sql`
              SELECT id FROM ai_images 
              WHERE image_url = ${blob.url}
            `

            if (existing) {
              console.log(`[v0] ⏭️ Image ${i + 1} already in gallery (ID: ${existing.id})`)
            } else {
              console.log(`[v0]   → user_id: "${numericUserId}"`)
              console.log(`[v0]   → image_url: ${blob.url.substring(0, 60)}...`)
              console.log(`[v0]   → category: photoshoot`)

              const displayCaption =
                conceptDescription || photoshootPoses[i]?.caption || photoshootPoses[i]?.title || "Lifestyle photoshoot"

              console.log(`[v0]   → caption: ${displayCaption}`)

              const result = await sql`
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
                  ${numericUserId},
                  ${blob.url},
                  ${displayCaption},
                  ${fluxPrompts[i]},
                  ${predictionId},
                  'completed',
                  'carousel',
                  'photoshoot',
                  NOW()
                )
                RETURNING id
              `
              console.log(`[v0] ✅ Saved to gallery with ID: ${result[0]?.id}`)
            }
          } catch (galleryError: any) {
            console.error(`[v0] ❌ Gallery save failed for image ${i + 1}:`, galleryError?.message)
            console.error(`[v0] ❌ Error code:`, galleryError?.code)
            console.error(`[v0] ❌ Constraint:`, galleryError?.constraint)
          }
        } catch (uploadError) {
          console.error(`[v0] ❌ Failed to migrate image ${i + 1}:`, uploadError)
          permanentUrls.push(tempUrl) // Fallback to temporary URL
        }
      }

      console.log(`[v0] 🎉 Migration complete: ${permanentUrls.length}/${temporaryImageUrls.length} images`)

      // CRITICAL: Update generated_images record with final image URLs
      // Find the photoshoot record that contains this prediction
      try {
        console.log(`[v0] 🔍 Finding photoshoot record for prediction ${predictionId}...`)
        
        const photoshootRecords = await sql`
          SELECT id, image_urls, user_id
          FROM generated_images
          WHERE user_id = ${numericUserId}
            AND image_urls::text LIKE ${`%${predictionId}%`}
            AND image_urls::text LIKE '%photoshoot_single_predictions%'
          ORDER BY created_at DESC
          LIMIT 1
        `

        if (photoshootRecords.length > 0) {
          const record = photoshootRecords[0]
          const imageUrlsData = typeof record.image_urls === 'string' 
            ? JSON.parse(record.image_urls) 
            : record.image_urls

          console.log(`[v0] ✅ Found photoshoot record ID: ${record.id}`)

          // Update the predictions array with final URLs
          if (imageUrlsData.predictions && Array.isArray(imageUrlsData.predictions)) {
            const updatedPredictions = imageUrlsData.predictions.map((pred: any) => {
              if (pred.predictionId === predictionId) {
                return {
                  ...pred,
                  imageUrls: permanentUrls,
                  status: "completed",
                  completedAt: new Date().toISOString(),
                }
              }
              return pred
            })

            // Check if all predictions are complete
            const allComplete = updatedPredictions.every((p: any) => p.status === "completed")
            
            // Collect all final image URLs from completed predictions
            const allImageUrls: string[] = []
            updatedPredictions.forEach((pred: any) => {
              if (pred.imageUrls && Array.isArray(pred.imageUrls)) {
                allImageUrls.push(...pred.imageUrls)
              }
            })

            const updatedImageUrls = {
              ...imageUrlsData,
              predictions: updatedPredictions,
              status: allComplete ? "completed" : "processing",
              finalImageUrls: allImageUrls.length > 0 ? allImageUrls : undefined,
              completedCount: updatedPredictions.filter((p: any) => p.status === "completed").length,
              totalCount: updatedPredictions.length,
            }

            // Update the record
            await sql`
              UPDATE generated_images
              SET 
                image_urls = ${JSON.stringify(updatedImageUrls)}::jsonb,
                updated_at = NOW()
              WHERE id = ${record.id}
            `

            console.log(`[v0] ✅ Updated photoshoot record ${record.id}: ${updatedImageUrls.completedCount}/${updatedImageUrls.totalCount} images complete`)
            
            if (allComplete) {
              console.log(`[v0] 🎉 Photoshoot ${record.id} fully complete with ${allImageUrls.length} images!`)
            }
          }
        } else {
          console.log(`[v0] ⚠️ No photoshoot record found for prediction ${predictionId} - images saved to gallery only`)
        }
      } catch (updateError: any) {
        console.error(`[v0] ❌ Failed to update photoshoot record:`, updateError?.message)
        // Don't fail the request - images are still saved to gallery
      }

      return NextResponse.json({
        status: "succeeded",
        output: permanentUrls,
      })
    } else if (prediction.status === "failed") {
      console.log("[v0] ❌ Prediction failed:", prediction.error)
      return NextResponse.json({
        status: "failed",
        error: prediction.error || "Generation failed",
      })
    }

    return NextResponse.json({
      status: prediction.status,
    })
  } catch (error) {
    console.error("[v0] ❌ Error checking photoshoot prediction:", error)
    return NextResponse.json({ error: "Failed to check prediction status" }, { status: 500 })
  }
}
