import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@supabase/ssr"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { getReplicateClient } from "@/lib/replicate-client"
import { put } from "@vercel/blob"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    
    // Authenticate user
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUserId = await getUserIdFromSupabase(user.id)

    const { sceneId } = await req.json()

    if (!sceneId) {
      return NextResponse.json({ error: "Scene ID is required" }, { status: 400 })
    }

    // Get scene from database
    const [scene] = await sql`
      SELECT * FROM scene_composer_scenes
      WHERE id = ${sceneId} AND user_id = ${neonUserId}
    `

    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 })
    }

    // If already completed/failed, return cached result
    if (scene.generation_status === "completed") {
      return NextResponse.json({
        success: true,
        status: "completed",
        imageUrls: scene.generated_image_urls || [],
      })
    }

    if (scene.generation_status === "failed") {
      return NextResponse.json({
        success: false,
        status: "failed",
        errorMessage: scene.error_message,
      })
    }

    // Check Replicate status
    const replicate = getReplicateClient()
    
    let prediction
    try {
      prediction = await replicate.predictions.get(scene.prediction_id)
    } catch (error) {
      console.error("[SCENE-COMPOSER] Error fetching prediction:", error)
      return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
    }

    console.log("[SCENE-COMPOSER] Prediction status:", {
      sceneId,
      predictionId: prediction.id,
      status: prediction.status,
    })

    // Update based on status
    if (prediction.status === "succeeded") {
      // Get generated image URLs
      let imageUrls: string[] = []
      
      if (prediction.output) {
        if (Array.isArray(prediction.output)) {
          imageUrls = prediction.output.filter((url: any) => url && typeof url === "string")
        } else if (typeof prediction.output === "string") {
          imageUrls = [prediction.output]
        }
      }
      
      if (imageUrls.length === 0) {
        console.error("[SCENE-COMPOSER] No image URLs in prediction output:", prediction.output)
        throw new Error("Generation completed but no images were returned")
      }

      // Download and re-upload to Vercel Blob (for permanence)
      const permanentUrls: string[] = []
      
      for (const url of imageUrls) {
        try {
          const response = await fetch(url)
          const blob = await response.blob()
          
          const uploaded = await put(
            `scene-composer/${neonUserId}/${sceneId}-${Date.now()}.png`,
            blob,
            {
              access: "public",
              contentType: "image/png",
              addRandomSuffix: true,
            }
          )
          
          permanentUrls.push(uploaded.url)
        } catch (uploadError) {
          console.error("[SCENE-COMPOSER] Error uploading to blob:", uploadError)
          // Fallback to original URL
          permanentUrls.push(url)
        }
      }

      // Update database
      await sql`
        UPDATE scene_composer_scenes
        SET 
          generation_status = 'completed',
          generated_image_urls = ${permanentUrls},
          completed_at = NOW()
        WHERE id = ${sceneId}
      `

      // IMPORTANT: Also save to ai_images gallery (like concept cards do)
      try {
        for (let i = 0; i < permanentUrls.length; i++) {
          const imageUrl = permanentUrls[i]
          // Check if already exists using both prediction_id and image_url to avoid duplicates
          const [existing] = await sql`
            SELECT id FROM ai_images 
            WHERE prediction_id = ${scene.prediction_id}
            AND image_url = ${imageUrl}
            LIMIT 1
          `

          if (!existing) {
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
                ${neonUserId},
                ${imageUrl},
                ${scene.scene_description},
                ${scene.maya_technical_prompt},
                ${scene.prediction_id},
                'completed',
                'scene_composer',
                'brand_scene',
                NOW()
              )
            `
            console.log("[SCENE-COMPOSER] Image saved to gallery:", i + 1)
          } else {
            console.log("[SCENE-COMPOSER] Image already exists in gallery, skipping")
          }
        }
      } catch (galleryError) {
        console.error("[SCENE-COMPOSER] Failed to save to gallery:", galleryError)
        // Non-fatal, continue - scene is still marked as completed
      }

      return NextResponse.json({
        success: true,
        status: "completed",
        imageUrls: permanentUrls,
      })
    } else if (prediction.status === "failed" || prediction.status === "canceled") {
      const errorMessage = prediction.error || "Generation failed"

      await sql`
        UPDATE scene_composer_scenes
        SET 
          generation_status = 'failed',
          error_message = ${errorMessage},
          completed_at = NOW()
        WHERE id = ${sceneId}
      `

      return NextResponse.json({
        success: false,
        status: "failed",
        errorMessage,
      })
    }

    // Still processing
    return NextResponse.json({
      success: true,
      status: "processing",
    })
  } catch (error) {
    console.error("[SCENE-COMPOSER] Error checking status:", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
