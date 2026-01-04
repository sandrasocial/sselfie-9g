import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { checkNanoBananaPrediction } from "@/lib/nano-banana-client"
import { put } from "@vercel/blob"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    // AUTHENTICATION (use helper for consistent cookie handling)
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUserId = await getUserIdFromSupabase(user.id)
    if (!neonUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // GET prediction ID from query
    const { searchParams } = new URL(req.url)
    const predictionId = searchParams.get("predictionId")

    if (!predictionId) {
      return NextResponse.json({ error: "Prediction ID required" }, { status: 400 })
    }

    // CHECK prediction status
    const status = await checkNanoBananaPrediction(predictionId)

    // Handle array output (Nano Banana can return array of URLs)
    let finalOutput = status.output
    if (Array.isArray(finalOutput)) {
      finalOutput = finalOutput[0] // Take first image if array
    }

    // UPDATE database if completed
    if (status.status === "succeeded" && finalOutput) {
      // Download and re-upload to Vercel Blob for permanence
      let permanentUrl = status.output
      
      try {
        const response = await fetch(finalOutput)
        if (!response.ok) throw new Error('Failed to fetch image')
        
        const blob = await response.blob()
        
        const uploaded = await put(
          `studio-pro/${neonUserId}/${predictionId}-${Date.now()}.png`,
          blob,
          {
            access: "public",
            contentType: "image/png",
            addRandomSuffix: true,
          }
        )
        
        permanentUrl = uploaded.url
      } catch (uploadError) {
        console.error("[STUDIO-PRO] Error uploading to blob:", uploadError)
        // Fallback to original URL
        permanentUrl = finalOutput
      }

      // Update ai_images table
      await sql`
        UPDATE ai_images
        SET 
          image_url = ${permanentUrl},
          generation_status = 'completed'
        WHERE prediction_id = ${predictionId}
        AND user_id = ${neonUserId}
      `

      console.log("[STUDIO-PRO] Generation completed:", predictionId)
    } else if (status.status === "failed") {
      // Update status to failed
      await sql`
        UPDATE ai_images
        SET 
          generation_status = 'failed'
        WHERE prediction_id = ${predictionId}
        AND user_id = ${neonUserId}
      `
    }

    return NextResponse.json({
      ...status,
      output: finalOutput || status.output,
    })

  } catch (error) {
    console.error("[STUDIO-PRO] Status check error:", error)
    return NextResponse.json(
      { 
        error: "Failed to check status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
