import { type NextRequest, NextResponse } from "next/server"
import { getReplicateClient } from "@/lib/replicate-client"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { put } from "@vercel/blob"

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get("id")

    if (!predictionId) {
      return NextResponse.json({ error: "Missing prediction ID" }, { status: 400 })
    }

    console.log("[v0] 📊 Checking photoshoot prediction:", predictionId)

    const replicate = getReplicateClient()
    const prediction = await replicate.predictions.get(predictionId)

    console.log("[v0] 📊 Prediction status:", prediction.status)

    if (prediction.status === "succeeded" && prediction.output) {
      const temporaryImageUrls = Array.isArray(prediction.output) ? prediction.output : [prediction.output]
      
      console.log("[v0] ✅ Prediction succeeded with", temporaryImageUrls.length, "images")
      
      console.log("[v0] 📦 Migrating images from temporary Replicate URLs to permanent Blob storage...")
      
      const permanentUrls: string[] = []
      
      for (let i = 0; i < temporaryImageUrls.length; i++) {
        const tempUrl = temporaryImageUrls[i]
        
        try {
          console.log(`[v0] 📥 Downloading image ${i + 1}/${temporaryImageUrls.length}:`, tempUrl.substring(0, 80))
          
          // Download image from Replicate's temporary URL
          const imageResponse = await fetch(tempUrl)
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.statusText}`)
          }
          const imageBlob = await imageResponse.blob()
          
          console.log(`[v0] ⬆️ Uploading to Blob storage (${imageBlob.size} bytes)...`)
          
          // Upload to Vercel Blob for permanent storage
          const blob = await put(`photoshoots/${predictionId}-${i}.png`, imageBlob, {
            access: "public",
            contentType: "image/png",
            addRandomSuffix: true,
          })
          
          console.log(`[v0] ✅ Permanent URL ${i + 1}:`, blob.url)
          permanentUrls.push(blob.url)
        } catch (uploadError) {
          console.error(`[v0] ❌ Failed to migrate image ${i + 1}:`, uploadError)
          // Fallback to temporary URL if migration fails
          console.warn(`[v0] ⚠️ Using temporary URL as fallback (will expire in 1 hour)`)
          permanentUrls.push(tempUrl)
        }
      }
      
      console.log(`[v0] 🎉 Successfully migrated ${permanentUrls.length}/${temporaryImageUrls.length} images to permanent storage`)

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
    console.error("[v0] Error checking photoshoot prediction:", error)
    return NextResponse.json({ error: "Failed to check prediction status" }, { status: 500 })
  }
}
