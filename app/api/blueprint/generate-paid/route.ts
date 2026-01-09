import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"

const sql = neon(process.env.DATABASE_URL!)

/**
 * POST /api/blueprint/generate-paid
 * 
 * Generate 30 photos for paid blueprint purchase
 * Body: { accessToken: string }
 * 
 * IMPORTANT: Idempotent - safe to retry
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json()

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      )
    }

    console.log("[v0][paid-blueprint] Generation request for token:", accessToken.substring(0, 8) + "...")

    // Lookup subscriber by access_token
    const subscriber = await sql`
      SELECT 
        id,
        email,
        paid_blueprint_purchased,
        paid_blueprint_generated,
        paid_blueprint_photo_urls,
        strategy_data
      FROM blueprint_subscribers
      WHERE access_token = ${accessToken}
      LIMIT 1
    `

    if (subscriber.length === 0) {
      console.log("[v0][paid-blueprint] Invalid access token")
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 404 },
      )
    }

    const data = subscriber[0]
    const email = data.email

    // Guardrail: Must have purchased
    if (!data.paid_blueprint_purchased) {
      console.log("[v0][paid-blueprint] Not purchased:", email.substring(0, 3) + "***")
      return NextResponse.json(
        { error: "Paid blueprint not purchased. Please purchase first." },
        { status: 403 },
      )
    }

    // Idempotency: If already generated, return existing photos
    if (data.paid_blueprint_generated) {
      const photoUrls = data.paid_blueprint_photo_urls || []
      console.log("[v0][paid-blueprint] Already generated:", email.substring(0, 3) + "***", photoUrls.length, "photos")
      return NextResponse.json({
        success: true,
        alreadyGenerated: true,
        totalPhotos: photoUrls.length,
        photoUrls,
      })
    }

    // Check existing photo count
    const existingPhotoUrls = Array.isArray(data.paid_blueprint_photo_urls) ? data.paid_blueprint_photo_urls : []
    const existingCount = existingPhotoUrls.length

    console.log("[v0][paid-blueprint] Existing photos:", existingCount, "/30")

    // If already have 30+ photos, mark as generated
    if (existingCount >= 30) {
      console.log("[v0][paid-blueprint] Already have 30+ photos, marking as generated")
      await sql`
        UPDATE blueprint_subscribers
        SET paid_blueprint_generated = TRUE,
            paid_blueprint_generated_at = NOW(),
            updated_at = NOW()
        WHERE email = ${email}
        AND paid_blueprint_generated = FALSE
      `
      return NextResponse.json({
        success: true,
        alreadyGenerated: false,
        totalPhotos: existingCount,
        photoUrls: existingPhotoUrls,
      })
    }

    // Get strategy data for prompts
    const strategyData = data.strategy_data
    if (!strategyData || !strategyData.prompt) {
      console.log("[v0][paid-blueprint] Missing strategy_data:", email.substring(0, 3) + "***")
      return NextResponse.json(
        { error: "Blueprint strategy not found. Please complete the free blueprint first." },
        { status: 400 },
      )
    }

    console.log("[v0][paid-blueprint] Starting generation:", email.substring(0, 3) + "***", "Strategy:", strategyData.title)

    // Generate remaining photos until we reach 30
    const targetCount = 30
    const remainingCount = targetCount - existingCount
    const replicate = getReplicateClient()

    let currentPhotoUrls = [...existingPhotoUrls]
    const batchSize = 5 // Generate 5 at a time (safe, tested pattern)
    let generatedInThisSession = 0

    console.log("[v0][paid-blueprint] Need to generate:", remainingCount, "photos in batches of", batchSize)

    // Generate in batches
    for (let i = 0; i < remainingCount; i += batchSize) {
      const photosInBatch = Math.min(batchSize, remainingCount - i)
      console.log("[v0][paid-blueprint] Batch", Math.floor(i / batchSize) + 1, "- generating", photosInBatch, "photos")

      // Generate photos in this batch (parallel predictions)
      const batchPredictions = []
      for (let j = 0; j < photosInBatch; j++) {
        const photoNumber = existingCount + i + j + 1
        // Vary prompts slightly for diversity
        const variedPrompt = varyPrompt(strategyData.prompt, photoNumber)
        
        try {
          const prediction = await replicate.predictions.create({
            model: "black-forest-labs/flux-dev",
            input: {
              prompt: variedPrompt,
              aspect_ratio: "1:1",
              num_outputs: 1,
              guidance: 3.5,
              num_inference_steps: 28,
              output_format: "png",
              output_quality: 100,
            },
          })
          batchPredictions.push({ predictionId: prediction.id, photoNumber })
          console.log("[v0][paid-blueprint] Created prediction", photoNumber, "/30:", prediction.id)
        } catch (error) {
          console.error("[v0][paid-blueprint] Error creating prediction:", error)
          // Continue with other predictions
        }
      }

      // Wait for all predictions in this batch to complete
      const batchUrls = []
      for (const { predictionId, photoNumber } of batchPredictions) {
        try {
          const imageUrl = await waitForPrediction(replicate, predictionId, photoNumber)
          if (imageUrl) {
            batchUrls.push(imageUrl)
            generatedInThisSession++
          }
        } catch (error) {
          console.error("[v0][paid-blueprint] Error waiting for prediction:", predictionId, error)
          // Continue with other predictions
        }
      }

      // Save progress after each batch
      if (batchUrls.length > 0) {
        currentPhotoUrls = [...currentPhotoUrls, ...batchUrls]
        
        await sql`
          UPDATE blueprint_subscribers
          SET paid_blueprint_photo_urls = ${JSON.stringify(currentPhotoUrls)}::jsonb,
              updated_at = NOW()
          WHERE email = ${email}
        `
        
        console.log("[v0][paid-blueprint] Progress saved:", currentPhotoUrls.length, "/30")
      }

      // If we've reached 30, stop
      if (currentPhotoUrls.length >= 30) {
        break
      }
    }

    // Mark as generated when we reach 30
    const finalCount = currentPhotoUrls.length
    if (finalCount >= 30) {
      await sql`
        UPDATE blueprint_subscribers
        SET paid_blueprint_generated = TRUE,
            paid_blueprint_generated_at = NOW(),
            updated_at = NOW()
        WHERE email = ${email}
      `
      console.log("[v0][paid-blueprint] ✅ Generation complete:", email.substring(0, 3) + "***", finalCount, "photos")
      
      return NextResponse.json({
        success: true,
        alreadyGenerated: false,
        totalPhotos: finalCount,
        photoUrls: currentPhotoUrls,
      })
    } else {
      // Partial generation (can retry to continue)
      console.log("[v0][paid-blueprint] Partial generation:", email.substring(0, 3) + "***", finalCount, "/30 photos")
      
      return NextResponse.json({
        success: true,
        partial: true,
        totalPhotos: finalCount,
        photoUrls: currentPhotoUrls,
        message: `Generated ${generatedInThisSession} photos. Total: ${finalCount}/30. You can retry to continue.`,
      })
    }
  } catch (error) {
    console.error("[v0][paid-blueprint] Error generating photos:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate photos" },
      { status: 500 },
    )
  }
}

/**
 * Vary the prompt slightly for each photo to create diversity
 */
function varyPrompt(basePrompt: string, photoNumber: number): string {
  const variations = [
    "close-up portrait",
    "medium shot",
    "full body shot",
    "side profile",
    "looking away",
    "laughing naturally",
    "serious expression",
    "environmental portrait",
    "detail shot",
    "candid moment",
  ]
  
  // Cycle through variations
  const variation = variations[photoNumber % variations.length]
  
  // Add variation hint to the end of the prompt
  return `${basePrompt}, ${variation}, maintaining consistent subject and setting`
}

/**
 * Wait for a Replicate prediction to complete and return the image URL
 */
async function waitForPrediction(replicate: any, predictionId: string, photoNumber: number): Promise<string | null> {
  const maxAttempts = 60 // 5 minutes max (5 seconds per attempt)
  const delayMs = 5000 // 5 seconds between polls

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const prediction = await replicate.predictions.get(predictionId)
      
      if (prediction.status === "succeeded" && prediction.output) {
        const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
        console.log("[v0][paid-blueprint] Photo", photoNumber, "completed:", prediction.id)
        return imageUrl
      } else if (prediction.status === "failed") {
        console.error("[v0][paid-blueprint] Photo", photoNumber, "failed:", prediction.error || "Unknown error")
        return null
      }

      // Still processing, wait and retry
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    } catch (error) {
      console.error("[v0][paid-blueprint] Error polling prediction:", predictionId, error)
      return null
    }
  }

  console.error("[v0][paid-blueprint] Photo", photoNumber, "timed out after", maxAttempts, "attempts")
  return null
}
