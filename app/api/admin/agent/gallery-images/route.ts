import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"

// Get gallery images for content calendar
export async function GET(request: NextRequest) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser || authUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const sql = neon(process.env.DATABASE_URL!)
    
    // Get admin user ID from email
    const adminUserResult = await sql`
      SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1
    `
    
    if (!adminUserResult || adminUserResult.length === 0) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    const adminUserId = adminUserResult[0].id
    console.log("[v0] Admin user ID:", adminUserId)

    // Fetch admin user's generated images
    let query = `
      SELECT * FROM generated_images 
      WHERE user_id = $1
    `
    const queryParams: any[] = [adminUserId]

    if (category && category !== "all") {
      query += ` AND content_category = $2`
      queryParams.push(category)
    }

    query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1}`
    queryParams.push(limit)

    const images = await sql(query, queryParams)

    console.log("[v0] Fetched admin images count:", images.length)

    return NextResponse.json({ images })
  } catch (error) {
    console.error("[v0] Gallery images fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch gallery images" }, { status: 500 })
  }
}

// Update image metadata for better categorization
export async function PATCH(request: NextRequest) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser || authUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { imageId, category, tags } = await request.json()

    const { error } = await supabase
      .from("generated_images")
      .update({
        content_category: category,
        content_tags: tags,
      })
      .eq("id", imageId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Image metadata update error:", error)
    return NextResponse.json({ error: "Failed to update image metadata" }, { status: 500 })
  }
}
