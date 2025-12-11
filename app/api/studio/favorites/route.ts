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
    const limit = Number.parseInt(searchParams.get("limit") || "5")

    // Get user's favorite images for hero carousel
    const favorites = await sql`
      SELECT 
        id,
        COALESCE(selected_url, (string_to_array(image_urls, ','))[1]) as image_url,
        prompt,
        description,
        category,
        created_at
      FROM generated_images
      WHERE user_id = ${neonUser.id}
        AND saved = true
        AND (selected_url IS NOT NULL OR image_urls IS NOT NULL)
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return NextResponse.json({ favorites })
  } catch (error) {
    console.error("[v0] Error fetching favorites:", error)
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 })
  }
}
