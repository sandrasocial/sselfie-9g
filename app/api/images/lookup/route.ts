import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUserId = await getUserIdFromSupabase(user.id)
    if (!neonUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const imageUrl = searchParams.get("url")
    const predictionId = searchParams.get("predictionId")

    if (!imageUrl && !predictionId) {
      return NextResponse.json({ error: "URL or predictionId required" }, { status: 400 })
    }

    // Look up image by URL or prediction ID
    let image: any = null
    
    if (predictionId) {
      const result = await sql`
        SELECT 
          id,
          image_url,
          prompt,
          is_favorite,
          category
        FROM ai_images
        WHERE prediction_id = ${predictionId}
        AND user_id = ${neonUserId}
        LIMIT 1
      `
      image = result[0] || null
    } else if (imageUrl) {
      const result = await sql`
        SELECT 
          id,
          image_url,
          prompt,
          is_favorite,
          category
        FROM ai_images
        WHERE image_url = ${imageUrl}
        AND user_id = ${neonUserId}
        LIMIT 1
      `
      image = result[0] || null
    }

    if (!image) {
      return NextResponse.json({ image: null })
    }

    return NextResponse.json({
      image: {
        id: `ai_${image.id}`,
        imageUrl: image.image_url,
        prompt: image.prompt || "",
        isFavorite: image.is_favorite || false,
        category: image.category,
      }
    })
  } catch (error) {
    console.error("[IMAGES/LOOKUP] Error:", error)
    return NextResponse.json(
      { error: "Failed to lookup image" },
      { status: 500 }
    )
  }
}

