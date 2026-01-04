import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    console.log("[v0] Recent work API called")

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      console.log("[v0] Recent work: Not authenticated")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Recent work: Auth user ID:", authUser.id)

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      console.log("[v0] Recent work: Neon user not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Recent work: Neon user ID:", neonUser.id)

    const sql = neon(process.env.DATABASE_URL!)

    // Get recent generated images (last 6)
    const recentImages = await sql`
      SELECT 
        id,
        selected_url,
        category,
        subcategory,
        created_at,
        saved
      FROM generated_images 
      WHERE user_id = ${neonUser.id}
      AND selected_url IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 6
    `

    console.log("[v0] Recent work: Found", recentImages.length, "images")

    const response = {
      images: recentImages,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Error fetching recent work:", error)
    return NextResponse.json({ error: "Failed to fetch recent work" }, { status: 500 })
  }
}
