import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get best work selections with image data
    const bestWork = await sql`
      SELECT 
        bw.id,
        bw.image_id,
        bw.image_source,
        bw.display_order,
        COALESCE(ai.image_url, gi.selected_url) as image_url,
        COALESCE(ai.category, gi.category) as category,
        COALESCE(ai.created_at, gi.created_at) as created_at
      FROM user_best_work bw
      LEFT JOIN ai_images ai ON 
        bw.image_source = 'ai_images' AND 
        CAST(ai.id AS VARCHAR) = REPLACE(bw.image_id, 'ai_', '')
      LEFT JOIN generated_images gi ON 
        bw.image_source = 'generated_images' AND 
        CAST(gi.id AS VARCHAR) = REPLACE(bw.image_id, 'gen_', '')
      WHERE bw.user_id = ${neonUser.id}
      ORDER BY bw.display_order ASC
      LIMIT 9
    `

    return NextResponse.json({ bestWork })
  } catch (error) {
    console.error("[v0] Error fetching best work:", error)
    return NextResponse.json({ error: "Failed to fetch best work" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log("[v0] Best work POST: Starting")

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      console.log("[v0] Best work POST: Not authenticated")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Best work POST: Auth user ID:", authUser.id)

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      console.log("[v0] Best work POST: Neon user not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Best work POST: User authenticated:", neonUser.id)

    const body = await request.json()
    console.log("[v0] Best work POST: Request body:", JSON.stringify(body))

    const { imageIds } = body

    if (!Array.isArray(imageIds)) {
      console.log("[v0] Best work POST: imageIds is not an array:", typeof imageIds)
      return NextResponse.json({ error: "Invalid image IDs - must be array" }, { status: 400 })
    }

    if (imageIds.length === 0) {
      console.log("[v0] Best work POST: imageIds array is empty")
      return NextResponse.json({ error: "No images selected" }, { status: 400 })
    }

    if (imageIds.length > 9) {
      console.log("[v0] Best work POST: Too many images:", imageIds.length)
      return NextResponse.json({ error: "Maximum 9 images allowed" }, { status: 400 })
    }

    console.log("[v0] Saving best work for user:", neonUser.id, "Images:", imageIds.length)

    // Delete existing best work selections
    console.log("[v0] Deleting existing best work...")
    await sql`
      DELETE FROM user_best_work
      WHERE user_id = ${neonUser.id}
    `
    console.log("[v0] Existing best work deleted")

    // Insert new selections with display order
    console.log("[v0] Inserting new best work selections...")
    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i]
      const imageSource = imageId.startsWith("ai_") ? "ai_images" : "generated_images"

      console.log(`[v0] Inserting image ${i + 1}/${imageIds.length}:`, imageId, imageSource)

      await sql`
        INSERT INTO user_best_work (user_id, image_id, image_source, display_order)
        VALUES (${neonUser.id}, ${imageId}, ${imageSource}, ${i + 1})
        ON CONFLICT (user_id, image_id) 
        DO UPDATE SET display_order = ${i + 1}, updated_at = CURRENT_TIMESTAMP
      `
    }

    console.log("[v0] Best work saved successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving best work - Full error:", error)
    console.error("[v0] Error name:", error instanceof Error ? error.name : "Unknown")
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack")
    return NextResponse.json(
      {
        error: "Failed to save best work",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
