import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
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

    const resolvedParams = await Promise.resolve(params)
    const feedId = resolvedParams.feedId

    if (!feedId || feedId === "null" || feedId === "undefined") {
      return NextResponse.json({ error: "Invalid feed ID" }, { status: 400 })
    }

    const feedIdInt = Number.parseInt(feedId, 10)

    const body = await req.json()
    const { bioText } = body

    if (!bioText || typeof bioText !== "string") {
      return NextResponse.json({ error: "Bio text is required" }, { status: 400 })
    }

    // Verify feed ownership
    const [feedLayout] = await sql`
      SELECT id, user_id
      FROM feed_layouts
      WHERE id = ${feedIdInt}
      AND user_id = ${neonUser.id}
      LIMIT 1
    `

    if (!feedLayout) {
      return NextResponse.json({ error: "Feed not found or unauthorized" }, { status: 404 })
    }

    // Check if bio exists
    let existingBio: any = null
    try {
      const result = await sql`
        SELECT id FROM instagram_bios
        WHERE feed_layout_id = ${feedIdInt}
        LIMIT 1
      `
      existingBio = result[0] || null
    } catch (error: any) {
      // If feed_layout_id doesn't exist, try querying by user_id only
      try {
        const result = await sql`
          SELECT id FROM instagram_bios
          WHERE user_id = ${neonUser.id}
          ORDER BY created_at DESC
          LIMIT 1
        `
        existingBio = result[0] || null
      } catch (err) {
        // No existing bio
      }
    }

    if (existingBio) {
      // Update existing bio
      await sql`
        UPDATE instagram_bios
        SET bio_text = ${bioText}
        WHERE id = ${existingBio.id}
      `
    } else {
      // Create new bio
      try {
        await sql`
          INSERT INTO instagram_bios (feed_layout_id, user_id, bio_text, created_at)
          VALUES (${feedIdInt}, ${neonUser.id}, ${bioText}, NOW())
        `
      } catch (error: any) {
        // If feed_layout_id doesn't exist, insert without it
        if (error.message?.includes("feed_layout_id") || error.code === "42703") {
          await sql`
            INSERT INTO instagram_bios (user_id, bio_text, created_at)
            VALUES (${neonUser.id}, ${bioText}, NOW())
          `
        } else {
          throw error
        }
      }
    }

    return NextResponse.json({
      success: true,
      bio: bioText,
    })
  } catch (error) {
    console.error("[v0] Update bio error:", error)
    return NextResponse.json({ error: "Failed to update bio" }, { status: 500 })
  }
}

