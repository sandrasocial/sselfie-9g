import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { feedId: string } }) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { feedId } = params
    const body = await request.json()
    const { highlights } = body

    // Delete existing highlights for this feed
    await sql`
      DELETE FROM instagram_highlights 
      WHERE feed_layout_id = ${feedId} AND user_id = ${neonUser.id}
    `

    // Insert new highlights
    if (highlights && highlights.length > 0) {
      for (const highlight of highlights) {
        await sql`
          INSERT INTO instagram_highlights (
            feed_layout_id, 
            user_id, 
            title, 
            image_url, 
            icon_style,
            prompt,
            generation_status
          )
          VALUES (
            ${feedId},
            ${neonUser.id},
            ${highlight.title},
            ${highlight.coverUrl || highlight.image_url},
            ${highlight.type || "color"},
            ${highlight.description || ""},
            ${highlight.coverUrl && !highlight.coverUrl.startsWith("#") && !highlight.coverUrl.includes("placeholder") ? "completed" : "pending"}
          )
        `
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving highlights:", error)
    return NextResponse.json({ error: "Failed to save highlights" }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: { feedId: string } }) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { feedId } = params

    const highlights = await sql`
      SELECT * FROM instagram_highlights 
      WHERE feed_layout_id = ${feedId} AND user_id = ${neonUser.id}
      ORDER BY created_at ASC
    `

    return NextResponse.json({ highlights })
  } catch (error) {
    console.error("[v0] Error loading highlights:", error)
    return NextResponse.json({ error: "Failed to load highlights" }, { status: 500 })
  }
}
