import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { sql } from "@/lib/db/client"


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
        FROM scene_prompts_v2
        WHERE feed_style_id = ${Number(feedStyleId)}
        ORDER BY position ASC, is_primary DESC, id ASC
      `
    : await sql`
        SELECT *
        FROM scene_prompts_v2
        ORDER BY feed_style_id ASC, position ASC, is_primary DESC, id ASC
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
  const {
    feed_style_id,
    position,
    prompt_text,
    is_primary = false,
    variation_name,
    variation_id,
    approved = false,
  } = body || {}

  if (!feed_style_id || !position || !prompt_text) {
    return NextResponse.json(
      { error: "feed_style_id, position, and prompt_text are required." },
      { status: 400 },
    )
  }

  const [row] = await sql`
    INSERT INTO scene_prompts_v2 (
      feed_style_id,
      position,
      prompt_text,
      is_primary,
      variation_name,
      variation_id,
      approved,
      updated_at
    )
    VALUES (
      ${Number(feed_style_id)},
      ${Number(position)},
      ${prompt_text},
      ${Boolean(is_primary)},
      ${variation_name || null},
      ${variation_id ? Number(variation_id) : null},
      ${Boolean(approved)},
      NOW()
    )
    RETURNING *
  `

  return NextResponse.json({ row })
}
