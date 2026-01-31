import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
    )
  }

  const { searchParams } = new URL(request.url)
  const feedStyleId = searchParams.get("feedStyleId")

  const rows = feedStyleId
    ? await sql`
        SELECT *
        FROM feed_style_previews_v2
        WHERE feed_style_id = ${Number(feedStyleId)}
        ORDER BY is_primary DESC, id ASC
      `
    : await sql`
        SELECT *
        FROM feed_style_previews_v2
        ORDER BY feed_style_id ASC, is_primary DESC, id ASC
      `

  return NextResponse.json({ rows })
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const { feed_style_id, name, prompt_text, approved = false, is_primary = false, variation_id } = body || {}

  if (!feed_style_id || !name || !prompt_text) {
    return NextResponse.json(
      { error: "feed_style_id, name, and prompt_text are required." },
      { status: 400 },
    )
  }

  if (is_primary) {
    await sql`
      UPDATE feed_style_previews_v2
      SET is_primary = false
      WHERE feed_style_id = ${Number(feed_style_id)}
        AND (${variation_id ? Number(variation_id) : null}::int IS NULL OR variation_id = ${variation_id ? Number(variation_id) : null})
    `
  }

  const [row] = await sql`
    INSERT INTO feed_style_previews_v2 (
      feed_style_id,
      name,
      prompt_text,
      approved,
      is_primary,
      variation_id,
      updated_at
    )
    VALUES (
      ${Number(feed_style_id)},
      ${name},
      ${prompt_text},
      ${Boolean(approved)},
      ${Boolean(is_primary)},
      ${variation_id ? Number(variation_id) : null},
      NOW()
    )
    RETURNING *
  `

  return NextResponse.json({ row })
}
