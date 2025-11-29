import { type NextRequest, NextResponse } from "next/server"
import { getReplicateClient } from "@/lib/replicate-client"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { put } from "@vercel/blob"
import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function GET(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL || "")
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

    // Enforce that provided userId (if any) matches the authenticated user
    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    if (numericUserId !== String(neonUser.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
