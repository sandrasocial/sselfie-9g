import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
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
    const highlights = Array.isArray(body?.highlights) ? body.highlights : null
    if (!highlights) {
      return NextResponse.json({ error: "Highlights must be a list" }, { status: 400 })
    }
    const normalized = highlights.map((highlight: any) => ({
      title: typeof highlight?.title === "string" ? highlight.title.trim().slice(0, 80) : "",
      coverUrl:
        typeof highlight?.coverUrl === "string"
          ? highlight.coverUrl.slice(0, 2000)
          : typeof highlight?.image_url === "string"
            ? highlight.image_url.slice(0, 2000)
            : "#F1F2F2",
      type: typeof highlight?.type === "string" ? highlight.type.slice(0, 40) : "image",
      description:
        typeof highlight?.description === "string" ? highlight.description.slice(0, 50_000) : "",
    }))
    if (normalized.some((highlight: any) => !highlight.title)) {
      return NextResponse.json({ error: "Every sequence needs a title" }, { status: 400 })
    }

    const [ownedFeed] = await sql`
      SELECT id FROM feed_layouts
      WHERE id = ${feedIdInt} AND user_id = ${neonUser.id}
      LIMIT 1
    `
    if (!ownedFeed) return NextResponse.json({ error: "Feed not found" }, { status: 404 })

    // Delete + replace is one transaction so a failed insert can never erase saved Stories.
    await sql.transaction(tx => [
      tx`
        DELETE FROM instagram_highlights
        WHERE feed_layout_id = ${feedIdInt} AND user_id = ${neonUser.id}
      `,
      ...normalized.map(
        (highlight: any) => tx`
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
            ${highlight.coverUrl},
            ${highlight.type},
            ${highlight.description},
            ${highlight.coverUrl.startsWith("http") ? "completed" : "pending"}
          )
        `
      ),
    ])

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
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
