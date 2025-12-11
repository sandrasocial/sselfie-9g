import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { neon } from "@neondatabase/serverless"

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

    const neonUser = await getEffectiveNeonUser(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    const filter = searchParams.get("filter") || "all" // all, favorites, category

    let query
    if (filter === "favorites") {
      query = sql`
        SELECT 
          id,
          COALESCE(selected_url, (string_to_array(image_urls, ','))[1]) as image_url,
          category,
          created_at,
          saved
        FROM generated_images
        WHERE user_id = ${neonUser.id}
          AND saved = true
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    } else {
      query = sql`
        SELECT 
          id,
          COALESCE(selected_url, (string_to_array(image_urls, ','))[1]) as image_url,
          category,
          created_at,
          saved
        FROM generated_images
        WHERE user_id = ${neonUser.id}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    }

    const activity = await query

    return NextResponse.json({ activity, hasMore: activity.length === limit })
  } catch (error) {
    console.error("[v0] Error fetching activity:", error)
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 })
  }
}
