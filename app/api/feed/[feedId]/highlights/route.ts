import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: Promise<{ feedId: string }> | { feedId: string } }) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const resolvedParams = await Promise.resolve(params)
    const { feedId } = resolvedParams
    const feedIdInt = parseInt(String(feedId), 10)

    if (isNaN(feedIdInt)) {
      return NextResponse.json({ error: "Invalid feed ID format" }, { status: 400 })
    }

    const body = await request.json()
    const { highlights } = body

    // Delete existing highlights for this feed
    await sql`
      DELETE FROM instagram_highlights 
      WHERE feed_layout_id = ${feedIdInt} AND user_id = ${neonUser.id}
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
            ${feedIdInt},
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Failed to save highlights", details: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ feedId: string }> | { feedId: string } }) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const resolvedParams = await Promise.resolve(params)
    const { feedId } = resolvedParams
    const feedIdInt = parseInt(String(feedId), 10)

    if (isNaN(feedIdInt)) {
      return NextResponse.json({ error: "Invalid feed ID format" }, { status: 400 })
    }

    const highlights = await sql`
      SELECT * FROM instagram_highlights 
      WHERE feed_layout_id = ${feedIdInt} AND user_id = ${neonUser.id}
      ORDER BY created_at ASC
    `

    return NextResponse.json({ highlights })
  } catch (error) {
    console.error("[v0] Error loading highlights:", error)
    return NextResponse.json({ error: "Failed to load highlights" }, { status: 500 })
  }
}
